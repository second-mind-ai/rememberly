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
      throw notesError
    }

    console.log(`📝 Found ${recentNotes?.length || 0} recent notes`)

    if (!recentNotes || recentNotes.length === 0) {
      console.log('✅ No recent notes found, skipping notifications')
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

    // Group notes by user
    const notesByUser = recentNotes.reduce((acc: Record<string, UserNote[]>, note) => {
      if (!acc[note.user_id]) {
        acc[note.user_id] = []
      }
      acc[note.user_id].push(note)
      return acc
    }, {})

    console.log(`👥 Notes grouped for ${Object.keys(notesByUser).length} users`)

    // Get user profiles with push tokens
    const userIds = Object.keys(notesByUser)
    const { data: userProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, expo_push_token')
      .in('id', userIds)
      .not('expo_push_token', 'is', null)

    if (profilesError) {
      console.error('❌ Error fetching user profiles:', profilesError)
      // Continue without profiles - we'll try to get tokens from auth metadata
    }

    console.log(`📱 Found ${userProfiles?.length || 0} users with push tokens`)

    // Prepare notifications
    const notifications: NotificationPayload[] = []
    let notificationsSent = 0

    for (const userId of userIds) {
      const userNotes = notesByUser[userId]
      const userProfile = userProfiles?.find(p => p.id === userId)
      
      // Skip if no push token available
      if (!userProfile?.expo_push_token) {
        console.log(`⚠️ No push token for user ${userId}, skipping`)
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

      // Create notification payload matching existing format
      const notification: NotificationPayload = {
        to: userProfile.expo_push_token,
        sound: 'default',
        title: title.substring(0, 100), // Limit title length
        body: body.substring(0, 500), // Limit body length
        data: {
          id: `daily-summary-${Date.now()}`,
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
        } else {
          notificationsSent = notifications.length // Assume all sent if no detailed response
        }

        console.log(`🎉 Successfully sent ${notificationsSent} notifications`)

      } catch (error) {
        console.error('❌ Error sending notifications:', error)
        throw error
      }
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: `Daily notifications completed`,
        notesFound: recentNotes.length,
        usersNotified: notifications.length,
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