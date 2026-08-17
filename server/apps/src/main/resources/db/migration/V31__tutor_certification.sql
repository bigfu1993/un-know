CREATE TABLE IF NOT EXISTS tutor_certification (
  user_id BIGINT PRIMARY KEY REFERENCES app_user(id),
  real_name VARCHAR(64) NOT NULL,
  gender VARCHAR(16) NOT NULL,
  age VARCHAR(16) NOT NULL,
  native_place VARCHAR(64) NOT NULL,
  id_card VARCHAR(32) NOT NULL,
  school VARCHAR(128) NOT NULL,
  major VARCHAR(128) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  xuexin_screenshot VARCHAR(255),
  gpa VARCHAR(32),
  certificate VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 演示账号 18000000009（V15 迁移里已经是家教认证通过 + 已开启家教开关的种子账号），
-- 补一行真实认证信息种子数据，避免 /students 查询改成 INNER JOIN 后这个演示账号从列表消失。
INSERT INTO tutor_certification (
  user_id, real_name, gender, age, native_place, id_card, school, major, subject, gpa, certificate
)
SELECT id, '示范用户', '女', '21', '示范省示范市', '000000000000000000', '示范大学', '教育学',
       '数学、英语', '3.8', '教师资格证'
FROM app_user
WHERE phone = '18000000009'
  AND role = 'student'
ON CONFLICT (user_id) DO NOTHING;
