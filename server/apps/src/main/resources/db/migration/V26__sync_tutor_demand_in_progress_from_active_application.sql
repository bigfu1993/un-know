UPDATE tutor_demand td
SET status = '进行中',
    updated_at = NOW()
WHERE td.enabled = TRUE
  AND td.status IN ('发布中', '家教招募中')
  AND EXISTS (
    SELECT 1
    FROM tutor_applicant ta
    WHERE ta.tutor_demand_id = td.id
      AND ta.enabled = TRUE
      AND ta.status IN (
        '正式雇佣日程确认中',
        '兼职日程待提交',
        '兼职日程确认中',
        '正式雇佣',
        '正式家教服务',
        '家教进行中'
      )
  );
