import {
  canConfirmHuntingQuote,
  canCounterHuntingQuote,
  hasInvalidCounterQuoteAmount,
  hasValidCounterQuoteAmount
} from "@pages/Delegation/model";

/** 进行中委托报价流程入参。 */
interface UseOngoingQuoteFlowOptions {
  confirmQuote: (task: HuntingTask, quote: HuntingQuote) => Promise<void>;
  counterQuote: (task: HuntingTask, quote: HuntingQuote, amount: number) => Promise<void>;
  rejectQuote: (task: HuntingTask, quote: HuntingQuote) => Promise<void>;
  showMessage: (content: string, options?: MessageToastOptions) => void;
  tasks: HuntingTask[];
}

/** 进行中入口的委托报价选择、确认、拒绝和协商流程。 */
export function useOngoingQuoteFlow({
  confirmQuote,
  counterQuote,
  rejectQuote,
  showMessage,
  tasks
}: UseOngoingQuoteFlowOptions) {
  const [ongoingQuoteTaskId, setOngoingQuoteTaskId] = useState<string | null>(null);
  const [selectedOngoingQuoteId, setSelectedOngoingQuoteId] = useState("");
  const [quoteCounterAmount, setQuoteCounterAmount] = useState("");
  const ongoingQuoteTask = ongoingQuoteTaskId ? tasks.find((task) => task.id === ongoingQuoteTaskId) ?? null : null;
  const selectedOngoingQuote = ongoingQuoteTask?.quotes?.find((quote) => quote.id === selectedOngoingQuoteId) ?? null;
  const canConfirmSelectedOngoingQuote = canConfirmHuntingQuote(ongoingQuoteTask, selectedOngoingQuote);
  const canCounterSelectedOngoingQuote = canCounterHuntingQuote(ongoingQuoteTask, selectedOngoingQuote);
  const hasCounterInputAmount = hasValidCounterQuoteAmount(selectedOngoingQuote, quoteCounterAmount);
  const hasInvalidCounterAmount = hasInvalidCounterQuoteAmount(selectedOngoingQuote, quoteCounterAmount);
  const isCounterOngoingQuoteAction = canCounterSelectedOngoingQuote && hasCounterInputAmount;
  const canRejectSelectedOngoingQuote = canConfirmSelectedOngoingQuote || canCounterSelectedOngoingQuote;
  const canSubmitSelectedOngoingQuote =
    !hasInvalidCounterAmount && (canConfirmSelectedOngoingQuote || isCounterOngoingQuoteAction);
  const ongoingQuoteActionLabel = isCounterOngoingQuoteAction
    ? "协商报价"
    : selectedOngoingQuote
      ? "确认报价"
      : "选择报价";
  const ongoingQuoteCounterPrompt = ongoingQuoteTask?.isMine
    ? "输入协商金额后推送给报价方"
    : "输入协商金额后推送给发布方";

  /** 从进行中弹窗打开当前委托的报价列表。 */
  function openOngoingQuoteList(order: ClientOrder) {
    const task = tasks.find((item) => item.id === order.id);
    if (!task || !task.quotes || task.quotes.length === 0) {
      showMessage("当前委托暂无可查看报价。", { type: "warning" });
      return;
    }

    const initialQuote =
      order.category === "hunting" && order.quoteId
        ? task.quotes.find((quote) => quote.id === order.quoteId) ?? null
        : null;

    setOngoingQuoteTaskId(task.id);
    setSelectedOngoingQuoteId(initialQuote?.id ?? "");
    setQuoteCounterAmount(initialQuote ? String(initialQuote.amount) : "");
  }

  /** 关闭进行中入口打开的报价列表弹窗。 */
  function closeOngoingQuoteList() {
    setOngoingQuoteTaskId(null);
    setSelectedOngoingQuoteId("");
    setQuoteCounterAmount("");
  }

  /** 选择或取消选择报价。 */
  function selectOngoingQuote(quote: HuntingQuote | null) {
    setSelectedOngoingQuoteId(quote?.id ?? "");
    setQuoteCounterAmount(quote ? String(quote.amount) : "");
  }

  /** 根据输入金额确认报价或发起协商报价。 */
  function submitOngoingQuoteAction() {
    if (!ongoingQuoteTask || !selectedOngoingQuote) {
      return;
    }

    if (isCounterOngoingQuoteAction) {
      const amount = Number(quoteCounterAmount);

      void Promise.resolve(counterQuote(ongoingQuoteTask, selectedOngoingQuote, amount))
        .then(closeOngoingQuoteList)
        .catch(() => undefined);
      return;
    }

    void Promise.resolve(confirmQuote(ongoingQuoteTask, selectedOngoingQuote))
      .then(closeOngoingQuoteList)
      .catch(() => undefined);
  }

  /** 拒绝进行中弹窗内选中的委托报价。 */
  function rejectOngoingQuote() {
    if (!ongoingQuoteTask || !selectedOngoingQuote) {
      return;
    }

    void Promise.resolve(rejectQuote(ongoingQuoteTask, selectedOngoingQuote))
      .then(closeOngoingQuoteList)
      .catch(() => undefined);
  }

  return {
    canRejectSelectedOngoingQuote,
    canSubmitSelectedOngoingQuote,
    closeOngoingQuoteList,
    ongoingQuoteActionLabel,
    ongoingQuoteCounterPrompt,
    ongoingQuoteTask,
    openOngoingQuoteList,
    quoteCounterAmount,
    rejectOngoingQuote,
    selectOngoingQuote,
    selectedOngoingQuoteId,
    setQuoteCounterAmount,
    submitOngoingQuoteAction
  };
}
