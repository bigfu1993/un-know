CREATE TABLE IF NOT EXISTS tutor_application_schedule (
  id BIGSERIAL PRIMARY KEY,
  tutor_applicant_id BIGINT NOT NULL REFERENCES tutor_applicant(id),
  stage VARCHAR(32) NOT NULL,
  schedule_start VARCHAR(32) NOT NULL DEFAULT '',
  schedule_end VARCHAR(32) NOT NULL DEFAULT '',
  schedule_summary TEXT NOT NULL DEFAULT '',
  created_by_role VARCHAR(32) NOT NULL DEFAULT '',
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uk_tutor_application_schedule_stage UNIQUE (tutor_applicant_id, stage)
);

CREATE INDEX IF NOT EXISTS idx_tutor_application_schedule_applicant
  ON tutor_application_schedule (tutor_applicant_id, stage, enabled);

COMMENT ON TABLE tutor_application_schedule IS '家教申请子任务日程表，统一维护试课阶段和正式雇佣阶段的时间安排。';
COMMENT ON COLUMN tutor_application_schedule.tutor_applicant_id IS '所属学生申请子任务。';
COMMENT ON COLUMN tutor_application_schedule.stage IS '日程阶段：trial 表示试课安排，service 表示正式雇佣课程安排。';
COMMENT ON COLUMN tutor_application_schedule.schedule_summary IS '日程摘要，使用与前端日历兼容的多日时间段文本。';
COMMENT ON COLUMN tutor_application_schedule.created_by_role IS '最近一次提交日程的角色。';

INSERT INTO tutor_application_schedule (
  tutor_applicant_id,
  stage,
  schedule_start,
  schedule_end,
  schedule_summary,
  created_by_role
)
SELECT
  ta.id,
  'service',
  COALESCE(ta.trial_start, ''),
  COALESCE(ta.trial_end, ''),
  COALESCE(ta.trial_half_day, ''),
  'parent'
FROM tutor_applicant ta
WHERE ta.status IN ('兼职日程确认中', '正式雇佣', '正式家教服务', '家教进行中', '结束兼职确认中')
  AND COALESCE(NULLIF(ta.trial_half_day, ''), '') <> ''
ON CONFLICT (tutor_applicant_id, stage) DO UPDATE
SET schedule_start = EXCLUDED.schedule_start,
    schedule_end = EXCLUDED.schedule_end,
    schedule_summary = EXCLUDED.schedule_summary,
    created_by_role = EXCLUDED.created_by_role,
    enabled = TRUE,
    updated_at = NOW();

INSERT INTO tutor_application_schedule (
  tutor_applicant_id,
  stage,
  schedule_start,
  schedule_end,
  schedule_summary,
  created_by_role
)
SELECT
  ta.id,
  'trial',
  COALESCE(ta.trial_start, ''),
  COALESCE(ta.trial_end, ''),
  COALESCE(ta.trial_half_day, ''),
  'parent'
FROM tutor_applicant ta
WHERE ta.status NOT IN ('兼职日程确认中', '正式雇佣', '正式家教服务', '家教进行中', '结束兼职确认中')
  AND COALESCE(NULLIF(ta.trial_half_day, ''), '') <> ''
ON CONFLICT (tutor_applicant_id, stage) DO UPDATE
SET schedule_start = EXCLUDED.schedule_start,
    schedule_end = EXCLUDED.schedule_end,
    schedule_summary = EXCLUDED.schedule_summary,
    created_by_role = EXCLUDED.created_by_role,
    enabled = TRUE,
    updated_at = NOW();
