-- 家教学科值从中文展示文案迁移为稳定 KEY。
-- 迁移后 tutor_demand.subject（单值）/tutor_certification.subject（"、"分隔多值）只存 KEY，
-- 中文展示文案改由前端 db/tutorSubject.ts 的 tutorSubjectLabel 映射表统一维护，
-- 后端唯一标准见 TutorSubjects.java。

UPDATE tutor_demand
SET subject = CASE subject
  WHEN '语文' THEN 'CHINESE'
  WHEN '数学' THEN 'MATH'
  WHEN '英语' THEN 'ENGLISH'
  WHEN '物理' THEN 'PHYSICS'
  WHEN '化学' THEN 'CHEMISTRY'
  WHEN '生物' THEN 'BIOLOGY'
  WHEN '历史' THEN 'HISTORY'
  WHEN '地理' THEN 'GEOGRAPHY'
  WHEN '政治' THEN 'POLITICS'
  WHEN '编程' THEN 'PROGRAMMING'
  ELSE subject
END
WHERE subject IN ('语文', '数学', '英语', '物理', '化学', '生物', '历史', '地理', '政治', '编程');

-- tutor_certification.subject 是"、"分隔的多值字符串，用嵌套 REPLACE 逐词替换。
UPDATE tutor_certification
SET subject = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
             REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
               subject,
               '语文', 'CHINESE'), '数学', 'MATH'), '英语', 'ENGLISH'), '物理', 'PHYSICS'), '化学', 'CHEMISTRY'),
               '生物', 'BIOLOGY'), '历史', 'HISTORY'), '地理', 'GEOGRAPHY'), '政治', 'POLITICS'), '编程', 'PROGRAMMING');
