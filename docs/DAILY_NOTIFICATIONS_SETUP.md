# Daily Note Notifications Setup Guide

This guide explains how to set up and configure the daily note notifications system using Supabase Edge Functions.

## 🚀 Overview

The daily notifications system automatically sends push notifications to users about notes created in the last 24 hours. It consists of:

1. **Edge Function**: `daily-notifications` - Processes and sends notifications
2. **Database Schema**: User profiles with push tokens and preferences
3. **Cron Job**: Scheduled daily execution
4. **Client Integration**: Push token management

## 📋 Setup Steps

### Step 1: Deploy the Edge Function

Deploy the Edge Function to your Supabase project:

```bash
# Navigate to your project root
cd your-project

# Deploy the function
supabase functions deploy daily-notifications
```

### Step 2: Run Database Migrations

Apply the required database migrations:

```bash
# Run the migrations
supabase db push

# Or apply manually in Supabase SQL Editor:
# - 20250116000000_add_profiles_table.sql
# - 20250116000001_setup_daily_notifications_cron.sql
```

### Step 3: Set Up Cron Job

#### Option A: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **Database** → **Extensions**
3. Enable the `pg_cron` extension
4. Go to **SQL Editor** and run:

```sql
-- Schedule daily notifications at 9:00 AM UTC
SELECT cron.schedule(
  'daily-notifications',
  '0 9 * * *',
  'SELECT net.http_post(
    url := ''https://your-project-ref.supabase.co/functions/v1/daily-notifications'',
    headers := ''{"Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '", "Content-Type": "application/json"}'',
    body := ''{}''
  );'
);
```

#### Option B: Using Supabase CLI

```bash
# Set up the cron job via CLI
supabase functions invoke daily-notifications --method POST
```

### Step 4: Configure Environment Variables

Ensure your Edge Function has access to required environment variables:

1. Go to **Settings** → **Edge Functions** in your Supabase dashboard
2. Add the following secrets:

```
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Step 5: Update Client Code

The client code has been updated to automatically manage push tokens. Ensure users grant notification permissions when prompted.

## 🔧 Configuration

### Notification Timing

By default, notifications are sent at **9:00 AM UTC**. To change this:

1. Update the cron schedule in your SQL:
```sql
-- Example: Send at 8:00 AM UTC instead
SELECT cron.unschedule('daily-notifications');
SELECT cron.schedule(
  'daily-notifications',
  '0 8 * * *',
  'SELECT net.http_post(...);'
);
```

### Notification Content

Customize notification content by modifying the Edge Function:

```typescript
// In supabase/functions/daily-notifications/index.ts
let title: string
let body: string

if (noteCount === 1) {
  title = '📝 New Note Created'
  body = `"${latestNote.title}" - ${latestNote.summary ? latestNote.summary.substring(0, 100) : 'Tap to view details'}`
} else {
  title = `📝 ${noteCount} New Notes Created`
  body = `Latest: "${latestNote.title}" and ${noteCount - 1} more. Tap to view all your recent notes.`
}
```

### User Preferences

Users can control notification preferences through their profile:

```typescript
// Update notification preferences
await pushTokenManager.updateNotificationPreferences({
  daily_summary: true,  // Enable/disable daily notifications
  reminders: true,      // Enable/disable reminder notifications
  mentions: true        // Enable/disable mention notifications
});
```

## 🧪 Testing

### Test the Edge Function Manually

```bash
# Test the function directly
curl -X POST 'https://your-project-ref.supabase.co/functions/v1/daily-notifications' \
  -H 'Authorization: Bearer your-service-role-key' \
  -H 'Content-Type: application/json' \
  -d '{}'
```

### Test Push Token Registration

In your app, check that push tokens are being saved:

```typescript
// Check if push token is registered
const preferences = await pushTokenManager.getNotificationPreferences();
console.log('Notification preferences:', preferences);
```

### Verify Cron Job

Check if the cron job is scheduled:

```sql
-- View scheduled cron jobs
SELECT * FROM cron.job;

-- View cron job execution logs
SELECT * FROM cron_job_logs ORDER BY created_at DESC LIMIT 10;
```

## 📊 Monitoring

### Edge Function Logs

Monitor Edge Function execution:

1. Go to **Edge Functions** → **daily-notifications** in Supabase dashboard
2. Check the **Logs** tab for execution details

### Database Logs

Monitor cron job execution:

```sql
-- Check recent cron job logs
SELECT 
  job_name,
  status,
  message,
  created_at
FROM cron_job_logs 
WHERE job_name = 'daily_notifications'
ORDER BY created_at DESC 
LIMIT 20;
```

### Push Token Health

Monitor push token registration:

```sql
-- Check users with push tokens
SELECT 
  COUNT(*) as total_users,
  COUNT(expo_push_token) as users_with_tokens,
  ROUND(COUNT(expo_push_token) * 100.0 / COUNT(*), 2) as token_percentage
FROM profiles;
```

## 🚨 Troubleshooting

### Common Issues

#### 1. No notifications being sent

**Check:**
- Cron job is scheduled and running
- Edge Function has proper environment variables
- Users have valid push tokens
- Notes exist in the last 24 hours

#### 2. Edge Function errors

**Check:**
- Function logs in Supabase dashboard
- Database connection and permissions
- Expo Push API response

#### 3. Users not receiving notifications

**Check:**
- User has granted notification permissions
- Push token is valid and saved in database
- User's notification preferences allow daily summaries

### Debug Commands

```sql
-- Check if cron extension is enabled
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- View all scheduled jobs
SELECT * FROM cron.job;

-- Check recent notes
SELECT COUNT(*) FROM notes WHERE created_at >= NOW() - INTERVAL '24 hours';

-- Check users with tokens
SELECT COUNT(*) FROM profiles WHERE expo_push_token IS NOT NULL;
```

## 🔒 Security Considerations

1. **Service Role Key**: Keep your service role key secure and only use it in server environments
2. **RLS Policies**: Ensure Row Level Security is properly configured
3. **Token Validation**: The system validates push tokens before sending
4. **Rate Limiting**: Consider implementing rate limiting for the Edge Function

## 📈 Performance Optimization

1. **Batch Processing**: The function processes notifications in batches
2. **Indexing**: Ensure proper database indexes are in place
3. **Caching**: Consider caching user preferences for better performance

## 🔄 Maintenance

### Regular Tasks

1. **Monitor Logs**: Check Edge Function and cron job logs weekly
2. **Clean Up**: Remove old cron job logs periodically
3. **Token Refresh**: Invalid push tokens are automatically handled
4. **Performance Review**: Monitor notification delivery rates

### Updates

When updating the Edge Function:

```bash
# Deploy updated function
supabase functions deploy daily-notifications

# Test the updated function
curl -X POST 'https://your-project-ref.supabase.co/functions/v1/daily-notifications' \
  -H 'Authorization: Bearer your-service-role-key'
```

## 📞 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review Supabase Edge Functions documentation
3. Check Expo Push Notifications documentation
4. Monitor the function logs for specific error messages