import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationPayload {
  to: string
  sound: string
  title: string
  body: string
  data: {
    id: string
    type: string
    priority: string
    metadata: {
      noteId: string
      createdAt: string
      source: string
    }
  }
  badge?: number
  categoryId?: string
}

interface UserNote {
  id: string
  title: string
  summary: string
  type: string
  created_at: string
  user_id: string
}

interface UserProfile {
  id: string
  expo_push_token: string | null
  notification_preferences: {
    daily_summary?: boolean
    reminders?: boolean
    mentions?: boolean
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🚀 Starting daily notifications function...')

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Log cron job start
    try {
      await supabase.rpc('log_cron_job_execution', {
        p_job_name: 'daily_notifications',
        p_status: 'started',
        p_message: 'Daily notifications cron job started'
      })
    } catch (logError) {
      console.warn('⚠️ Failed to log job start:', logError)
      // Continue execution even if logging fails
    }

    // Calculate 24 hours ago
    const twentyFourHoursAgo = new Date()
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24)
    const isoString = twentyFourHoursAgo.toISOString()

    console.log(`📅 Fetching notes created after: ${isoString}`)

    // Query notes created in the last 24 hours
    const { data: recentNotes, error: notesError } = await supabase
      .from('notes')
      .select(`
        id,
        title,
        summary,
        type,
        created_at,
        user_id
      `)
      .gte('created_at', isoString)
      .order('created_at', { ascending: false })

    if (notesError) {
      console.error('❌ Error fetching notes:', notesError)
      try {
        await supabase.rpc('log_cron_job_execution', {
          p_job_name: 'daily_notifications',
          p_status: 'error',
          p_message: 'Failed to fetch notes',
          p_error_details: notesError.message
        })
      } catch (logError) {
        console.warn('⚠️ Failed to log error:', logError)
      }
      throw notesError
    }

    console.log(`📝 Found ${recentNotes?.length || 0} recent notes`)

