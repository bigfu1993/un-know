-- 家教需求/试课申请状态值从中文展示文案迁移为稳定 KEY。
-- 迁移后 tutor_demand.status/tutor_applicant.status 只存 KEY，中文展示文案改由前端
-- db/tutorStatus.ts 的映射表统一维护。详见 docs/家教状态模型治理建议.md。

UPDATE tutor_demand
SET status = CASE status
  WHEN '待发布' THEN 'PENDING_PUBLISH'
  WHEN '发布中' THEN 'RECRUITING'
  WHEN '家教招募中' THEN 'RECRUITING'
  WHEN '进行中' THEN 'IN_PROGRESS'
  WHEN '正式雇佣' THEN 'IN_PROGRESS'
  WHEN '正式家教服务' THEN 'IN_PROGRESS'
  WHEN '家教进行中' THEN 'IN_PROGRESS'
  WHEN '申请结束中' THEN 'SERVICE_END_REQUESTED'
  WHEN '已结束' THEN 'ENDED'
  WHEN '已取消' THEN 'CANCELLED'
  ELSE status
END
WHERE status IN (
  '待发布', '发布中', '家教招募中', '进行中', '正式雇佣', '正式家教服务',
  '家教进行中', '申请结束中', '已结束', '已取消'
);

UPDATE tutor_applicant
SET status = CASE status
  WHEN '申请试课中' THEN 'APPLICATION_PENDING'
  WHEN '等待家长确认试课' THEN 'APPLICATION_PENDING'
  WHEN '试课日程确认中' THEN 'TRIAL_CONFIRMING'
  WHEN '试课确认中' THEN 'TRIAL_CONFIRMING'
  WHEN '试课中' THEN 'TRIALING'
  WHEN '结束试课确认中' THEN 'TRIAL_END_CONFIRMING'
  WHEN '试课结果处理' THEN 'TRIAL_RESULT_PROCESSING'
  WHEN '试课已结算' THEN 'TRIAL_SETTLED_SERVICE_PENDING'
  WHEN '试课已结算+雇佣确认中' THEN 'TRIAL_SETTLED_SERVICE_PENDING'
  WHEN '正式雇佣确认中' THEN 'SERVICE_CONFIRMING'
  WHEN '家教服务确认中' THEN 'SERVICE_CONFIRMING'
  WHEN '正式雇佣日程确认中' THEN 'SERVICE_SCHEDULE_PENDING'
  WHEN '兼职日程待提交' THEN 'SERVICE_SCHEDULE_PENDING'
  WHEN '兼职日程确认中' THEN 'SERVICE_SCHEDULE_CONFIRMING'
  WHEN '正式雇佣' THEN 'FORMAL_SERVICE'
  WHEN '正式家教服务' THEN 'FORMAL_SERVICE'
  WHEN '家教进行中' THEN 'FORMAL_SERVICE'
  WHEN '结束兼职确认中' THEN 'SERVICE_END_CONFIRMING'
  WHEN '结算确认中' THEN 'SETTLEMENT_CONFIRMING'
  WHEN '结算修改中' THEN 'SETTLEMENT_REVISING'
  WHEN '系统结算中' THEN 'SYSTEM_SETTLING'
  WHEN '已结束' THEN 'ENDED'
  WHEN '试课已结束' THEN 'TRIAL_ENDED'
  WHEN '已失效' THEN 'REJECTED'
  WHEN '已拒绝' THEN 'REJECTED'
  WHEN '正式雇佣失效' THEN 'FORMAL_SERVICE_INVALID'
  WHEN '已取消' THEN 'CANCELLED'
  ELSE status
END
WHERE status IN (
  '申请试课中', '等待家长确认试课', '试课日程确认中', '试课确认中', '试课中',
  '结束试课确认中', '试课结果处理', '试课已结算', '试课已结算+雇佣确认中',
  '正式雇佣确认中', '家教服务确认中', '正式雇佣日程确认中', '兼职日程待提交',
  '兼职日程确认中', '正式雇佣', '正式家教服务', '家教进行中', '结束兼职确认中',
  '结算确认中', '结算修改中', '系统结算中', '已结束', '试课已结束', '已失效',
  '已拒绝', '正式雇佣失效', '已取消'
);
