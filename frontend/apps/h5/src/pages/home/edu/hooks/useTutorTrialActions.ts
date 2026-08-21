import { getErrorMessage } from "@tools/messageToast";
import { getTutorWorkflowSuccessMessage } from "../model";

/** 家教试课动作 hook 入参。 */
interface UseTutorTrialActionsOptions {
  applyTutorTrial: (demandId: string) => Promise<unknown>;
  cancelTutorDemand: (demandId: string) => Promise<unknown>;
  confirmTutorTrialStart: (applicationId: string) => Promise<unknown>;
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
  confirmTutorTrialStart,
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

  /** 按流程图提交家教流程动作，服务端负责校验当前角色和状态。 */
  async function handleTutorWorkflowActionSubmit(payload: TutorWorkflowActionPayload) {
    try {
      await handleTutorWorkflowAction(payload);
      showMessage(getTutorWorkflowSuccessMessage(payload), { type: "success" });
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
    handleConfirmTutorTrialStart,
    handleRequestTutorTrialEnd,
    handleTutorWorkflowAction: handleTutorWorkflowActionSubmit
  };
}
