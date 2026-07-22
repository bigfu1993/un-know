import {
  getTutorTrialStatusLabel,
  isTutorApplicationPendingStatus,
  isTutorApplicationListStatus,
  isTutorTrialConfirmingStatus,
  isTutorTrialEndConfirmingStatus,
  isTutorTrialingStatus
} from "@tools/tutorTrial";

/** 家教任务流程节点，前端只做展示和动作编排，真实迁移以服务端状态为准。 */
export type TutorTaskNode =
  | "applicationPending"
  | "trialScheduled"
  | "trialing"
  | "trialEndRequested"
  | "tutoring"
  | "ended"
  | "cancelled"
  | "rejected"
  | "unknown";

/** 家教任务可触发事件，事件执行仍由业务 hook 调用真实接口。 */
export type TutorTaskAction =
  | "call"
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
  | "cancelDemand"
  | "rejectTrial"
  | "agreeTrial"
  | "openTrialResult";

/** 家教任务状态视觉语义。 */
export type TutorTaskStatusTone = "default" | "trialConfirming" | "trialing";

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
  statusTone: TutorTaskStatusTone;
  statusToneClassName: string;
}

/** 从服务端状态文案归一化为家教任务流程节点。 */
export function getTutorTaskNode(status?: string): TutorTaskNode {
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
    return "tutoring";
  }
  if (status?.includes("已取消")) {
    return "cancelled";
  }
  if (status?.includes("已拒绝")) {
    return "rejected";
  }
  if (status?.includes("已结束")) {
    return "ended";
  }
  if (isTutorApplicationPendingStatus(status)) {
    return "applicationPending";
  }

  return status ? "unknown" : "applicationPending";
}

/** 根据流程节点给出家教任务状态样式。 */
export function getTutorTaskStatusTone(node: TutorTaskNode): TutorTaskStatusTone {
  if (node === "trialScheduled" || node === "trialEndRequested") {
    return "trialConfirming";
  }
  if (node === "trialing") {
    return "trialing";
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

  return "";
}

/** 判断候选人可用时间是否应在当前节点隐藏。 */
export function getTutorTaskCandidateAvailability(candidate: TutorApplicationCandidate) {
  const task = createTutorTaskModel({ candidate, role: "parent" });

  return task.node === "trialScheduled" ? "待补充" : candidate.availability || "待补充";
}

/** 创建家教任务纯模型，供订单卡片、申请列表和试课列表统一消费。 */
export function createTutorTaskModel({ candidate, order, role }: TutorTaskModelOptions): TutorTaskModel {
  const status = order?.status ?? candidate?.status;
  const node = getTutorTaskNode(status);
  const statusTone = getTutorTaskStatusTone(node);
  const isApplicationListVisible = candidate ? isTutorApplicationListStatus(candidate.status) : false;
  const isTrialListVisible = node === "trialing" || node === "trialEndRequested";
  const actions = new Set<TutorTaskAction>();

  if (order) {
    if (order.canCall) {
      actions.add("call");
    }
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
    if (order.canCancelTutorApplication && node === "applicationPending") {
      actions.add("cancelApplication");
    }
    if (order.canRejectTrial) {
      actions.add("rejectTrial");
    }
    if (order.canOpenTrialResult) {
      actions.add("openTrialResult");
    }
  }

  if (candidate && role === "parent") {
    if (node === "trialScheduled") {
      actions.add("rescheduleTrial");
    } else if (isApplicationListVisible) {
      actions.add("scheduleTrial");
    }
    if (node === "trialEndRequested") {
      actions.add("completeTrialEnd");
    }
  }

  return {
    availableActions: [...actions],
    can: (action) => actions.has(action),
    isApplicationListVisible,
    isTrialListVisible,
    node,
    statusLabel: getTutorTrialStatusLabel(status),
    statusTone,
    statusToneClassName: getTutorTaskStatusToneClassName(statusTone)
  };
}
