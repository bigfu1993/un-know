CREATE TABLE IF NOT EXISTS client_address (
  id BIGSERIAL PRIMARY KEY,
  public_id VARCHAR(64) NOT NULL UNIQUE,
  user_id BIGINT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  contact_name VARCHAR(80) NOT NULL,
  campus_area VARCHAR(120) NOT NULL,
  building_floor VARCHAR(120) NOT NULL,
  delivery_address VARCHAR(240) NOT NULL,
  contact_phone VARCHAR(32) NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_address_user_updated ON client_address (user_id, updated_at DESC, id DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uk_client_address_one_default
  ON client_address (user_id)
  WHERE is_default = TRUE;
