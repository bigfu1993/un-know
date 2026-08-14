import { Banknote } from "lucide-react";
import { Modal } from "@ui/Modal";
import {
  canConfirmHuntingQuote,
  canCounterHuntingQuote,
  hasCounterQuoteAmount,
  hasInvalidCounterQuoteAmount,
  hasValidCounterQuoteAmount,
  isQuoteLockedForPublisher
} from "@pages/home/delegation/model";

/** 进行中委托报价处理弹窗属性。 */
interface OngoingQuoteProps {
  initialQuoteId?: string;
  onClose: () => void;
  onConfirmQuote: (task: HuntingTask, quote: HuntingQuote) => Promise<void> | void;
  onCounterQuote: (task: HuntingTask, quote: HuntingQuote, amount: number) => Promise<void> | void;
  onRejectQuote: (task: HuntingTask, quote: HuntingQuote) => Promise<void> | void;
  task: HuntingTask;
}

/** 进行中报价弹窗默认空列表，避免无报价任务重复创建数组。 */
const emptyHuntingQuotes: HuntingQuote[] = [];

/** 进行中入口打开的委托报价列表，负责报价选择、协商金额输入和操作按钮展示。 */
export function OngoingQuote({
  initialQuoteId = "",
  onClose,
  onConfirmQuote,
  onCounterQuote,
  onRejectQuote,
  task
}: OngoingQuoteProps) {
  const quotes = task.quotes ?? emptyHuntingQuotes;
  const initialQuote = initialQuoteId ? quotes.find((quote) => quote.id === initialQuoteId) ?? null : null;
  const quoteSignature = quotes.map((quote) => `${quote.id}:${quote.amount}:${quote.status}`).join("|");
  const [selectedQuoteId, setSelectedQuoteId] = useState(initialQuote?.id ?? "");
  const [counterAmount, setCounterAmount] = useState(initialQuote ? String(initialQuote.amount) : "");
  const selectedQuote = quotes.find((quote) => quote.id === selectedQuoteId) ?? null;
  const canConfirmSelectedQuote = canConfirmHuntingQuote(task, selectedQuote);
  const canCounterSelectedQuote = canCounterHuntingQuote(task, selectedQuote);
  const hasCounterInputAmount = hasValidCounterQuoteAmount(selectedQuote, counterAmount);
  const hasInvalidCounterAmount = hasInvalidCounterQuoteAmount(selectedQuote, counterAmount);
  const isCounterAction = canCounterSelectedQuote && hasCounterInputAmount;
  const canReject = canConfirmSelectedQuote || canCounterSelectedQuote;
  const canSubmit = !hasInvalidCounterAmount && (canConfirmSelectedQuote || isCounterAction);
  const actionLabel = isCounterAction ? "协商报价" : selectedQuote ? "确认报价" : "选择报价";
  const counterPrompt = task.isMine ? "输入协商金额后推送给报价方" : "输入协商金额后推送给发布方";

  useEffect(() => {
    const nextInitialQuote = initialQuoteId ? quotes.find((quote) => quote.id === initialQuoteId) ?? null : null;

    setSelectedQuoteId(nextInitialQuote?.id ?? "");
    setCounterAmount(nextInitialQuote ? String(nextInitialQuote.amount) : "");
  }, [initialQuoteId, quoteSignature, quotes, task.id]);

  /** 选中或取消当前报价，并把协商金额草稿同步为该报价金额。 */
  function handleSelectQuote(quote: HuntingQuote) {
    const isSameQuote = selectedQuoteId === quote.id;

    setSelectedQuoteId(isSameQuote ? "" : quote.id);
    setCounterAmount(isSameQuote ? "" : String(quote.amount));
  }

  /** 根据当前弹窗草稿执行确认报价或协商报价。 */
  async function handleSubmit() {
    if (!selectedQuote || !canSubmit) {
      return;
    }

    try {
      if (isCounterAction) {
        await Promise.resolve(onCounterQuote(task, selectedQuote, Number(counterAmount)));
      } else {
        await Promise.resolve(onConfirmQuote(task, selectedQuote));
      }
      onClose();
    } catch {
      // 业务回调已负责错误提示，弹窗保持打开方便继续处理。
    }
  }

  /** 拒绝当前选中的报价。 */
  async function handleReject() {
    if (!selectedQuote || !canReject) {
      return;
    }

    try {
      await Promise.resolve(onRejectQuote(task, selectedQuote));
      onClose();
    } catch {
      // 业务回调已负责错误提示，弹窗保持打开方便继续处理。
    }
  }

  return (
    <Modal
      ariaLabel="报价列表"
      onClose={onClose}
      panelClassName="delegation-quote-modal mx-auto grid max-w-[420px] gap-[12px] p-[14px]"
      panelElement="div"
    >
      <div className="card-title flex items-center justify-between gap-[10px]">
        <Banknote size={18} />
        <div className="ongoing-quote-title-copy">
          <strong>报价列表</strong>
          <span>{task.title}</span>
        </div>
        <button
          aria-label="关闭"
          className="icon-only grid h-[34px] w-[34px] place-items-center text-[#475466]"
          onClick={onClose}
          type="button"
        >
          <XCircle size={20} />
        </button>
      </div>
      <div className="delegation-quote-list grid gap-[8px]">
        {quotes.map((quote) => {
          const isLockedQuote = isQuoteLockedForPublisher(task, quote);
          const hasQuoteCounterAmount = hasCounterQuoteAmount(quote);

          return (
            <button
              className={`delegation-quote-option grid gap-[5px] p-[10px] text-left ${
                selectedQuoteId === quote.id ? "active" : ""
              } ${isLockedQuote ? "locked" : ""}`}
              disabled={isLockedQuote}
              key={quote.id}
              onClick={() => handleSelectQuote(quote)}
              type="button"
            >
              <span className="flex items-center justify-between gap-[8px]">
                <strong>{quote.bidder.nickname}</strong>
                <span className="delegation-quote-price inline-flex items-center gap-[6px]">
                  {hasQuoteCounterAmount ? <del>{formatCurrency(quote.originalAmount ?? quote.amount)}</del> : null}
                  <em className={hasQuoteCounterAmount ? "counter" : ""}>{formatCurrency(quote.amount)}</em>
                </span>
              </span>
              <span>
                {quote.quoteTime} · {quote.status}
              </span>
            </button>
          );
        })}
        {quotes.length === 0 ? (
          <article className="empty-state p-[14px] text-center">
            <strong>暂无报价</strong>
            <span>有服务方报价后会在这里展示。</span>
          </article>
        ) : null}
      </div>
      <label className="delegation-quote-counter grid gap-[6px]">
        <span>{counterPrompt}</span>
        <input
          inputMode="decimal"
          onChange={(event) => setCounterAmount(event.target.value)}
          placeholder="输入协商金额"
          type="number"
          value={counterAmount}
        />
      </label>
      <div className="delegation-quote-actions grid gap-[8px]">
        <button
          className="primary-button inline-flex min-h-[38px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white disabled:text-[#748092]"
          disabled={!canSubmit}
          onClick={() => void handleSubmit()}
          type="button"
        >
          <CheckCircle2 size={16} />
          {actionLabel}
        </button>
        <button
          className="danger-outline-button inline-flex min-h-[38px] items-center justify-center gap-[5px] px-[10px] py-[8px]"
          disabled={!canReject}
          onClick={() => void handleReject()}
          type="button"
        >
          拒绝报价
        </button>
      </div>
    </Modal>
  );
}
