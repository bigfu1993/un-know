UPDATE app_user
SET phone = '13600000000',
    updated_at = NOW()
WHERE phone = '13800000000'
  AND role = 'merchant';

UPDATE app_user
SET phone = '13500000000',
    updated_at = NOW()
WHERE phone = '13800000000'
  AND role = 'parent';

INSERT INTO login_verification_code (phone, code, expires_at)
SELECT phone, '123456', NOW() + INTERVAL '365 days'
FROM (VALUES ('13500000000'), ('13600000000')) AS seed(phone)
WHERE NOT EXISTS (
  SELECT 1 FROM login_verification_code c WHERE c.phone = seed.phone AND c.code = '123456'
);
