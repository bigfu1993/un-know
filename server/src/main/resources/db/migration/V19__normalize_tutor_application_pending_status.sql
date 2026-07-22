UPDATE tutor_applicant
SET status = '申请试课中',
    updated_at = NOW()
WHERE status = '等待家长确认试课';
