/** 进行中委托报价流程入参。 */
interface UseOngoingQuoteFlowOptions {
  showMessage: (content: string, options?: MessageToastOptions) => void;
  tasks: HuntingTask[];
}

/** 进行中入口的委托报价弹窗定位流程，报价表单状态由弹窗内部维护。 */
export function useOngoingQuoteFlow({ showMessage, tasks }: UseOngoingQuoteFlowOptions) {
  const [ongoingQuoteTaskId, setOngoingQuoteTaskId] = useState<string | null>(null);
  const [ongoingQuoteInitialQuoteId, setOngoingQuoteInitialQuoteId] = useState("");
  const ongoingQuoteTask = ongoingQuoteTaskId ? tasks.find((task) => task.id === ongoingQuoteTaskId) ?? null : null;

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
    setOngoingQuoteInitialQuoteId(initialQuote?.id ?? "");
  }

  /** 关闭进行中入口打开的报价列表弹窗。 */
  function closeOngoingQuoteList() {
    setOngoingQuoteTaskId(null);
    setOngoingQuoteInitialQuoteId("");
  }

  return {
    closeOngoingQuoteList,
    ongoingQuoteInitialQuoteId,
    ongoingQuoteTask,
    openOngoingQuoteList
  };
}
