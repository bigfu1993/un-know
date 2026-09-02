CREATE INDEX IF NOT EXISTS idx_tutor_applicant_demand_enabled_status
  ON tutor_applicant (tutor_demand_id, enabled, status, id);

COMMENT ON INDEX idx_tutor_applicant_demand_enabled_status IS
  '按家教需求查询仍有效申请及家长账号级试课占用时使用。';
