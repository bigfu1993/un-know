ALTER TABLE app_user ADD COLUMN IF NOT EXISTS credit_score INTEGER NOT NULL DEFAULT 0;
ALTER TABLE app_user ADD COLUMN IF NOT EXISTS profile_completion_required BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE app_user ADD COLUMN IF NOT EXISTS account_label VARCHAR(40);

ALTER TABLE product ADD COLUMN IF NOT EXISTS public_id VARCHAR(64);
ALTER TABLE product ADD COLUMN IF NOT EXISTS source_label VARCHAR(64);
ALTER TABLE product ADD COLUMN IF NOT EXISTS model VARCHAR(80);
ALTER TABLE product ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE product ADD COLUMN IF NOT EXISTS retail_price_cents BIGINT NOT NULL DEFAULT 0;
ALTER TABLE product ADD COLUMN IF NOT EXISTS service_fee_cents BIGINT NOT NULL DEFAULT 0;
ALTER TABLE product ADD COLUMN IF NOT EXISTS location VARCHAR(160);
ALTER TABLE product ADD COLUMN IF NOT EXISTS urgency VARCHAR(40) NOT NULL DEFAULT '普通';
ALTER TABLE product ADD COLUMN IF NOT EXISTS delivery_modes VARCHAR(160) NOT NULL DEFAULT 'scheduled';
ALTER TABLE product ADD COLUMN IF NOT EXISTS purchase_limit INTEGER NOT NULL DEFAULT 0;
ALTER TABLE product ADD COLUMN IF NOT EXISTS visible BOOLEAN NOT NULL DEFAULT TRUE;

CREATE UNIQUE INDEX IF NOT EXISTS uk_product_public_id ON product (public_id);

ALTER TABLE purchase_order ADD COLUMN IF NOT EXISTS payment_method VARCHAR(32) NOT NULL DEFAULT 'wechat';
ALTER TABLE purchase_order ADD COLUMN IF NOT EXISTS delivery_fee_cents BIGINT NOT NULL DEFAULT 0;
ALTER TABLE purchase_order ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(32) NOT NULL DEFAULT '400-000-2026';
ALTER TABLE purchase_order ADD COLUMN IF NOT EXISTS detail TEXT;
ALTER TABLE purchase_order ADD COLUMN IF NOT EXISTS risk VARCHAR(32);

ALTER TABLE wallet_record ADD COLUMN IF NOT EXISTS title VARCHAR(160);
ALTER TABLE wallet_record ADD COLUMN IF NOT EXISTS status VARCHAR(80);

