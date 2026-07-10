CREATE TABLE IF NOT EXISTS app_user (
  id BIGSERIAL PRIMARY KEY,
  phone VARCHAR(32) NOT NULL,
  role VARCHAR(32) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
  nickname VARCHAR(80),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_app_user_phone_role ON app_user (phone, role);

CREATE TABLE IF NOT EXISTS product (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(160) NOT NULL,
  category VARCHAR(64) NOT NULL,
  source_type VARCHAR(32) NOT NULL,
  price_cents BIGINT NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(32) NOT NULL DEFAULT 'ON_SALE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_order (
  id BIGSERIAL PRIMARY KEY,
  order_no VARCHAR(64) NOT NULL UNIQUE,
  buyer_user_id BIGINT NOT NULL,
  product_id BIGINT NOT NULL,
  quantity INTEGER NOT NULL,
  product_amount_cents BIGINT NOT NULL,
  service_amount_cents BIGINT NOT NULL DEFAULT 0,
  total_amount_cents BIGINT NOT NULL,
  status VARCHAR(32) NOT NULL,
  delivery_mode VARCHAR(32) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchase_order_buyer_status ON purchase_order (buyer_user_id, status);

CREATE TABLE IF NOT EXISTS wallet_account (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL UNIQUE,
  withdrawable_cents BIGINT NOT NULL DEFAULT 0,
  protected_cents BIGINT NOT NULL DEFAULT 0,
  deposit_cents BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wallet_record (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  record_type VARCHAR(64) NOT NULL,
  direction VARCHAR(16) NOT NULL,
  amount_cents BIGINT NOT NULL,
  related_biz_type VARCHAR(64),
  related_biz_id BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_record_user_type ON wallet_record (user_id, record_type, created_at DESC);
