UPDATE tutor_applicant
SET status = '正式雇佣日程确认中',
    updated_at = NOW()
WHERE status = '兼职日程待提交';

UPDATE tutor_applicant
SET status = '正式雇佣',
    updated_at = NOW()
WHERE status IN ('兼职日程确认中', '正式家教服务');

UPDATE tutor_demand
SET status = '正式雇佣',
    updated_at = NOW()
WHERE status = '正式家教服务';
