UPDATE tutor_demand
SET status = '进行中',
    updated_at = NOW()
WHERE status IN ('正式雇佣', '正式家教服务', '家教进行中');
