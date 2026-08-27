import {
  getTutorTrialStatusLabel,
  isTutorApplicationPendingStatus,
  isTutorApplicationListStatus,
  isTutorTrialListStatus,
  isTutorFormalServiceStatus,
  isTutorServiceConfirmingStatus,
  isTutorServiceEndConfirmingStatus,
  isTutorServiceInvalidStatus,
  isTutorServiceSchedulePendingStatus,
  isTutorSettlementStatus,
  isTutorTerminalStatus,
  isTutorTrialConfirmingStatus,
  isTutorTrialEndConfirmingStatus,
  isTutorTrialSettledServicePendingStatus,
  isTutorTrialingStatus,
  isTutorTrialResultProcessingStatus
} from "@tools/tutorTrial";

/** 家教任务流程节点，前端只做展示和动作编排，真实迁移以服务端状态为准。 */
export type TutorTaskNode =
  | "applicationPending"
  | "trialScheduled"
  | "trialing"
  | "trialEndRequested"
  | "trialResultProcessing"
  | "serviceConfirming"
  | "serviceSchedulePending"
  | "serviceScheduleConfirming"
  | "formalTutoring"
  | "serviceEndRequested"
  | "settlementConfirming"
  | "settlementRevising"
  | "systemSettling"
  | "tutoring"
  | "ended"
  | "cancelled"
  | "rejected"
  | "unknown";

/** 家教任务可触发事件，事件执行仍由业务 hook 调用真实接口。 */
export type TutorTaskAction =
  | "message"
  | "openApplications"
  | "scheduleTrial"
  | "rescheduleTrial"
  | "openTrialSchedule"
  | "confirmTrialStart"
  | "openTrialList"
  | "requestTrialEnd"
  | "completeTrialEnd"
  | "cancelApplication"
  | "cancelServiceConfirmation"
  | "cancelDemand"
  | "rejectTrial"
  | "agreeTrial"
  | "openTrialResult"
  | "requestTrialResult"
  | "confirmTrialEnd"
  | "offerTutorService"
  | "removeRejectedServiceOffer"
  | "closeTrialContinueRecruiting"
  | "acceptServiceOffer"
  | "rejectServiceOffer"
  | "submitServiceSchedule"
  | "confirmServiceSchedule"
  | "requestServiceScheduleChange"
  | "requestServiceEnd"
  | "confirmSettlement"
  | "resubmitSettlement"
  | "updateTrialAvailability";

/** 家教任务状态视觉语义。 */
export type TutorTaskStatusTone = "default" | "trialConfirming" | "trialing" | "warning" | "danger" | "success";

/** 家教任务模型入参。 */
interface TutorTaskModelOptions {
  candidate?: TutorApplicationCandidate;
  order?: ClientOrder;
  role: Role;
}

/** 家教任务纯模型，集中暴露流程节点、可用事件和列表归属。 */
export interface TutorTaskModel {
  availableActions: TutorTaskAction[];
  can: (action: TutorTaskAction) => boolean;
  /** 卡片右侧实际要展示的状态文案列表：优先取 statusLabels，都没有时兜底用 statusLabel；
   *  多处候选人/订单卡片都要展示状态角标，这里统一算好，调用方不用各自重复同一段 fallback 逻辑。 */
  displayStatusLabels: string[];
  isApplicationListVisible: boolean;
  isTrialListVisible: boolean;
  node: TutorTaskNode;
  statusLabel: string;
  statusLabels: string[];
  statusTone: TutorTaskStatusTone;
  statusToneClassName: string;
}

/**
 * 从状态 KEY 归一化为家教任务流程节点。入参可能是 TutorApplicantStatus（学生视角/候选人视角）
 * 或 TutorDemandStatus（家长聚合卡片视角，见 isTutorFormalServiceStatus 对 InProgress 的识别），
 * 已经是精确的 KEY，不再需要子串匹配。
 */
