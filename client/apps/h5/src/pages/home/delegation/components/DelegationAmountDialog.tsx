import { Banknote, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

/** 委托报价金额弹窗属性。 */
interface DelegationAmountDialogProps {
  onClose: () => void;
  onSubmit: (amount: number) => Promise<void> | void;
  task: HuntingTask;
}

/** 委托额度确认弹窗，负责展示当前任务标题和金额输入。 */
export function DelegationAmountDialog({
  onClose,
  onSubmit,
  task
}: DelegationAmountDialogProps) {
  const [amountDraft, setAmountDraft] = useState(() => (task.fee > 0 ? String(task.fee) : ""));
  const [amountError, setAmountError] = useState("");

  useEffect(() => {
    setAmountDraft(task.fee > 0 ? String(task.fee) : "");
    setAmountError("");
  }, [task.fee, task.id]);

  /** 校验组件内部金额草稿，并只向父级提交最终数字。 */
  function handleSubmit() {
    const nextAmount = Number(amountDraft.trim());
    if (!Number.isFinite(nextAmount) || nextAmount <= 0) {
      setAmountError("委托额度必须为大于 0 的数字");
      return;
    }

    setAmountError("");
    void Promise.resolve(onSubmit(nextAmount))
      .then(onClose)
      .catch(() => undefined);
  }

  return (
    <section className="checkout-sheet" aria-label="委托额度确认">
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet-panel delegation-amount-dialog mx-auto grid max-w-[420px] gap-[12px] p-[14px]">
        <div className="card-title flex items-center justify-between gap-[10px]">
          <Banknote size={18} />
          <div>
            <strong>委托额度</strong>
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
        <label className="profile-field publish-field grid gap-[7px]">
          <span>输入报价金额</span>
          <input
            inputMode="decimal"
            onChange={(event) => setAmountDraft(event.target.value)}
            placeholder="请输入本次报价金额"
            type="text"
            value={amountDraft}
          />
          {amountError ? <em>{amountError}</em> : null}
        </label>
        <div className="sheet-actions grid gap-[8px]">
          <button
            className="primary-button inline-flex min-h-[38px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white"
            onClick={handleSubmit}
            type="button"
          >
            <Banknote size={16} />
            提交报价
          </button>
        </div>
      </div>
    </section>
  );
}
