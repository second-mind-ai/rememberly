/*
  # Fix UUID handling in cron job logging function

  1. Changes
    - Update log_cron_job_execution function to return UUID instead of void
    - Fix UUID handling to prevent "invalid input syntax for type uuid: null" error
    - Add proper error handling for null values
*/

-- Update the function to handle null values properly and return UUID
CREATE OR REPLACE FUNCTION log_cron_job_execution(
  p_job_name text,
  p_status text,
  p_message text DEFAULT NULL,
  p_error_details text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO cron_job_logs (job_name, status, message, error_details)
  VALUES (p_job_name, p_status, p_message, p_error_details)
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;