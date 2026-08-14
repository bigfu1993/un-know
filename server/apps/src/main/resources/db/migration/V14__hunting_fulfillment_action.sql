ALTER TABLE hunting_task_quote
  ADD COLUMN IF NOT EXISTS original_amount_cents BIGINT;

UPDATE hunting_task_quote
SET original_amount_cents = amount_cents
WHERE original_amount_cents IS NULL;

ALTER TABLE hunting_task_quote
  ALTER COLUMN original_amount_cents SET NOT NULL;

ALTER TABLE hunting_task
  ADD COLUMN IF NOT EXISTS fulfillment_action VARCHAR(64),
  ADD COLUMN IF NOT EXISTS fulfillment_action_user_id BIGINT REFERENCES app_user(id);

CREATE INDEX IF NOT EXISTS idx_hunting_task_fulfillment_action
  ON hunting_task (fulfillment_action, fulfillment_action_user_id);
