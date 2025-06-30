/*
  # Fix Push Notifications

  1. Ensure Profiles Table
    - Add notification_preferences column if missing
    - Add expo_push_token column if missing
    - Add proper indexes for push token queries

  2. Fix Null User ID Issues
    - Add constraint to prevent null user_id in notes table
    - Add constraint to prevent null user_id in reminders table
*/

-- Ensure profiles table has the required columns
DO $$ 
BEGIN
  -- Add notification_preferences column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'notification_preferences'
  ) THEN
    ALTER TABLE profiles ADD COLUMN notification_preferences jsonb DEFAULT '{"daily_summary": true, "reminders": true, "mentions": true}'::jsonb;
  END IF;

  -- Add expo_push_token column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'expo_push_token'
  ) THEN
    ALTER TABLE profiles ADD COLUMN expo_push_token text;
  END IF;
END $$;

-- Create index on expo_push_token if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'profiles' AND indexname = 'profiles_expo_push_token_idx'
  ) THEN
    CREATE INDEX profiles_expo_push_token_idx ON profiles(expo_push_token);
  END IF;
END $$;

-- Add NOT NULL constraint to user_id in notes table if not already present
-- First, check if there are any notes with null user_id
DO $$ 
DECLARE
  null_user_count integer;
BEGIN
  SELECT COUNT(*) INTO null_user_count FROM notes WHERE user_id IS NULL;
  
  IF null_user_count > 0 THEN
    RAISE NOTICE 'Found % notes with null user_id. These will be deleted.', null_user_count;
    -- Delete notes with null user_id
    DELETE FROM notes WHERE user_id IS NULL;
  END IF;
  
  -- Now add the NOT NULL constraint if it doesn't exist
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notes' AND column_name = 'user_id' AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE notes ALTER COLUMN user_id SET NOT NULL;
    RAISE NOTICE 'Added NOT NULL constraint to notes.user_id';
  END IF;
END $$;

-- Add NOT NULL constraint to user_id in reminders table if not already present
-- First, check if there are any reminders with null user_id
DO $$ 
DECLARE
  null_user_count integer;
BEGIN
  SELECT COUNT(*) INTO null_user_count FROM reminders WHERE user_id IS NULL;
  
  IF null_user_count > 0 THEN
    RAISE NOTICE 'Found % reminders with null user_id. These will be deleted.', null_user_count;
    -- Delete reminders with null user_id
    DELETE FROM reminders WHERE user_id IS NULL;
  END IF;
  
  -- Now add the NOT NULL constraint if it doesn't exist
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'reminders' AND column_name = 'user_id' AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE reminders ALTER COLUMN user_id SET NOT NULL;
    RAISE NOTICE 'Added NOT NULL constraint to reminders.user_id';
  END IF;
END $$;

-- Create a function to validate user_id before insert/update
CREATE OR REPLACE FUNCTION validate_user_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    RAISE EXCEPTION 'user_id cannot be null';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers to enforce user_id validation
DO $$ 
BEGIN
  -- For notes table
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'validate_notes_user_id'
  ) THEN
    CREATE TRIGGER validate_notes_user_id
    BEFORE INSERT OR UPDATE ON notes
    FOR EACH ROW
    EXECUTE FUNCTION validate_user_id();
  END IF;

  -- For reminders table
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'validate_reminders_user_id'
  ) THEN
    CREATE TRIGGER validate_reminders_user_id
    BEFORE INSERT OR UPDATE ON reminders
    FOR EACH ROW
    EXECUTE FUNCTION validate_user_id();
  END IF;
END $$;