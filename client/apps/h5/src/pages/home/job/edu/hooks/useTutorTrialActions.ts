import { getErrorMessage } from "@tools/messageToast";

/** 家教试课申请载荷。 */
interface ApplyTutorTrialPayload {
  availability: string;
  demandId: string;
  message?: string;
}

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
  hireTutor: boolean;
  tutorSchedule?: string;
}

/** 家教流程动作载荷，由前端按钮按流程图节点传入。 */
interface TutorWorkflowActionPayload extends TutorWorkflowActionRequest {
  applicationId: string;
  demandId?: string;
}

/** 家教试课动作 hook 入参。 */
interface UseTutorTrialActionsOptions {
  applyTutorTrial: (payload: ApplyTutorTrialPayload) => Promise<unknown>;
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
  /** 学生端提交家教试课申请，申请记录由服务端进入进行中列表。 */
  async function handleApplyTutorTrial(job: TutorTrialJob, availability: string) {
    try {
      if (!availability.trim()) {
        showMessage("请先选择可试课时间。", { type: "warning" });
        return false;
      }

      await applyTutorTrial({ availability, demandId: job.id, message: "申请试课" });
      openOngoingOrders();
      showMessage("试课申请已提交，可在进行中查看状态。", { type: "success" });
      refetchWorkspace();
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

  /** 学生提交结束试课确认，等待家长同意。 */
  async function handleRequestTutorTrialEnd(order: ClientOrder) {
    try {
      await requestTutorTrialEnd(order.id);
      showMessage("结束试课确认已提交，等待家长确认。", { type: "success" });
      refetchWorkspace();
    } catch (error) {
      showMessage(getErrorMessage(error, "提交结束试课确认失败，请稍后重试。"), { type: "error" });
    }
  }

  /** 家长同意结束试课，并按选择结果继续招募或进入正式家教。 */
  async function handleCompleteTutorTrialEnd(payload: CompleteTutorTrialEndPayload) {
    try {
      await completeTutorTrialEnd(payload);
      closeTutorTrialList();
      showMessage(payload.hireTutor ? "已提交正式雇佣确认，等待学生确认。" : "试课已结束，家教兼职继续招募。", {
        type: "success"
      });
      refetchWorkspace();
    } catch (error) {
      showMessage(getErrorMessage(error, "结束试课确认处理失败，请稍后重试。"), { type: "error" });
    }
  }

  /** 按流程图提交家教流程动作，服务端负责校验当前角色和状态。 */
  async function handleTutorWorkflowActionSubmit(payload: TutorWorkflowActionPayload) {
    try {
      await handleTutorWorkflowAction(payload);
      const successMessages: Partial<Record<TutorWorkflowAction, string>> = {
        accept_service_offer: "已同意正式雇佣，等待家长提交兼职日程。",
        cancel_trial: "已取消试课。",
        close_trial_continue_recruiting: "本次试课已结束，家教兼职继续招募。",
        confirm_service_schedule: "已确认兼职日程，正式家教服务开始。",
        confirm_settlement: "已确认结算，家教流程结束。",
        confirm_trial_end: "已确认结束试课，请继续处理试课结果。",
        offer_service: "已发起正式雇佣确认，等待学生确认。",
        reject_service_offer: "已拒绝正式雇佣。",
        reject_service_offer_salary: "已反馈薪资原因，等待家长重新发起正式雇佣确认。",
        reject_trial: "已拒绝试课申请。",
        request_service_end: "已发起结束家教，等待结算确认。",
        request_service_schedule_change: "已要求调整兼职日程，等待家长重新提交。",
        request_settlement_revision: "已要求修改结算金额。",
        request_trial_result: "试课已进入结果处理。",
        request_trial_settlement: "已发起结算确认，等待学生确认。",
        resubmit_settlement: "已重新提交结算确认。",
        submit_service_schedule: "兼职日程已提交，等待学生确认。",
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

  /** 家长端取消尚未安排试课的家教兼职，后端会将记录保留到兼职订单历史。 */
  async function handleCancelTutorDemand(order: ClientOrder) {
    try {
      await cancelTutorDemand(order.id);
      showMessage("家教兼职已取消，已移入我的订单。", { type: "success" });
      refetchWorkspace();
    } catch (error) {
      showMessage(getErrorMessage(error, "家教兼职取消失败，请稍后重试。"), { type: "error" });
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
