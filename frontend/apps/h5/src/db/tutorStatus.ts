/**
 * 家教需求主状态的唯一标准（对应后端 `tutor_demand.status`，与后端 `TUTOR_DEMAND_STATUS_*`
 * 常量一一对应）。枚举成员的值是稳定 KEY，不是中文展示文案——数据库、后端常量、
 * API 响应里传的都是这个 KEY，中文展示文案统一在 `tutorDemandStatusLabel` 里查表得到。
 * 详见 docs/家教状态模型治理建议.md。
 */
export enum TutorDemandStatus {
  /** 待发布。 */
  PendingPublish = "PENDING_PUBLISH",
  /** 发布中（招募中）。 */
  Recruiting = "RECRUITING",
  /** 进行中——需求下存在活跃申请（试课确认后到结算完成前的完整区间）。 */
  InProgress = "IN_PROGRESS",
  /** 申请结束中——活跃申请处于学生发起结束、等待家长结算的阶段。 */
  ServiceEndRequested = "SERVICE_END_REQUESTED",
  /** 已结束。 */
  Ended = "ENDED",
  /** 已取消。 */
  Cancelled = "CANCELLED"
}

/** `TutorDemandStatus` → 中文展示文案，界面渲染时查这张表，不直接展示 KEY。 */
export const tutorDemandStatusLabel: Record<TutorDemandStatus, string> = {
  [TutorDemandStatus.PendingPublish]: "待发布",
  [TutorDemandStatus.Recruiting]: "发布中",
  [TutorDemandStatus.InProgress]: "进行中",
  [TutorDemandStatus.ServiceEndRequested]: "申请结束中",
  [TutorDemandStatus.Ended]: "已结束",
  [TutorDemandStatus.Cancelled]: "已取消"
};

/**
 * 家教试课/正式雇佣申请细分状态的唯一标准（对应后端 `tutor_applicant.status`，与后端
 * `TUTOR_APPLICANT_STATUS_*` 常量一一对应）。成员按业务实际流转顺序排列：
 * 试课申请与确认 → 试课中 → 试课结束与结果处理 → 正式雇佣确认与日程 →
 * 正式服务进行中 → 服务结束与结算 → 结算完成；不在主流程分支上、代表退出/终止的状态
 * 统一收在末尾。所有家教卡片（进行中卡片、兼职列表卡片、试课申请列表等）判断和展示状态时
 * 只应引用这里的枚举值，不再各自散落同义的字符串字面量。
 */
export enum TutorApplicantStatus {
  /** 学生已提交试课申请，等待家长处理。 */
  ApplicationPending = "APPLICATION_PENDING",
  /** 家长已提交试课安排后，学生端等待确认流程的展示状态。 */
  TrialConfirming = "TRIAL_CONFIRMING",
  /** 学生已确认家长安排后，试课正在进行的展示状态。 */
  Trialing = "TRIALING",
  /** 学生提交结束试课后，等待家长确认的展示状态。 */
  TrialEndConfirming = "TRIAL_END_CONFIRMING",
  /** 家长处理试课是否正式雇佣时的展示状态。 */
  TrialResultProcessing = "TRIAL_RESULT_PROCESSING",
  /** 学生已确认试课费用，等待家长决定是否正式雇佣的状态。 */
  TrialSettledServicePending = "TRIAL_SETTLED_SERVICE_PENDING",

  /** 家长已发起正式雇佣，等待学生确认的展示状态。 */
  ServiceConfirming = "SERVICE_CONFIRMING",
  /** 学生同意正式雇佣后，等待家长提交正式雇佣日程的展示状态。 */
  ServiceSchedulePending = "SERVICE_SCHEDULE_PENDING",
  /** 旧版家长提交兼职日程后，等待学生确认的展示状态，只在历史数据里出现。 */
  ServiceScheduleConfirming = "SERVICE_SCHEDULE_CONFIRMING",

  /** 家长提交正式雇佣日程后的正式雇佣状态。 */
  FormalService = "FORMAL_SERVICE",

  /** 学生发起正式服务结束后，等待家长提交结算金额的状态。 */
  ServiceEndConfirming = "SERVICE_END_CONFIRMING",
  /** 家教或试课结算等待学生确认的展示状态。 */
  SettlementConfirming = "SETTLEMENT_CONFIRMING",
  /** 学生要求修改结算金额后的展示状态。 */
  SettlementRevising = "SETTLEMENT_REVISING",
  /** 家教系统计算结算金额时的展示状态。 */
  SystemSettling = "SYSTEM_SETTLING",
  /** 通用已结束终态，覆盖家教需求和试课申请两种场景。 */
  Ended = "ENDED",

  // 以下为不在主流程分支上、代表退出或终止的状态。

  /** 家长不正式雇佣且继续发布后的试课终态。 */
  TrialEnded = "TRIAL_ENDED",
  /** 家长拒绝试课后的学生端失效状态。 */
  Rejected = "REJECTED",
  /** 学生拒绝正式雇佣后的终态。 */
  ServiceInvalid = "FORMAL_SERVICE_INVALID",
  /** 通用已取消终态，覆盖家教需求和试课申请两种场景。 */
  Cancelled = "CANCELLED"
}

/** `TutorApplicantStatus` → 中文展示文案，界面渲染时查这张表，不直接展示 KEY。 */
export const tutorApplicantStatusLabel: Record<TutorApplicantStatus, string> = {
  [TutorApplicantStatus.ApplicationPending]: "申请试课中",
  [TutorApplicantStatus.TrialConfirming]: "试课日程确认中",
  [TutorApplicantStatus.Trialing]: "试课中",
  [TutorApplicantStatus.TrialEndConfirming]: "结束试课确认中",
  [TutorApplicantStatus.TrialResultProcessing]: "试课结果处理",
  [TutorApplicantStatus.TrialSettledServicePending]: "试课已结算",
  [TutorApplicantStatus.ServiceConfirming]: "正式雇佣确认中",
  [TutorApplicantStatus.ServiceSchedulePending]: "正式雇佣日程确认中",
  [TutorApplicantStatus.ServiceScheduleConfirming]: "兼职日程确认中",
  [TutorApplicantStatus.FormalService]: "正式雇佣",
  [TutorApplicantStatus.ServiceEndConfirming]: "结束兼职确认中",
  [TutorApplicantStatus.SettlementConfirming]: "结算确认中",
  [TutorApplicantStatus.SettlementRevising]: "结算修改中",
  [TutorApplicantStatus.SystemSettling]: "系统结算中",
  [TutorApplicantStatus.Ended]: "已结束",
  [TutorApplicantStatus.TrialEnded]: "试课已结束",
  [TutorApplicantStatus.Rejected]: "已失效",
  [TutorApplicantStatus.ServiceInvalid]: "正式雇佣失效",
  [TutorApplicantStatus.Cancelled]: "已取消"
};
