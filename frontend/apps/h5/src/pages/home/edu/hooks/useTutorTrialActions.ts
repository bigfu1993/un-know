import { getErrorMessage } from "@tools/messageToast";

/** 家长端确认试课安排载荷。 */
interface ConfirmTutorTrialPayload {
  applicationId: string;
  demandId: string;
  trialEnd: string;
  trialHalfDay: string;
  trialStart: string;
}

/** 家长处理结束试课确认的载荷。 */
interface CompleteTutorTrialEndPayload {
  applicationId: string;
  demandId: string;
  hireTutor?: boolean;
  trialFee: number;
  tutorSchedule?: string;
}

/** 家教流程动作载荷，由前端按钮按流程图节点传入。 */
interface TutorWorkflowActionPayload extends TutorWorkflowActionRequest {
  applicationId: string;
  demandId?: string;
}

/** 家教试课动作 hook 入参。 */
interface UseTutorTrialActionsOptions {
  applyTutorTrial: (demandId: string) => Promise<unknown>;
  cancelTutorDemand: (demandId: string) => Promise<unknown>;
  closeTutorApplications: () => void;
  closeTutorTrialList: () => void;
  completeTutorTrialEnd: (payload: CompleteTutorTrialEndPayload) => Promise<unknown>;
  confirmTutorTrialStart: (applicationId: string) => Promise<unknown>;
  confirmTutorTrial: (payload: ConfirmTutorTrialPayload) => Promise<unknown>;
  handleTutorWorkflowAction: (payload: TutorWorkflowActionPayload) => Promise<unknown>;
  openOngoingOrders: () => void;
  refetchWorkspace: () => void;
  requestTutorTrialEnd: (applicationId: string) => Promise<unknown>;
  showMessage: (content: string, options?: MessageToastOptions) => void;
}

/** 根据结算时是否已选择正式雇佣，生成家长端流程反馈文案。 */
function getTrialSettlementSuccessMessage(payload: TutorWorkflowActionPayload) {
  if (payload.hireTutor === true) {
    return "试课费用已提交，学生确认后将进入正式雇佣确认。";
  }
  if (payload.hireTutor === false) {
    return "试课费用已提交，学生确认后将结束本次试课。";
  }

  return "试课费用已提交，等待学生确认。";
}

