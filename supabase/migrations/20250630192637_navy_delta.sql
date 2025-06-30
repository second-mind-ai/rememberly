/*
  # Set up daily notifications cron job

  1. Cron Job Logs Table
    - Track execution of cron jobs
    - Store success/failure status and messages

  2. Cron Job Setup
    - Schedule daily notifications function
    - Run at 9:00 AM UTC daily

  3. Helper Functions
    - Functions to manage cron job execution
    - Logging and error tracking
*/

-- Create cron job logs table (if not exists)
CREATE TABLE IF NOT EXISTS cron_job_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name text NOT NULL,
  status text NOT NULL,
  message text,
  error_details text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for cron job logs
CREATE INDEX IF NOT EXISTS cron_job_logs_job_name_idx ON cron_job_logs(job_name);
CREATE INDEX IF NOT EXISTS cron_job_logs_created_at_idx ON cron_job_logs(created_at DESC);

-- Function to log cron job execution
CREATE OR REPLACE FUNCTION log_cron_job_execution(
  p_job_name text,
  p_status text,
  p_message text DEFAULT NULL,
  p_error_details text DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO cron_job_logs (job_name, status, message, error_details)
  VALUES (p_job_name, p_status, p_message, p_error_details);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment guest note count
CREATE OR REPLACE FUNCTION increment_guest_note_count()
RETURNS TRIGGER AS $$
BEGIN
  -- This function is for guest mode compatibility
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to decrement guest note count
CREATE OR REPLACE FUNCTION decrement_guest_note_count()
RETURNS TRIGGER AS $$
BEGIN
  -- This function is for guest mode compatibility
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Note: The actual cron job setup needs to be done manually in Supabase dashboard
-- or via SQL after enabling the pg_cron extension:

/*
-- Enable pg_cron extension (run this in Supabase SQL Editor)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily notifications at 9:00 AM UTC
-- SELECT cron.schedule(
--   'daily-notifications',
--   '0 9 * * *',
--   $$
--   SELECT
--     net.http_post(
--       url := 'https://your-project-ref.supabase.co/functions/v1/daily-notifications',
--       headers := '{"Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '", "Content-Type": "application/json"}',
--       body := '{}'
--     ) as request_id;
--   $$
-- );
*/