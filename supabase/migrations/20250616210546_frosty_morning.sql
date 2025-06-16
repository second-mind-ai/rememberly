/*
  # Update reminders table schema

  1. Changes
    - Add `title` column for reminder title
    - Add `description` column for optional reminder description  
    - Add `priority` column for priority level (low, medium, high)
    - Add `notification_id` column to track scheduled notifications
    - Remove `note_id` foreign key constraint (make reminders independent)
    - Remove `natural_input` column (replaced with structured data)

  2. Data Migration
    - Preserve existing reminders where possible
    - Set default values for new columns
*/

-- Add new columns to reminders table
DO $$
BEGIN
  -- Add title column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reminders' AND column_name = 'title'
  ) THEN
    ALTER TABLE reminders ADD COLUMN title text NOT NULL DEFAULT '';
  END IF;

  -- Add description column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reminders' AND column_name = 'description'
  ) THEN
    ALTER TABLE reminders ADD COLUMN description text DEFAULT '';
  END IF;

  -- Add priority column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reminders' AND column_name = 'priority'
  ) THEN
    ALTER TABLE reminders ADD COLUMN priority text CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium';
  END IF;

  -- Add notification_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reminders' AND column_name = 'notification_id'
  ) THEN
    ALTER TABLE reminders ADD COLUMN notification_id text;
  END IF;
END $$;

-- Migrate existing data
UPDATE reminders 
SET title = COALESCE(natural_input, 'Reminder')
WHERE title = '' OR title IS NULL;

-- Make note_id nullable (for independent reminders)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reminders' AND column_name = 'note_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE reminders ALTER COLUMN note_id DROP NOT NULL;
  END IF;
END $$;

-- Update indexes for better performance
CREATE INDEX IF NOT EXISTS reminders_priority_idx ON reminders(priority);
CREATE INDEX IF NOT EXISTS reminders_notification_id_idx ON reminders(notification_id);