/** 学生端家教试课申请动作，集中承接服务端提交和全局反馈。 */
export function useTutorTrialActions({
  applyTutorTrial,
  cancelTutorDemand,
  closeTutorApplications,
  closeTutorTrialList,
  completeTutorTrialEnd,
  confirmTutorTrialStart,
  confirmTutorTrial,
  handleTutorWorkflowAction,
  openOngoingOrders,
  refetchWorkspace,
  requestTutorTrialEnd,
  showMessage
}: UseTutorTrialActionsOptions) {
  /**
   * 学生端直接提交家教试课申请，不再要求先选可试课时间，也不需要额外 payload。
   * 申请记录由服务端并入进行中列表，mutation 自己的 onSuccess 已经会刷新进行中数据，
   * 这里不再重复调用 refetchWorkspace，避免多打一次接口。
   */
  async function handleApplyTutorTrial(job: TutorTrialJob) {
    try {
      await applyTutorTrial(job.id);
      openOngoingOrders();
      showMessage("试课申请已提交，可在进行中查看状态。", { type: "success" });
      return true;
    } catch (error) {
      showMessage(getErrorMessage(error, "试课申请提交失败，请稍后重试。"), { type: "error" });
      return false;
    }
  }

  /** 家长端确认试课安排，提交后学生端进行中卡片才展示试课安排入口。 */
  async function handleConfirmTutorTrial(payload: ConfirmTutorTrialPayload) {
    try {
      await confirmTutorTrial(payload);
      closeTutorApplications();
      showMessage("试课安排已提交，学生端可在进行中查看试课安排。", { type: "success" });
      refetchWorkspace();
    } catch (error) {
      showMessage(getErrorMessage(error, "试课安排提交失败，请稍后重试。"), { type: "error" });
    }
  }

  /** 学生确认家长提交的试课安排，确认后状态进入试课中。 */
  async function handleConfirmTutorTrialStart(order: ClientOrder) {
    try {
      await confirmTutorTrialStart(order.id);
      showMessage("已确认试课，家教试课进入试课中。", { type: "success" });
      refetchWorkspace();
    } catch (error) {
      showMessage(getErrorMessage(error, "确认试课失败，请稍后重试。"), { type: "error" });
    }
  }

  /** 学生发起结束试课，等待家长确认结算。 */
  async function handleRequestTutorTrialEnd(order: ClientOrder) {
    try {
      await requestTutorTrialEnd(order.id);
      showMessage("结束试课确认已提交，等待家长确认。", { type: "success" });
      refetchWorkspace();
    } catch (error) {
      showMessage(getErrorMessage(error, "结束试课失败，请稍后重试。"), { type: "error" });
    }
  }

  /** 兼容旧入口处理结束试课，服务端会先进入学生费用确认。 */
  async function handleCompleteTutorTrialEnd(payload: CompleteTutorTrialEndPayload) {
    try {
      await completeTutorTrialEnd(payload);
      closeTutorTrialList();
      showMessage("试课费用已提交，等待学生确认。", { type: "success" });
      refetchWorkspace();
    } catch (error) {
      showMessage(getErrorMessage(error, "结束试课确认处理失败，请稍后重试。"), { type: "error" });
    }
  }

  /** 按流程图提交家教流程动作，服务端负责校验当前角色和状态。 */
  async function handleTutorWorkflowActionSubmit(payload: TutorWorkflowActionPayload) {
    try {
      await handleTutorWorkflowAction(payload);
      const trialSettlementMessage = getTrialSettlementSuccessMessage(payload);
      const successMessages: Partial<Record<TutorWorkflowAction, string>> = {
        accept_service_offer: "已同意正式雇佣，可家教日期已提交，家教兼职已进入进行中。",
        cancel_trial: "已取消试课。",
        cancel_service_confirmation: "已取消兼职确认，流程已回到试课结算阶段。",
        close_trial_end_demand: "本次试课已结束，家教兼职已结束。",
        close_trial_continue_recruiting: "已选择不正式雇佣，本次试课已结束。",
        confirm_service_schedule: "正式雇佣已确认。",
        confirm_settlement: "已确认结算，流程已更新。",
        confirm_trial_end: trialSettlementMessage,
        offer_service: "已发起正式雇佣确认，等待学生确认。",
        reject_service_offer: "已拒绝正式雇佣。",
        reject_service_offer_salary: "已反馈薪资原因，等待家长重新发起正式雇佣确认。",
        reject_trial: "已拒绝试课申请。",
        request_service_end: payload.trialFee === undefined ? "已提交结束申请，等待家长确认结算。" : "结算金额已提交，家教主任务已结束。",
        request_service_schedule_change: "可家教日期已重新提交，等待家长重新制定正式雇佣日程。",
        remove_rejected_service_offer: "已移除拒绝正式委托的记录。",
        request_settlement_revision: "已要求修改结算金额。",
        request_trial_result: trialSettlementMessage,
        request_trial_settlement: "已发起结算确认，等待学生确认。",
        resubmit_settlement: "已重新提交结算确认。",
        submit_service_schedule: "正式雇佣日程已提交，正式雇佣开始。",
        update_trial_availability: "已回到申请试课中，等待家长重新处理。"
      };
      showMessage(successMessages[payload.action] ?? "家教流程已更新。", { type: "success" });
      refetchWorkspace();
      return true;
    } catch (error) {
      showMessage(getErrorMessage(error, "家教流程处理失败，请稍后重试。"), { type: "error" });
      return false;
    }
  }

  /** 家长端取消发布尚未安排试课的家教兼职，后端会让主任务回到待发布状态。 */
  async function handleCancelTutorDemand(order: ClientOrder) {
    try {
      await cancelTutorDemand(order.id);
      showMessage("家教兼职已取消发布，已回到待发布状态。", { type: "success" });
      refetchWorkspace();
    } catch (error) {
      showMessage(getErrorMessage(error, "家教兼职取消发布失败，请稍后重试。"), { type: "error" });
    }
  }

  return {
    handleApplyTutorTrial,
    handleCancelTutorDemand,
    handleCompleteTutorTrialEnd,
    handleConfirmTutorTrial,
    handleConfirmTutorTrialStart,
    handleRequestTutorTrialEnd,
    handleTutorWorkflowAction: handleTutorWorkflowActionSubmit
  };
}