export function getTutorTaskNode(status?: string): TutorTaskNode {
  if (isTutorSettlementStatus(status)) {
    if (status === TutorApplicantStatus.SettlementRevising) {
      return "settlementRevising";
    }
    if (status === TutorApplicantStatus.SystemSettling) {
      return "systemSettling";
    }
    if (status === TutorApplicantStatus.SettlementConfirming) {
      return "settlementConfirming";
    }
  }
  if (isTutorFormalServiceStatus(status)) {
    return "formalTutoring";
  }
  if (isTutorServiceSchedulePendingStatus(status)) {
    return "serviceSchedulePending";
  }
  if (isTutorServiceConfirmingStatus(status)) {
    return "serviceConfirming";
  }
  if (isTutorServiceEndConfirmingStatus(status)) {
    return "serviceEndRequested";
  }
  if (isTutorTrialResultProcessingStatus(status) || isTutorTrialSettledServicePendingStatus(status)) {
    return "trialResultProcessing";
  }
  if (isTutorTrialEndConfirmingStatus(status)) {
    return "trialEndRequested";
  }
  if (isTutorTrialingStatus(status)) {
    return "trialing";
  }
  if (isTutorTrialConfirmingStatus(status)) {
    return "trialScheduled";
  }
  if (status === TutorApplicantStatus.Cancelled || status === TutorDemandStatus.Cancelled) {
    return "cancelled";
  }
  if (status === TutorApplicantStatus.Rejected || status === TutorApplicantStatus.ServiceInvalid) {
    return "rejected";
  }
  if (isTutorTerminalStatus(status) || status === TutorApplicantStatus.Ended || status === TutorDemandStatus.Ended) {
    return "ended";
  }
  if (isTutorApplicationPendingStatus(status)) {
    return "applicationPending";
  }

  return status ? "unknown" : "applicationPending";
}

/** 根据流程节点给出家教任务状态样式。 */
export function getTutorTaskStatusTone(node: TutorTaskNode): TutorTaskStatusTone {
  if (node === "trialScheduled" || node === "trialEndRequested" || node === "serviceConfirming" || node === "serviceEndRequested") {
    return "trialConfirming";
  }
  if (node === "trialing" || node === "formalTutoring") {
    return "trialing";
  }
  if (node === "trialResultProcessing" || node === "serviceSchedulePending" || node === "settlementConfirming") {
    return "warning";
  }
  if (node === "settlementRevising" || node === "systemSettling") {
    return "danger";
  }

  return "default";
}

/** 将家教任务状态语义转换为现有样式类名。 */
export function getTutorTaskStatusToneClassName(tone: TutorTaskStatusTone) {
  if (tone === "trialConfirming") {
    return "trial-confirming";
  }
  if (tone === "trialing") {
    return "trialing";
  }
  if (tone === "warning") {
    return "trial-confirming";
  }
  if (tone === "danger") {
    return "trial-confirming";
  }

  return "";
}

/** 获取家教任务卡片状态展示行，家长主卡支持展示需求状态和申请状态两行；
 *  activeApplicantStatus 只有家长聚合卡片才会有值，来自 order.activeApplicantStatus。 */
export function getTutorTaskStatusLabels(status?: string, role?: Role, activeApplicantStatus?: string) {
  if (role === "parent" && status === TutorDemandStatus.InProgress && activeApplicantStatus === TutorApplicantStatus.ServiceEndConfirming) {
    return [tutorDemandStatusLabel[TutorDemandStatus.InProgress], tutorDemandStatusLabel[TutorDemandStatus.ServiceEndRequested]];
  }
  if (isTutorServiceInvalidStatus(status)) {
    return ["试课完成", "拒绝正式委托"];
  }
  if (isTutorTrialSettledServicePendingStatus(status)) {
    return [tutorApplicantStatusLabel[TutorApplicantStatus.TrialSettledServicePending], "等待正式雇佣"];
  }
  if (isTutorServiceConfirmingStatus(status)) {
    return [tutorApplicantStatusLabel[TutorApplicantStatus.ServiceConfirming]];
  }

  const statusLabel = getTutorTrialStatusLabel(status);

  return statusLabel ? [statusLabel] : [];
}

/** 判断家长端家教主卡是否仍处于发布中，取消入口展示后由后端接口做最终限制。 */
function isParentRecruitingTutorOrder(order: ClientOrder, role: Role) {
  return role === "parent" && order.category === "tutor" && order.status === TutorDemandStatus.Recruiting;
}

