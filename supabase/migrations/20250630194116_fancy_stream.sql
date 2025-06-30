-- Drop the existing function first to avoid return type conflict
DROP FUNCTION IF EXISTS log_cron_job_execution(text, text, text, text);

-- Create the function with proper UUID return type and null handling
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