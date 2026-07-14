import { Banknote } from "lucide-react";
import { hasCounterQuoteAmount, isQuoteLockedForPublisher } from "@pages/Delegation/model";

/** 进行中委托报价处理弹窗属性。 */
interface OngoingQuoteDialogProps {
  actionLabel: string;
  canReject: boolean;
  canSubmit: boolean;
  counterAmount: string;
  counterPrompt: string;
  onClose: () => void;
  onCounterAmountChange: (value: string) => void;
  onReject: () => void;
  onSelectQuote: (quote: HuntingQuote | null) => void;
  onSubmit: () => void;
  selectedQuoteId: string;
  task: HuntingTask;
}

/** 进行中入口打开的委托报价列表，负责报价选择、协商金额输入和操作按钮展示。 */
export function OngoingQuoteDialog({
  actionLabel,
  canReject,
  canSubmit,
  counterAmount,
  counterPrompt,
  onClose,
  onCounterAmountChange,
  onReject,
  onSelectQuote,
  onSubmit,
  selectedQuoteId,
  task
}: OngoingQuoteDialogProps) {
  const quotes = task.quotes ?? [];

  return (
    <section className="checkout-sheet" aria-label="报价列表">
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet-panel delegation-quote-dialog mx-auto grid max-w-[420px] gap-[12px] p-[14px]">
        <div className="card-title flex items-center justify-between gap-[10px]">
          <Banknote size={18} />
          <div>
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
                onClick={() => onSelectQuote(selectedQuoteId === quote.id ? null : quote)}
                type="button"
              >
                <span className="flex items-center justify-between gap-[8px]">
                  <strong>{quote.bidderName}</strong>
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
            onChange={(event) => onCounterAmountChange(event.target.value)}
            placeholder="输入协商金额"
            type="number"
            value={counterAmount}
          />
        </label>
        <div className="delegation-quote-actions grid gap-[8px]">
          <button
            className="primary-button inline-flex min-h-[38px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white disabled:text-[#748092]"
            disabled={!canSubmit}
            onClick={onSubmit}
            type="button"
          >
            <CheckCircle2 size={16} />
            {actionLabel}
          </button>
          <button
            className="danger-outline-button inline-flex min-h-[38px] items-center justify-center gap-[5px] px-[10px] py-[8px]"
            disabled={!canReject}
            onClick={onReject}
            type="button"
          >
            拒绝报价
          </button>
        </div>
      </div>
    </section>
  );
}
