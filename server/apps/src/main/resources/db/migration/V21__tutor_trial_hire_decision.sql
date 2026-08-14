ALTER TABLE tutor_applicant
  ADD COLUMN IF NOT EXISTS trial_hire_decision VARCHAR(16);

COMMENT ON COLUMN tutor_applicant.trial_hire_decision IS '家长提交试课结算时预选的正式雇佣决策，空值表示学生确认费用后再由家长单独选择。';