    if (!recentNotes || recentNotes.length === 0) {
      console.log('✅ No recent notes found, skipping notifications')
      try {
        await supabase.rpc('log_cron_job_execution', {
          p_job_name: 'daily_notifications',
          p_status: 'completed',
          p_message: 'No recent notes found, no notifications sent'
        })
      } catch (logError) {
        console.warn('⚠️ Failed to log completion:', logError)
      }
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No recent notes found',
          notificationsSent: 0 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    // Group notes by user, filtering out null user_ids
    const notesByUser = recentNotes.reduce((acc: Record<string, UserNote[]>, note) => {
      // Skip notes with null user_id
      if (!note.user_id) {
        console.log('⚠️ Skipping note with null user_id:', note.id)
        return acc
      }
      
      if (!acc[note.user_id]) {
        acc[note.user_id] = []
      }
      acc[note.user_id].push(note)
      return acc
    }, {})

    console.log(`👥 Notes grouped for ${Object.keys(notesByUser).length} users`)

    // Get user profiles with push tokens and notification preferences
    const userIds = Object.keys(notesByUser)
    const { data: userProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, expo_push_token, notification_preferences')
      .in('id', userIds)
      .not('expo_push_token', 'is', null)

    if (profilesError) {
      console.error('❌ Error fetching user profiles:', profilesError)
      try {
        await supabase.rpc('log_cron_job_execution', {
          p_job_name: 'daily_notifications',
          p_status: 'error',
          p_message: 'Failed to fetch user profiles',
          p_error_details: profilesError.message
        })
      } catch (logError) {
        console.warn('⚠️ Failed to log error:', logError)
      }
      throw profilesError
    }

    console.log(`📱 Found ${userProfiles?.length || 0} users with push tokens`)

    // Filter users who have daily_summary enabled
    const eligibleUsers = userProfiles?.filter(profile => {
      const prefs = profile.notification_preferences || {}
      return prefs.daily_summary !== false // Default to true if not set
    }) || []

    console.log(`✅ ${eligibleUsers.length} users eligible for daily notifications`)

    // Prepare notifications
    const notifications: NotificationPayload[] = []
    let notificationsSent = 0

    for (const userProfile of eligibleUsers) {
      const userNotes = notesByUser[userProfile.id]
      
      if (!userNotes || userNotes.length === 0) {
        continue
      }

      // Skip if no valid push token
      if (!userProfile.expo_push_token || !userProfile.expo_push_token.startsWith('ExponentPushToken[')) {
        console.log(`⚠️ Invalid push token for user ${userProfile.id}: ${userProfile.expo_push_token}`)
        continue
      }

      // Create notification content
      const noteCount = userNotes.length
      const latestNote = userNotes[0] // Most recent note
      
      let title: string
      let body: string
      
      if (noteCount === 1) {
        title = '📝 New Note Created'
        body = `"${latestNote.title}" - ${latestNote.summary ? latestNote.summary.substring(0, 100) : 'Tap to view details'}`
      } else {
        title = `📝 ${noteCount} New Notes Created`
        body = `Latest: "${latestNote.title}" and ${noteCount - 1} more. Tap to view all your recent notes.`
      }

      // Create notification payload matching Expo Push API format
      const notification: NotificationPayload = {
        to: userProfile.expo_push_token,
        sound: 'default',
        title: title.substring(0, 100), // Limit title length
        body: body.substring(0, 500), // Limit body length
        data: {
          id: `daily-summary-${Date.now()}-${userProfile.id}`,
          type: 'daily_summary',
          priority: 'medium',
          metadata: {
            noteId: latestNote.id,
            createdAt: new Date().toISOString(),
            source: 'daily_notifications',
          },
        },
        badge: noteCount,
        categoryId: 'daily_summary',
      }

      notifications.push(notification)
    }

    console.log(`📤 Prepared ${notifications.length} notifications`)

    // Send notifications via Expo Push API
    if (notifications.length > 0) {
      const expoPushUrl = 'https://exp.host/--/api/v2/push/send'
      
      try {
        console.log('📡 Sending notifications to Expo Push API...')
        
        const response = await fetch(expoPushUrl, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(notifications),
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error('❌ Expo Push API error:', errorText)
          throw new Error(`Expo Push API error: ${response.status} ${errorText}`)
        }

        const result = await response.json()
        console.log('✅ Expo Push API response:', result)
        
        // Count successful notifications
        if (Array.isArray(result.data)) {
          notificationsSent = result.data.filter((item: any) => item.status === 'ok').length
          const errors = result.data.filter((item: any) => item.status === 'error')
          
          if (errors.length > 0) {
            console.warn('⚠️ Some notifications failed:', errors)
          }
        } else {
          notificationsSent = notifications.length // Assume all sent if no detailed response
        }

        console.log(`🎉 Successfully sent ${notificationsSent} notifications`)

        // Log successful completion
        try {
          await supabase.rpc('log_cron_job_execution', {
            p_job_name: 'daily_notifications',
            p_status: 'completed',
            p_message: `Successfully sent ${notificationsSent} notifications to ${notifications.length} users`
          })
        } catch (logError) {
          console.warn('⚠️ Failed to log completion:', logError)
        }

      } catch (error) {
        console.error('❌ Error sending notifications:', error)
        try {
          await supabase.rpc('log_cron_job_execution', {
            p_job_name: 'daily_notifications',
            p_status: 'error',
            p_message: 'Failed to send notifications',
            p_error_details: error instanceof Error ? error.message : 'Unknown error'
          })
        } catch (logError) {
          console.warn('⚠️ Failed to log error:', logError)
        }
        throw error
      }
    } else {
      console.log('ℹ️ No notifications to send')
      try {
        await supabase.rpc('log_cron_job_execution', {
          p_job_name: 'daily_notifications',
          p_status: 'completed',
          p_message: 'No eligible users for notifications'
        })
      } catch (logError) {
        console.warn('⚠️ Failed to log completion:', logError)
      }
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: `Daily notifications completed`,
        notesFound: recentNotes.length,
        usersWithTokens: userProfiles?.length || 0,
        eligibleUsers: eligibleUsers.length,
        notificationsPrepared: notifications.length,
        notificationsSent: notificationsSent,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('❌ Daily notifications function error:', error)
    
    // Try to log the error if Supabase is available
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      
      if (supabaseUrl && supabaseServiceKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey)
        await supabase.rpc('log_cron_job_execution', {
          p_job_name: 'daily_notifications',
          p_status: 'error',
          p_message: 'Function execution failed',
          p_error_details: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    } catch (logError) {
      console.error('❌ Failed to log error:', logError)
    }
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})