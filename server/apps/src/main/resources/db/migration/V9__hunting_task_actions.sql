ALTER TABLE hunting_task
  ADD COLUMN IF NOT EXISTS publisher_user_id BIGINT REFERENCES app_user(id),
  ADD COLUMN IF NOT EXISTS accepted_user_id BIGINT REFERENCES app_user(id),
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;

UPDATE hunting_task
SET publisher_user_id = (
  SELECT id
  FROM app_user
  WHERE role = 'student'
  ORDER BY updated_at DESC, id DESC
  LIMIT 1
)
WHERE publisher_user_id IS NULL;

CREATE TABLE IF NOT EXISTS hunting_task_quote (
  id BIGSERIAL PRIMARY KEY,
  public_id VARCHAR(64) NOT NULL UNIQUE,
  hunting_task_id BIGINT NOT NULL REFERENCES hunting_task(id),
  quote_user_id BIGINT NOT NULL REFERENCES app_user(id),
  amount_cents BIGINT NOT NULL,
  status VARCHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (hunting_task_id, quote_user_id)
);
