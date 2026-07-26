import {
  getTutorTrialStatusLabel,
  isTutorApplicationPendingStatus,
  isTutorApplicationListStatus,
  isTutorTrialListStatus,
  isTutorFormalServiceStatus,
  isTutorServiceConfirmingStatus,
  isTutorServiceInvalidStatus,
  isTutorServiceScheduleConfirmingStatus,
  isTutorServiceSchedulePendingStatus,
  isTutorSettlementStatus,
  isTutorTerminalStatus,
  isTutorTrialConfirmingStatus,
  isTutorTrialEndConfirmingStatus,
  isTutorTrialSettledServicePendingStatus,
  isTutorTrialingStatus,
  isTutorTrialResultProcessingStatus,
  TUTOR_SERVICE_CONFIRMING_STATUS,
  TUTOR_SETTLEMENT_CONFIRMING_STATUS,
  TUTOR_SETTLEMENT_REVISING_STATUS,
  TUTOR_SYSTEM_SETTLING_STATUS
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
  | "requestSettlementRevision"
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
  isApplicationListVisible: boolean;
  isTrialListVisible: boolean;
  node: TutorTaskNode;
  statusLabel: string;
  statusLabels: string[];
  statusTone: TutorTaskStatusTone;
  statusToneClassName: string;
}

/** 从服务端状态文案归一化为家教任务流程节点。 */
export function getTutorTaskNode(status?: string): TutorTaskNode {
  if (isTutorSettlementStatus(status)) {
    if (status?.includes(TUTOR_SETTLEMENT_REVISING_STATUS)) {
      return "settlementRevising";
    }
    if (status?.includes(TUTOR_SYSTEM_SETTLING_STATUS)) {
      return "systemSettling";
    }
    if (status?.includes(TUTOR_SETTLEMENT_CONFIRMING_STATUS)) {
      return "settlementConfirming";
    }
  }
  if (isTutorFormalServiceStatus(status)) {
    return "formalTutoring";
  }
  if (isTutorServiceScheduleConfirmingStatus(status)) {
    return "serviceScheduleConfirming";
  }
  if (isTutorServiceSchedulePendingStatus(status)) {
    return "serviceSchedulePending";
  }
  if (isTutorServiceConfirmingStatus(status)) {
    return "serviceConfirming";
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
  if (status?.includes("家教进行中")) {
    return "formalTutoring";
  }
  if (status?.includes("已取消")) {
    return "cancelled";
  }
  if (status?.includes("已拒绝") || status?.includes("已失效") || status?.includes("正式雇佣失效")) {
    return "rejected";
  }
  if (isTutorTerminalStatus(status) || status?.includes("已结束")) {
    return "ended";
  }
  if (isTutorApplicationPendingStatus(status)) {
    return "applicationPending";
  }

  return status ? "unknown" : "applicationPending";
}

/** 根据流程节点给出家教任务状态样式。 */
export function getTutorTaskStatusTone(node: TutorTaskNode): TutorTaskStatusTone {
  if (node === "trialScheduled" || node === "trialEndRequested" || node === "serviceConfirming") {
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

/** 判断候选人可用时间是否应在当前节点隐藏。 */
export function getTutorTaskCandidateAvailability(candidate: TutorApplicationCandidate) {
  return candidate.availability || "待补充";
}

/** 获取家长端候选卡片状态展示行。 */
export function getTutorTaskStatusLabels(status?: string) {
  if (isTutorServiceInvalidStatus(status)) {
    return ["试课完成", "拒绝正式委托"];
  }
  if (isTutorTrialSettledServicePendingStatus(status)) {
    return ["试课已结算", "等待正式雇佣"];
  }
  if (isTutorServiceConfirmingStatus(status)) {
    return [TUTOR_SERVICE_CONFIRMING_STATUS];
  }

  const statusLabel = getTutorTrialStatusLabel(status);

  return statusLabel ? [statusLabel] : [];
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
    if (order.canRequestCancel) {
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
        actions.add("requestSettlementRevision");
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
    if (node === "settlementRevising") {
      actions.add("resubmitSettlement");
    }
  }

  return {
    availableActions: [...actions],
    can: (action) => actions.has(action),
    isApplicationListVisible,
    isTrialListVisible,
    node,
    statusLabel,
    statusLabels: getTutorTaskStatusLabels(status),
    statusTone,
    statusToneClassName: getTutorTaskStatusToneClassName(statusTone)
  };
}