/** 创建家教任务纯模型，供订单卡片、申请列表和试课列表统一消费。 */
export function createTutorTaskModel({ candidate, order, role }: TutorTaskModelOptions): TutorTaskModel {
  const status = order?.status ?? candidate?.status;
  const node = getTutorTaskNode(status);
  const statusTone = getTutorTaskStatusTone(node);
  const isApplicationListVisible = candidate ? isTutorApplicationListStatus(candidate.status) : false;
  const isTrialListVisible = candidate ? isTutorTrialListStatus(candidate.status) : false;
  const statusLabel = getTutorTrialStatusLabel(status);
  const actions = new Set<TutorTaskAction>();

  if (order) {
    if (order.canMessage) {
      actions.add("message");
    }
    if (order.canOpenTutorApplications) {
      actions.add("openApplications");
    }
    if (order.canOpenTrialSchedule) {
      actions.add("openTrialSchedule");
    }
    if (order.canAgreeTrial && node === "trialScheduled") {
      actions.add("confirmTrialStart");
    }
    if (order.canOpenTutorTrialList) {
      actions.add("openTrialList");
    }
    if (order.canRequestComplete && node === "trialing") {
      actions.add("requestTrialEnd");
    }
    if (order.canRequestCancel || isParentRecruitingTutorOrder(order, role)) {
      actions.add("cancelDemand");
    }
    if (order.canCancelTutorApplication && (node === "applicationPending" || node === "trialScheduled")) {
      actions.add("cancelApplication");
    }
    if (order.canRejectTrial) {
      actions.add("rejectTrial");
    }
    if (order.canOpenTrialResult) {
      actions.add("openTrialResult");
    }
    if (role === "student") {
      if (node === "trialScheduled") {
        actions.add("updateTrialAvailability");
      }
      if (node === "serviceConfirming") {
        actions.add("acceptServiceOffer");
        actions.add("rejectServiceOffer");
      }
      if (node === "serviceSchedulePending") {
        actions.add("cancelServiceConfirmation");
      }
      if (node === "formalTutoring") {
        actions.add("requestServiceEnd");
      }
      if (node === "settlementConfirming") {
        actions.add("confirmSettlement");
      }
    }
    if (role === "parent" && node === "formalTutoring" && order.canRequestComplete) {
      actions.add("requestServiceEnd");
    }
  }

  if (candidate && role === "parent") {
    if (node === "trialScheduled") {
      actions.add("rescheduleTrial");
      actions.add("cancelApplication");
    } else if (isApplicationListVisible) {
      actions.add("scheduleTrial");
    }
    if (node === "trialing") {
      actions.add("requestTrialResult");
    }
    if (node === "trialEndRequested") {
      actions.add("confirmTrialEnd");
    }
    if (node === "trialResultProcessing") {
      actions.add("offerTutorService");
      actions.add("closeTrialContinueRecruiting");
    }
    if (isTutorServiceInvalidStatus(candidate.status)) {
      actions.add("offerTutorService");
      actions.add("removeRejectedServiceOffer");
    }
    if (node === "serviceSchedulePending") {
      actions.add("submitServiceSchedule");
    }
    if (node === "serviceConfirming" || node === "serviceSchedulePending") {
      actions.add("cancelServiceConfirmation");
    }
    if (node === "formalTutoring") {
      actions.add("requestServiceEnd");
    }
    if (node === "serviceEndRequested") {
      actions.add("requestServiceEnd");
    }
    if (node === "settlementRevising") {
      actions.add("resubmitSettlement");
    }
  }

  const statusLabels = getTutorTaskStatusLabels(status, role, order?.activeApplicantStatus);

  return {
    availableActions: [...actions],
    can: (action) => actions.has(action),
    displayStatusLabels: statusLabels.length > 0 ? statusLabels : [statusLabel].filter(Boolean),
    isApplicationListVisible,
    isTrialListVisible,
    node,
    statusLabel,
    statusLabels,
    statusTone,
    statusToneClassName: getTutorTaskStatusToneClassName(statusTone)
  };
}
