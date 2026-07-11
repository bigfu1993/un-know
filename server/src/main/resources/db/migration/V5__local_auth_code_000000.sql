INSERT INTO login_verification_code (phone, code, expires_at)
SELECT phone, '000000', NOW() + INTERVAL '365 days'
FROM (
  SELECT DISTINCT phone
  FROM app_user
) AS seed(phone)
WHERE NOT EXISTS (
  SELECT 1
  FROM login_verification_code c
  WHERE c.phone = seed.phone
    AND c.code = '000000'
);
