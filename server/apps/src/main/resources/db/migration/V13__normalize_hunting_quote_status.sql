UPDATE hunting_task_quote
SET status = '待发布方确认',
    updated_at = NOW()
WHERE status = '待确认';
