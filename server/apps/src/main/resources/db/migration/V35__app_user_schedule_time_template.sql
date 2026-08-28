ALTER TABLE app_user
  ADD COLUMN IF NOT EXISTS schedule_time_template JSONB NOT NULL DEFAULT '{}'::jsonb;
