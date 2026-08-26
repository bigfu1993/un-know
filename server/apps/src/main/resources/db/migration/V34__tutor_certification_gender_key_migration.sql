-- 家教认证性别值从中文展示文案迁移为稳定 KEY。
-- 迁移后 tutor_certification.gender 只存 KEY，中文展示文案改由前端 db/gender.ts 的
-- genderLabel 映射表统一维护，后端唯一标准见 Genders.java。

UPDATE tutor_certification
SET gender = CASE gender
  WHEN '男' THEN 'MALE'
  WHEN '女' THEN 'FEMALE'
  WHEN '其他' THEN 'OTHER'
  ELSE gender
END
WHERE gender IN ('男', '女', '其他');
