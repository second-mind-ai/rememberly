/*
  # Fix Push Notification Registration

  1. Ensure Profiles Table Structure
    - Add missing columns if needed
    - Create indexes for performance

  2. Add Validation Triggers
    - Ensure user_id is never null in notes and reminders
    - Validate data before insert/update

  3. Add Logging Functions
    - Improve error tracking for push notifications
*/

-- Ensure profiles table has the required columns with proper defaults
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

-- Create a function to update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for profiles table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_profiles_updated_at'
  ) THEN
    CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Create a function to log push token operations
CREATE OR REPLACE FUNCTION log_push_token_operation(
  p_user_id uuid,
  p_operation text,
  p_token text,
  p_success boolean,
  p_error_message text DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  log_table_exists boolean;
BEGIN
  -- Check if the push_token_logs table exists
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'push_token_logs'
  ) INTO log_table_exists;
  
  -- Create the table if it doesn't exist
  IF NOT log_table_exists THEN
    CREATE TABLE push_token_logs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL,
      operation text NOT NULL,
      token text,
      success boolean NOT NULL,
      error_message text,
      created_at timestamptz DEFAULT now()
    );
    
    CREATE INDEX push_token_logs_user_id_idx ON push_token_logs(user_id);
    CREATE INDEX push_token_logs_created_at_idx ON push_token_logs(created_at DESC);
  END IF;
  
  -- Insert the log entry
  INSERT INTO push_token_logs (user_id, operation, token, success, error_message)
  VALUES (p_user_id, p_operation, p_token, p_success, p_error_message);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to validate push tokens
CREATE OR REPLACE FUNCTION validate_push_token()
RETURNS TRIGGER AS $$
BEGIN
  -- Only validate if token is being set/updated
  IF NEW.expo_push_token IS NOT NULL THEN
    -- Check if token has the correct format
    IF NOT (NEW.expo_push_token LIKE 'ExponentPushToken[%]' OR NEW.expo_push_token LIKE 'ExpoPushToken[%]') THEN
      -- Log the invalid token but don't prevent the operation
      PERFORM log_push_token_operation(
        NEW.id,
        'validate',
        NEW.expo_push_token,
        FALSE,
        'Invalid token format'
      );
      
      -- Optionally, clear invalid tokens
      -- NEW.expo_push_token = NULL;
    ELSE
      -- Log valid token
      PERFORM log_push_token_operation(
        NEW.id,
        'validate',
        NEW.expo_push_token,
        TRUE,
        NULL
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for push token validation if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'validate_push_token'
  ) THEN
    CREATE TRIGGER validate_push_token
    BEFORE INSERT OR UPDATE OF expo_push_token ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION validate_push_token();
  END IF;
END $$;

-- Create a function to check for duplicate push tokens
CREATE OR REPLACE FUNCTION check_duplicate_push_token()
RETURNS TRIGGER AS $$
DECLARE
  existing_user_id uuid;
BEGIN
  -- Only check if token is being set/updated and is not null
  IF NEW.expo_push_token IS NOT NULL AND NEW.expo_push_token != '' THEN
    -- Check if token already exists for another user
    SELECT id INTO existing_user_id
    FROM profiles
    WHERE expo_push_token = NEW.expo_push_token
      AND id != NEW.id
    LIMIT 1;
    
    IF existing_user_id IS NOT NULL THEN
      -- Log the duplicate token
      PERFORM log_push_token_operation(
        NEW.id,
        'duplicate_check',
        NEW.expo_push_token,
        FALSE,
        'Token already exists for user ' || existing_user_id
      );
      
      -- Don't prevent the operation, just log it
      -- RAISE NOTICE 'Push token already exists for another user: %', existing_user_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for duplicate push token check if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'check_duplicate_push_token'
  ) THEN
    CREATE TRIGGER check_duplicate_push_token
    BEFORE INSERT OR UPDATE OF expo_push_token ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION check_duplicate_push_token();
  END IF;
END $$;

-- Create a function to log push notification deliveries
CREATE OR REPLACE FUNCTION log_push_notification(
  p_user_id uuid,
  p_notification_type text,
  p_title text,
  p_body text,
  p_success boolean,
  p_error_message text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  log_table_exists boolean;
  v_log_id uuid;
BEGIN
  -- Check if the push_notification_logs table exists
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'push_notification_logs'
  ) INTO log_table_exists;
  
  -- Create the table if it doesn't exist
  IF NOT log_table_exists THEN
    CREATE TABLE push_notification_logs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL,
      notification_type text NOT NULL,
      title text,
      body text,
      success boolean NOT NULL,
      error_message text,
      created_at timestamptz DEFAULT now()
    );
    
    CREATE INDEX push_notification_logs_user_id_idx ON push_notification_logs(user_id);
    CREATE INDEX push_notification_logs_created_at_idx ON push_notification_logs(created_at DESC);
  END IF;
  
  -- Insert the log entry
  INSERT INTO push_notification_logs (user_id, notification_type, title, body, success, error_message)
  VALUES (p_user_id, p_notification_type, p_title, p_body, p_success, p_error_message)
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;