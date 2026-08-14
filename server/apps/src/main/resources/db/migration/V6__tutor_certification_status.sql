ALTER TABLE app_user ADD COLUMN IF NOT EXISTS tutor_certification_status VARCHAR(32) NOT NULL DEFAULT 'pending';

INSERT INTO app_user (
  phone, role, status, nickname, credit_score, profile_completion_required, account_label, tutor_certification_status
)
VALUES ('18000000009', 'student', 'ACTIVE', '家教认证用户', 10, FALSE, '学生', 'normal')
ON CONFLICT (phone) DO UPDATE SET
  tutor_certification_status = 'normal',
  updated_at = NOW();

INSERT INTO login_verification_code (phone, code, expires_at)
SELECT '18000000009', '000000', NOW() + INTERVAL '365 days'
WHERE NOT EXISTS (
  SELECT 1
  FROM login_verification_code
  WHERE phone = '18000000009'
    AND code = '000000'
);
