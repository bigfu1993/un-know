import { getErrorMessage } from "@tools/messageToast";

/** 家教试课申请载荷。 */
interface ApplyTutorTrialPayload {
  demandId: string;
  message: string;
}

/** 家长端确认试课安排载荷。 */
interface ConfirmTutorTrialPayload {
  applicationId: string;
  demandId: string;
  trialEnd: string;
  trialHalfDay: string;
  trialStart: string;
}

/** 家教试课动作 hook 入参。 */
interface UseTutorTrialActionsOptions {
  applyTutorTrial: (payload: ApplyTutorTrialPayload) => Promise<unknown>;
  closeTutorApplications: () => void;
  confirmTutorTrial: (payload: ConfirmTutorTrialPayload) => Promise<unknown>;
  openOngoingOrders: () => void;
  refetchWorkspace: () => void;
  showMessage: (content: string, options?: MessageToastOptions) => void;
}

/** 学生端家教试课申请动作，集中承接服务端提交和全局反馈。 */
export function useTutorTrialActions({
  applyTutorTrial,
  closeTutorApplications,
  confirmTutorTrial,
  openOngoingOrders,
  refetchWorkspace,
  showMessage
}: UseTutorTrialActionsOptions) {
  /** 学生端提交家教试课申请，申请记录由服务端进入进行中列表。 */
  async function handleApplyTutorTrial(job: TutorTrialJob) {
    try {
      await applyTutorTrial({ demandId: job.id, message: "申请试课" });
      openOngoingOrders();
      showMessage("试课申请已提交，可在进行中查看状态。", { type: "success" });
      refetchWorkspace();
    } catch (error) {
      showMessage(getErrorMessage(error, "试课申请提交失败，请稍后重试。"), { type: "error" });
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

  return {
    handleApplyTutorTrial,
    handleConfirmTutorTrial
  };
}
