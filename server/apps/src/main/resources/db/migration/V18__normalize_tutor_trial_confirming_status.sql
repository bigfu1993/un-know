UPDATE tutor_applicant
SET status = '试课确认中',
    updated_at = NOW()
WHERE status = '试课已确认';
