UPDATE tutor_applicant
SET status = '试课已结算',
    updated_at = NOW()
WHERE status = '试课已结算+雇佣确认中';

UPDATE tutor_applicant
SET status = '正式雇佣确认中',
    updated_at = NOW()
WHERE status = '家教服务确认中';
