ALTER TABLE app_user ADD COLUMN IF NOT EXISTS hunting_certification_status VARCHAR(32) NOT NULL DEFAULT 'pending';
