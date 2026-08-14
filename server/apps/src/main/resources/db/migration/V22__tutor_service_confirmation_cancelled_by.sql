ALTER TABLE tutor_applicant
  ADD COLUMN IF NOT EXISTS service_confirmation_cancelled_by VARCHAR(16);

COMMENT ON COLUMN tutor_applicant.service_confirmation_cancelled_by IS '取消正式兼职确认的发起方：parent/student；空值表示未取消或无需限制后续选择。';
