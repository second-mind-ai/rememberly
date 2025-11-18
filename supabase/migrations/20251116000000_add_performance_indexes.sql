-- Migration: Add performance indexes for frequently queried columns
-- Date: 2025-11-16
-- Description: Improves query performance by adding indexes on hot columns

-- Notes table indexes
-- Index on user_id (already exists via RLS, but explicit index improves performance)
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);

-- Index on created_at for sorting and time-based queries
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(user_id, created_at DESC);

-- Index on tags for category/tag-based filtering
CREATE INDEX IF NOT EXISTS idx_notes_tags ON notes USING GIN(tags);

-- Index on type for filtering by content type
CREATE INDEX IF NOT EXISTS idx_notes_type ON notes(user_id, type);

-- Reminders table indexes
-- Index on user_id
CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON reminders(user_id);

-- Index on remind_at for sorting and time-based queries
CREATE INDEX IF NOT EXISTS idx_reminders_remind_at ON reminders(user_id, remind_at);

-- Partial index on incomplete reminders (most common query)
CREATE INDEX IF NOT EXISTS idx_reminders_incomplete ON reminders(user_id, remind_at)
  WHERE is_completed = false;

-- Index on notification_id for quick lookups when canceling notifications
CREATE INDEX IF NOT EXISTS idx_reminders_notification_id ON reminders(notification_id)
  WHERE notification_id IS NOT NULL;

-- Profiles table indexes
-- Index on expo_push_token for notification sending
CREATE INDEX IF NOT EXISTS idx_profiles_expo_push_token ON profiles(expo_push_token)
  WHERE expo_push_token IS NOT NULL;

-- Composite index for notification preferences
CREATE INDEX IF NOT EXISTS idx_profiles_notifications ON profiles(id, expo_push_token)
  WHERE expo_push_token IS NOT NULL;

-- Log message for successful migration
DO $$
BEGIN
  RAISE NOTICE 'Performance indexes created successfully';
END $$;
