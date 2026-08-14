-- 正式雇佣日程确认中只应保留学生提交的可家教时间，旧试课安排等待家长重新提交正式课程日程。
UPDATE tutor_applicant
SET trial_start = '',
    trial_end = '',
    trial_half_day = '',
    updated_at = NOW()
WHERE status IN ('正式雇佣日程确认中', '兼职日程待提交')
  AND (
    COALESCE(trial_start, '') <> ''
    OR COALESCE(trial_end, '') <> ''
    OR COALESCE(trial_half_day, '') <> ''
  );
