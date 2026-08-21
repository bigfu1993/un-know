import { useAcceptHuntingTask, useQuoteHuntingTask } from "@unknown/hooks";
import { formatCurrency } from "@shared/clientPageModel";
import { getErrorMessage, showMessage } from "@tools/messageToast";

/** 委托页自主管理接单和报价 mutation，根组件不再中转页面专属动作。 */
export function useCommissionActions() {
  const acceptTaskMutation = useAcceptHuntingTask();
  const quoteTaskMutation = useQuoteHuntingTask();

  /** 接受固定金额委托，服务端负责锁单和押金冻结校验。 */
  async function handleAcceptTask(task: HuntingTask) {
    try {
      await acceptTaskMutation.mutateAsync(task.id);
      showMessage("已接受委托，任务已进入履约中。", { type: "success" });
    } catch (error) {
      showMessage(getErrorMessage(error, "接受委托失败，请稍后重试。"), { type: "error" });
      throw error;
    }
  }

  /** 提交协商金额报价，发布方确认后才会进入履约。 */
  async function handleQuoteTask(task: HuntingTask, amount: number) {
    try {
      await quoteTaskMutation.mutateAsync({ amount, taskId: task.id });
      showMessage(`报价 ${formatCurrency(amount)} 已提交，等待发布方确认。`, { type: "success" });
    } catch (error) {
      showMessage(getErrorMessage(error, "提交报价失败，请稍后重试。"), { type: "error" });
      throw error;
    }
  }

  return { handleAcceptTask, handleQuoteTask };
}
