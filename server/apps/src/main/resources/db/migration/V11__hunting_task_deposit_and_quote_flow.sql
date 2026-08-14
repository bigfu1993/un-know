ALTER TABLE wallet_account
  ADD COLUMN IF NOT EXISTS frozen_cents BIGINT NOT NULL DEFAULT 0;

ALTER TABLE hunting_task
  ADD COLUMN IF NOT EXISTS deposit_required BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS deposit_cents BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS selected_quote_id BIGINT REFERENCES hunting_task_quote(id),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE hunting_task_quote
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_hunting_task_accepted_user ON hunting_task (accepted_user_id, status);
CREATE INDEX IF NOT EXISTS idx_hunting_task_quote_task_status ON hunting_task_quote (hunting_task_id, status, created_at DESC);