CREATE TABLE IF NOT EXISTS auth_session (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  access_token VARCHAR(160) NOT NULL UNIQUE,
  refresh_token VARCHAR(160) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_session_user_created ON auth_session (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS login_verification_code (
  id BIGSERIAL PRIMARY KEY,
  phone VARCHAR(32) NOT NULL,
  code VARCHAR(12) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_code_phone ON login_verification_code (phone, expires_at DESC);

CREATE TABLE IF NOT EXISTS client_home_module (
  id BIGSERIAL PRIMARY KEY,
  role VARCHAR(32) NOT NULL,
  module_key VARCHAR(64) NOT NULL,
  title VARCHAR(80) NOT NULL,
  description TEXT NOT NULL,
  action VARCHAR(80) NOT NULL,
  priority VARCHAR(16) NOT NULL DEFAULT 'normal',
  sort_order INTEGER NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (role, module_key)
);

CREATE TABLE IF NOT EXISTS client_home_alert (
  id BIGSERIAL PRIMARY KEY,
  role VARCHAR(32) NOT NULL,
  content TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS part_time_job (
  id BIGSERIAL PRIMARY KEY,
  public_id VARCHAR(64) NOT NULL UNIQUE,
  publisher VARCHAR(120) NOT NULL,
  title VARCHAR(160) NOT NULL,
  description TEXT NOT NULL,
  hourly_pay_cents BIGINT NOT NULL,
  period VARCHAR(160) NOT NULL,
  location VARCHAR(160) NOT NULL,
  status VARCHAR(64) NOT NULL,
  requirement VARCHAR(120) NOT NULL,
  form_fields VARCHAR(240) NOT NULL,
  funding_state VARCHAR(120) NOT NULL,
  sign_rule VARCHAR(120) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hunting_profile (
  id BIGSERIAL PRIMARY KEY,
  role VARCHAR(32) NOT NULL UNIQUE,
  student_certification VARCHAR(80) NOT NULL,
  second_verification VARCHAR(80) NOT NULL,
  deposit_text VARCHAR(80) NOT NULL,
  credit_text VARCHAR(80) NOT NULL,
  online_status VARCHAR(80) NOT NULL
);

CREATE TABLE IF NOT EXISTS hunting_task (
  id BIGSERIAL PRIMARY KEY,
  public_id VARCHAR(64) NOT NULL UNIQUE,
  title VARCHAR(160) NOT NULL,
  mode VARCHAR(64) NOT NULL,
  fee_cents BIGINT NOT NULL DEFAULT 0,
  latest_time VARCHAR(80) NOT NULL,
  location VARCHAR(160) NOT NULL,
  urgency VARCHAR(40) NOT NULL,
  status VARCHAR(64) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tutor_demand (
  id BIGSERIAL PRIMARY KEY,
  public_id VARCHAR(64) NOT NULL UNIQUE,
  child VARCHAR(120) NOT NULL,
  subject VARCHAR(80) NOT NULL,
  school VARCHAR(120) NOT NULL,
  budget VARCHAR(80) NOT NULL,
  status VARCHAR(64) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tutor_applicant (
  id BIGSERIAL PRIMARY KEY,
  public_id VARCHAR(64) NOT NULL UNIQUE,
  tutor_demand_id BIGINT NOT NULL,
  name VARCHAR(80) NOT NULL,
  school VARCHAR(120) NOT NULL,
  major VARCHAR(120) NOT NULL,
  gpa VARCHAR(20) NOT NULL,
  hired_times INTEGER NOT NULL DEFAULT 0,
  availability VARCHAR(120) NOT NULL,
  status VARCHAR(64) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS merchant_dashboard (
  id BIGSERIAL PRIMARY KEY,
  dashboard_key VARCHAR(64) NOT NULL UNIQUE,
  sales_count INTEGER NOT NULL DEFAULT 0,
  sales_amount_cents BIGINT NOT NULL DEFAULT 0,
  pending_delivery INTEGER NOT NULL DEFAULT 0,
  delivering INTEGER NOT NULL DEFAULT 0,
  after_sale_messages INTEGER NOT NULL DEFAULT 0,
  chat_messages INTEGER NOT NULL DEFAULT 0,
  views INTEGER NOT NULL DEFAULT 0,
  favorites INTEGER NOT NULL DEFAULT 0,
  orders INTEGER NOT NULL DEFAULT 0,
  deals INTEGER NOT NULL DEFAULT 0,
  after_sale_rate VARCHAR(24) NOT NULL DEFAULT '0%',
  part_time_conversion VARCHAR(24) NOT NULL DEFAULT '0%',
  deposit_status VARCHAR(80) NOT NULL DEFAULT '未缴纳'
);

INSERT INTO login_verification_code (phone, code, expires_at)
SELECT phone, '123456', NOW() + INTERVAL '365 days'
FROM (VALUES ('13800000000'), ('13900000000'), ('13700000000')) AS seed(phone)
WHERE NOT EXISTS (
  SELECT 1 FROM login_verification_code c WHERE c.phone = seed.phone AND c.code = '123456'
);

INSERT INTO app_user (phone, role, status, nickname, credit_score, profile_completion_required, account_label)
VALUES
  ('13800000000', 'student', 'ACTIVE', '佚名同学', 10, TRUE, '学生'),
  ('13800000000', 'merchant', 'ACTIVE', '校园商户', 0, FALSE, '商户'),
  ('13800000000', 'parent', 'ACTIVE', '家长用户', 0, TRUE, '家长')
ON CONFLICT (phone, role) DO UPDATE SET
  nickname = EXCLUDED.nickname,
  credit_score = EXCLUDED.credit_score,
  account_label = EXCLUDED.account_label,
  updated_at = NOW();

INSERT INTO wallet_account (user_id, withdrawable_cents, protected_cents, deposit_cents)
SELECT id,
  CASE WHEN role = 'merchant' THEN 241800 WHEN role = 'student' THEN 12600 ELSE 0 END,
  CASE WHEN role = 'merchant' THEN 0 WHEN role = 'student' THEN 1800 ELSE 0 END,
  CASE WHEN role = 'merchant' THEN 100000 ELSE 10000 END
FROM app_user u
WHERE phone = '13800000000'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO product (
  public_id, title, category, source_type, source_label, model, description,
  price_cents, retail_price_cents, service_fee_cents, stock, status,
  location, urgency, delivery_modes, purchase_limit, visible
)
VALUES
  ('p_stationery_001', '晨光考试套装', '学习耗材', 'PLATFORM', '平台自营', 'MG-EXAM-01', '黑色中性笔、2B 铅笔、橡皮和透明笔袋，适合作为优选引流商品。', 1990, 2990, 200, 120, 'ON_SALE', '校内服务点 A 区', '普通', 'immediate,scheduled,express', 0, TRUE),
  ('p_daily_001', '宿舍清洁补给包', '宿舍耗材', 'PLATFORM', '平台自营', 'DORM-CLEAN-01', '垃圾袋、湿巾和小瓶洗衣液组合，面向学生宿舍高频消耗场景。', 2490, 3500, 300, 80, 'ON_SALE', '生活区快取点', '普通', 'immediate,scheduled', 0, TRUE),
  ('p_merchant_001', '校园打印店 100 页套餐', '校园服务', 'MERCHANT', '商户自售', 'PRINT-100', '黑白打印 100 页套餐，商户负责履约和售后。', 1200, 1500, 100, 50, 'ON_SALE', '二食堂东侧打印店', '普通', 'scheduled', 2, TRUE),
  ('p_merchant_002', '证件照快拍', '生活服务', 'MERCHANT', '商户自售', 'PHOTO-ID', '证件照拍摄和电子版交付，适合报名、考试和材料提交。', 1800, 2500, 200, 18, 'OFF_SALE', '东门生活服务点', '普通', 'scheduled', 1, FALSE)
ON CONFLICT (public_id) DO UPDATE SET
  title = EXCLUDED.title,
  category = EXCLUDED.category,
  source_type = EXCLUDED.source_type,
  source_label = EXCLUDED.source_label,
  model = EXCLUDED.model,
  description = EXCLUDED.description,
  price_cents = EXCLUDED.price_cents,
  retail_price_cents = EXCLUDED.retail_price_cents,
  service_fee_cents = EXCLUDED.service_fee_cents,
  stock = EXCLUDED.stock,
  status = EXCLUDED.status,
  location = EXCLUDED.location,
  urgency = EXCLUDED.urgency,
  delivery_modes = EXCLUDED.delivery_modes,
  purchase_limit = EXCLUDED.purchase_limit,
  visible = EXCLUDED.visible,
  updated_at = NOW();

INSERT INTO client_home_alert (role, content, sort_order)
SELECT role, content, sort_order
FROM (VALUES
  ('student', '当前数据来自云端 PostgreSQL，接口异常不会展示本地假数据。', 10),
  ('merchant', '当前数据来自云端 PostgreSQL，商户工作台使用真实表读取。', 10),
  ('parent', '当前数据来自云端 PostgreSQL，家长端商品和家教数据真实读取。', 10)
) AS seed(role, content, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM client_home_alert a WHERE a.role = seed.role AND a.content = seed.content
);

INSERT INTO client_home_module (role, module_key, title, description, action, priority, sort_order)
VALUES
  ('student', 'featured', '优选', '浏览自营、商户商品和服务', '进入优选', 'high', 10),
  ('student', 'partTime', '兼职', '查看可报名兼职和报名状态', '查看兼职', 'high', 20),
  ('student', 'hunting', '委托/狩猎', '发布委托或上线接单', '进入委托', 'normal', 30),
  ('merchant', 'merchantSales', '销售工作台', '商品、订单、配送和消息', '进入工作台', 'high', 10),
  ('merchant', 'partTime', '兼职工作台', '发布兼职、筛选名单和结算', '管理兼职', 'high', 20),
  ('merchant', 'marketing', '营销', '营销活动能力预留', '查看营销', 'normal', 30),
  ('parent', 'featured', '商品', '家长端商品固定快递配送', '查看商品', 'high', 10),
  ('parent', 'tutor', '家教', '发布家教需求并筛选学生', '发布需求', 'high', 20)
ON CONFLICT (role, module_key) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  action = EXCLUDED.action,
  priority = EXCLUDED.priority,
  sort_order = EXCLUDED.sort_order,
  enabled = TRUE;

INSERT INTO part_time_job (public_id, publisher, title, description, hourly_pay_cents, period, location, status, requirement, form_fields, funding_state, sign_rule)
VALUES
  ('J001', '校园书店', '周末教材整理兼职', '整理教材、贴码、上架，报名后等待发布方筛选。', 2200, '本周六 09:00-16:00', '学生活动中心一层', '已确认/待签到', '无要求', '年龄,性别,是否本地,联系电话', '费用已托管', '发布方确认签到'),
  ('J002', '校企合作项目', '迎新活动短期协助', '协助签到、引导和物料分发，满员后自动结束报名。', 2500, '7 月 13 日 08:30-12:00', '北门广场', '待筛选', '限女生', '身高,近视,籍贯,自定义特长', '岗位预算已托管', '学生手动签到')
ON CONFLICT (public_id) DO UPDATE SET
  publisher = EXCLUDED.publisher,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  hourly_pay_cents = EXCLUDED.hourly_pay_cents,
  period = EXCLUDED.period,
  location = EXCLUDED.location,
  status = EXCLUDED.status,
  requirement = EXCLUDED.requirement,
  form_fields = EXCLUDED.form_fields,
  funding_state = EXCLUDED.funding_state,
  sign_rule = EXCLUDED.sign_rule,
  enabled = TRUE;

INSERT INTO hunting_profile (role, student_certification, second_verification, deposit_text, credit_text, online_status)
VALUES ('student', '已通过', '待人工审核', '¥100', '10', '未上线')
ON CONFLICT (role) DO UPDATE SET
  student_certification = EXCLUDED.student_certification,
  second_verification = EXCLUDED.second_verification,
  deposit_text = EXCLUDED.deposit_text,
  credit_text = EXCLUDED.credit_text,
  online_status = EXCLUDED.online_status;

INSERT INTO hunting_task (public_id, title, mode, fee_cents, latest_time, location, urgency, status)
VALUES
  ('H001', '帮忙从快递站取件送到 5 号楼', '服务发布', 600, '今天 20:20 前', '菜鸟驿站 -> 5 号楼', '紧急', '待领取'),
  ('H002', '从市区带一杯咖啡回学校', '报价发布', 0, '今晚 22:00 前', '万达广场 -> 东门', '普通', '待报价'),
  ('H003', '过期委托待发起者确认激活', '服务发布', 1000, '已超过 24h', '图书馆 -> 西区宿舍', '普通', '领取后待确认激活')
ON CONFLICT (public_id) DO UPDATE SET
  title = EXCLUDED.title,
  mode = EXCLUDED.mode,
  fee_cents = EXCLUDED.fee_cents,
  latest_time = EXCLUDED.latest_time,
  location = EXCLUDED.location,
  urgency = EXCLUDED.urgency,
  status = EXCLUDED.status,
  enabled = TRUE;

INSERT INTO tutor_demand (public_id, child, subject, school, budget, status)
VALUES ('T001', '孩子 A · 初二', '数学', '佚名大学', '120 元/次', '招募中')
ON CONFLICT (public_id) DO UPDATE SET
  child = EXCLUDED.child,
  subject = EXCLUDED.subject,
  school = EXCLUDED.school,
  budget = EXCLUDED.budget,
  status = EXCLUDED.status,
  enabled = TRUE;

INSERT INTO tutor_applicant (public_id, tutor_demand_id, name, school, major, gpa, hired_times, availability, status)
SELECT seed.public_id, d.id, seed.name, seed.school, seed.major, seed.gpa, seed.hired_times, seed.availability, seed.status
FROM tutor_demand d
JOIN (VALUES
  ('TA01', '林同学', '佚名大学', '数学与应用数学', '3.82', 8, '周末 6 小时', '沟通中'),
  ('TA02', '周同学', '佚名大学', '物理学', '3.66', 3, '工作日晚间', '待筛选')
) AS seed(public_id, name, school, major, gpa, hired_times, availability, status) ON d.public_id = 'T001'
ON CONFLICT (public_id) DO UPDATE SET
  tutor_demand_id = EXCLUDED.tutor_demand_id,
  name = EXCLUDED.name,
  school = EXCLUDED.school,
  major = EXCLUDED.major,
  gpa = EXCLUDED.gpa,
  hired_times = EXCLUDED.hired_times,
  availability = EXCLUDED.availability,
  status = EXCLUDED.status,
  enabled = TRUE;

INSERT INTO merchant_dashboard (
  dashboard_key, sales_count, sales_amount_cents, pending_delivery, delivering,
  after_sale_messages, chat_messages, views, favorites, orders, deals,
  after_sale_rate, part_time_conversion, deposit_status
)
VALUES ('default', 36, 241800, 8, 5, 3, 12, 1280, 96, 88, 36, '2.1%', '18%', '已缴纳')
ON CONFLICT (dashboard_key) DO UPDATE SET
  sales_count = EXCLUDED.sales_count,
  sales_amount_cents = EXCLUDED.sales_amount_cents,
  pending_delivery = EXCLUDED.pending_delivery,
  delivering = EXCLUDED.delivering,
  after_sale_messages = EXCLUDED.after_sale_messages,
  chat_messages = EXCLUDED.chat_messages,
  views = EXCLUDED.views,
  favorites = EXCLUDED.favorites,
  orders = EXCLUDED.orders,
  deals = EXCLUDED.deals,
  after_sale_rate = EXCLUDED.after_sale_rate,
  part_time_conversion = EXCLUDED.part_time_conversion,
  deposit_status = EXCLUDED.deposit_status;
