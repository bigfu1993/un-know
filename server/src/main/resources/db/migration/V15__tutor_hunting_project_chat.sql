ALTER TABLE app_user ADD COLUMN IF NOT EXISTS tutor_exposure_enabled BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE app_user
SET tutor_exposure_enabled = TRUE,
    tutor_certification_status = 'normal',
    updated_at = NOW()
WHERE phone = '18000000009'
  AND role = 'student';

UPDATE app_user
SET tutor_exposure_enabled = FALSE,
    tutor_certification_status = 'pending',
    updated_at = NOW()
WHERE phone = '18000000008'
  AND role = 'student';

ALTER TABLE tutor_demand ADD COLUMN IF NOT EXISTS parent_user_id BIGINT REFERENCES app_user(id);
ALTER TABLE tutor_demand ADD COLUMN IF NOT EXISTS title VARCHAR(160);
ALTER TABLE tutor_demand ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE tutor_demand ADD COLUMN IF NOT EXISTS requirement TEXT;
ALTER TABLE tutor_demand ADD COLUMN IF NOT EXISTS address_id VARCHAR(64);
ALTER TABLE tutor_demand ADD COLUMN IF NOT EXISTS address_label VARCHAR(240);
ALTER TABLE tutor_demand ADD COLUMN IF NOT EXISTS child_id VARCHAR(80);
ALTER TABLE tutor_demand ADD COLUMN IF NOT EXISTS period_start VARCHAR(32);
ALTER TABLE tutor_demand ADD COLUMN IF NOT EXISTS period_end VARCHAR(32);
ALTER TABLE tutor_demand ADD COLUMN IF NOT EXISTS trial_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE tutor_demand ADD COLUMN IF NOT EXISTS trial_duration VARCHAR(80);
ALTER TABLE tutor_demand ADD COLUMN IF NOT EXISTS wage_mode VARCHAR(80);
ALTER TABLE tutor_demand ADD COLUMN IF NOT EXISTS school_tags VARCHAR(240);
ALTER TABLE tutor_demand ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE tutor_demand
SET title = COALESCE(title, child || subject || '家教'),
    description = COALESCE(description, child || '需要' || subject || '家教'),
    requirement = COALESCE(requirement, subject),
    address_label = COALESCE(address_label, school),
    period_start = COALESCE(period_start, ''),
    period_end = COALESCE(period_end, ''),
    trial_duration = COALESCE(trial_duration, ''),
    wage_mode = COALESCE(wage_mode, '按课时结算'),
    school_tags = COALESCE(school_tags, '')
WHERE enabled = TRUE;

ALTER TABLE tutor_applicant ADD COLUMN IF NOT EXISTS applicant_user_id BIGINT REFERENCES app_user(id);
ALTER TABLE tutor_applicant ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE tutor_applicant ADD COLUMN IF NOT EXISTS trial_start VARCHAR(32);
ALTER TABLE tutor_applicant ADD COLUMN IF NOT EXISTS trial_end VARCHAR(32);
ALTER TABLE tutor_applicant ADD COLUMN IF NOT EXISTS trial_half_day VARCHAR(20);
ALTER TABLE tutor_applicant ADD COLUMN IF NOT EXISTS trial_fee_cents BIGINT NOT NULL DEFAULT 0;
ALTER TABLE tutor_applicant ADD COLUMN IF NOT EXISTS daily_fee_cents BIGINT NOT NULL DEFAULT 0;
ALTER TABLE tutor_applicant ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_tutor_demand_parent_status ON tutor_demand (parent_user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tutor_applicant_user_status ON tutor_applicant (applicant_user_id, status, id DESC);

CREATE TABLE IF NOT EXISTS hunting_project (
  id BIGSERIAL PRIMARY KEY,
  public_id VARCHAR(80) NOT NULL UNIQUE,
  user_id BIGINT NOT NULL REFERENCES app_user(id),
  current_area VARCHAR(160) NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'matching',
  matched_count INTEGER NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hunting_project_stop (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES hunting_project(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  input_mode VARCHAR(24) NOT NULL DEFAULT 'select',
  area VARCHAR(160) NOT NULL DEFAULT '',
  custom_area VARCHAR(240) NOT NULL DEFAULT '',
  eta_start VARCHAR(32) NOT NULL DEFAULT '',
  eta_end VARCHAR(32) NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hunting_project_user_status ON hunting_project (user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hunting_project_stop_project_order ON hunting_project_stop (project_id, sort_order);

CREATE TABLE IF NOT EXISTS chat_conversation (
  id BIGSERIAL PRIMARY KEY,
  public_id VARCHAR(80) NOT NULL UNIQUE,
  owner_user_id BIGINT NOT NULL REFERENCES app_user(id),
  peer_user_id BIGINT NOT NULL REFERENCES app_user(id),
  title VARCHAR(160) NOT NULL,
  related_biz_type VARCHAR(64),
  related_biz_id VARCHAR(80),
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_message (
  id BIGSERIAL PRIMARY KEY,
  public_id VARCHAR(80) NOT NULL UNIQUE,
  conversation_id BIGINT NOT NULL REFERENCES chat_conversation(id) ON DELETE CASCADE,
  sender_user_id BIGINT NOT NULL REFERENCES app_user(id),
  message_type VARCHAR(32) NOT NULL DEFAULT 'text',
  content TEXT NOT NULL,
  related_card_type VARCHAR(64),
  related_card_id VARCHAR(80),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_quick_action (
  id BIGSERIAL PRIMARY KEY,
  public_id VARCHAR(80) NOT NULL UNIQUE,
  owner_user_id BIGINT NOT NULL REFERENCES app_user(id),
  label VARCHAR(60) NOT NULL,
  content VARCHAR(240) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_conversation_owner_updated ON chat_conversation (owner_user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_message_conversation_created ON chat_message (conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_quick_action_owner_order ON chat_quick_action (owner_user_id, sort_order, id);

INSERT INTO chat_quick_action (public_id, owner_user_id, label, content, sort_order)
SELECT 'CQA-' || u.id || '-1', u.id, '还在吗', '你好，请问还在吗？', 1
FROM app_user u
WHERE NOT EXISTS (
  SELECT 1 FROM chat_quick_action a WHERE a.owner_user_id = u.id AND a.label = '还在吗'
);

INSERT INTO chat_quick_action (public_id, owner_user_id, label, content, sort_order)
SELECT 'CQA-' || u.id || '-2', u.id, '发订单', '我把订单卡片发给你确认一下。', 2
FROM app_user u
WHERE NOT EXISTS (
  SELECT 1 FROM chat_quick_action a WHERE a.owner_user_id = u.id AND a.label = '发订单'
);
