import { getErrorMessage } from "@tools/messageToast";
import { formatCurrency } from "@shared/clientPageModel";

/** 委托报价提交载荷。 */
interface QuoteHuntingTaskPayload {
  amount: number;
  taskId: string;
}

/** 委托报价决策载荷。 */
interface DecideHuntingTaskQuotePayload {
  action: "confirm" | "counter" | "reject";
  amount?: number;
  quoteId: string;
  taskId: string;
}

/** 委托履约动作载荷。 */
interface HuntingTaskFulfillmentActionPayload {
  action: HuntingTaskFulfillmentActionRequest["action"];
  taskId: string;
}

/** 委托任务动作 hook 入参。 */
interface UseHuntingTaskActionsOptions {
  acceptTask: (taskId: string) => Promise<unknown>;
  decideQuote: (payload: DecideHuntingTaskQuotePayload) => Promise<unknown>;
  fulfillmentAction: (payload: HuntingTaskFulfillmentActionPayload) => Promise<unknown>;
  mergedHuntingTasks: HuntingTask[];
  quoteTask: (payload: QuoteHuntingTaskPayload) => Promise<unknown>;
  refetchWorkspace: () => void;
  showMessage: (content: string, options?: MessageToastOptions) => void;
}

/** 委托领取、报价协商和履约动作，集中承接服务端 mutation 与全局提示。 */
export function useHuntingTaskActions({
  acceptTask,
  decideQuote,
  fulfillmentAction,
  mergedHuntingTasks,
  quoteTask,
  refetchWorkspace,
  showMessage
}: UseHuntingTaskActionsOptions) {
  /** 接受固定金额委托，服务端负责锁单和押金冻结校验。 */
  async function handleAcceptHuntingTask(task: HuntingTask) {
    try {
      await acceptTask(task.id);
      showMessage("已接受委托，任务已进入履约中。", { type: "success" });
      refetchWorkspace();
    } catch (error) {
      showMessage(getErrorMessage(error, "接受委托失败，请稍后重试。"), { type: "error" });
      throw error;
    }
  }

  /** 提交协商金额报价，发布方确认后才会进入履约。 */
  async function handleQuoteHuntingTask(task: HuntingTask, amount: number) {
    try {
      await quoteTask({ amount, taskId: task.id });
      showMessage(`报价 ${formatCurrency(amount)} 已提交，等待发布方确认。`, { type: "success" });
      refetchWorkspace();
    } catch (error) {
      showMessage(getErrorMessage(error, "提交报价失败，请稍后重试。"), { type: "error" });
      throw error;
    }
  }

  /** 发布方确认报价，确认成功后委托进入履约中。 */
  async function handleConfirmHuntingQuote(task: HuntingTask, quote: HuntingQuote) {
    try {
      await decideQuote({ action: "confirm", quoteId: quote.id, taskId: task.id });
      showMessage(`已确认 ${quote.bidder.nickname} 的报价，委托进入履约中。`, { type: "success" });
      refetchWorkspace();
    } catch (error) {
      showMessage(getErrorMessage(error, "确认报价失败，请稍后重试。"), { type: "error" });
      throw error;
    }
  }

  /** 拒绝进行中弹窗内选中的委托报价，报价将失效并保留委托待报价状态。 */
  async function handleRejectHuntingQuote(task: HuntingTask, quote: HuntingQuote) {
    try {
      await decideQuote({ action: "reject", quoteId: quote.id, taskId: task.id });
      showMessage("已拒绝报价，委托将继续等待其他报价。", { type: "success" });
      refetchWorkspace();
    } catch (error) {
      showMessage(getErrorMessage(error, "拒绝报价失败，请稍后重试。"), { type: "error" });
      throw error;
    }
  }

  /** 修改报价金额后推送给对方确认。 */
  async function handleCounterHuntingQuote(task: HuntingTask, quote: HuntingQuote, amount: number) {
    try {
      await decideQuote({
        action: "counter",
        amount,
        quoteId: quote.id,
        taskId: task.id
      });
      showMessage("已提交修改后的报价，等待对方确认。", { type: "success" });
      refetchWorkspace();
    } catch (error) {
      showMessage(getErrorMessage(error, "提交修改报价失败，请稍后重试。"), { type: "error" });
      throw error;
    }
  }

  /** 处理履约中委托的取消、完成确认和再次发布动作。 */
  async function handleHuntingTaskFulfillmentAction(
    order: ClientOrder,
    action: HuntingTaskFulfillmentActionRequest["action"]
  ) {
    const actionMessages: Record<HuntingTaskFulfillmentActionRequest["action"], string> = {
      confirm_cancel: "已确认取消委托，已进入订单详情。",
      confirm_complete: "已确认完成委托。",
      republish: "委托已再次发布。",
      request_cancel: "取消委托申请已提交，等待对方确认。",
      request_complete: "完成委托申请已提交，等待发布方确认。"
    };

    try {
      const task = mergedHuntingTasks.find((item) => item.id === order.id);

      if (action === "republish" && task?.fulfillmentAction === "取消待确认") {
        await fulfillmentAction({ action: "confirm_cancel", taskId: order.id });
        await fulfillmentAction({ action: "republish", taskId: order.id });
        showMessage("已取消原委托并重新发布。", { type: "success" });
        refetchWorkspace();
        return;
      }

      await fulfillmentAction({ action, taskId: order.id });
      showMessage(actionMessages[action], { type: "success" });
      refetchWorkspace();
    } catch (error) {
      showMessage(getErrorMessage(error, "委托履约操作失败，请稍后重试。"), { type: "error" });
      throw error;
    }
  }

  return {
    handleAcceptHuntingTask,
    handleConfirmHuntingQuote,
    handleCounterHuntingQuote,
    handleHuntingTaskFulfillmentAction,
    handleQuoteHuntingTask,
    handleRejectHuntingQuote
  };
}
