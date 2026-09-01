ALTER TABLE tutor_application_schedule
  ADD COLUMN IF NOT EXISTS schedule_dates JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN tutor_application_schedule.schedule_dates IS
  '结构化日程日期与时间段；trial 阶段通过接口映射为 testedDates，service 阶段后续映射为 arrangedDates。';
