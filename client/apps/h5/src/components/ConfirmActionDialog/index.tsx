import "./index.less";
import { AlertTriangle, XCircle } from "lucide-react";

/** 二次确认弹窗属性，用于高风险或不可直接撤销的业务动作。 */
export interface ConfirmActionDialogProps {
  cancelLabel?: string;
  confirmLabel?: string;
  description: string;
  isConfirming?: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  tone?: "danger" | "default";
}

/** 轻量业务动作二次确认弹窗。 */
export function ConfirmActionDialog({
  cancelLabel = "返回",
  confirmLabel = "确认",
  description,
  isConfirming = false,
  onClose,
  onConfirm,
  title,
  tone = "default"
}: ConfirmActionDialogProps) {
  return (
    <section className="checkout-sheet" aria-label={title}>
      <div className="sheet-backdrop" onClick={onClose} />
      <article className="sheet-panel confirm-action-dialog mx-auto grid max-w-[540px] gap-[12px] px-[14px] pb-[calc(16px+env(safe-area-inset-bottom))] pt-[16px]">
        <div className="card-title flex items-center justify-between gap-[10px]">
          <AlertTriangle className={tone === "danger" ? "danger" : ""} size={18} />
          <div>
            <strong>{title}</strong>
            <span>{description}</span>
          </div>
          <button aria-label="关闭" className="icon-only grid h-[34px] w-[34px] place-items-center text-[#475466]" onClick={onClose} type="button">
            <XCircle size={20} />
          </button>
        </div>

        <div className="sheet-actions grid grid-cols-2 gap-[8px]">
          <button className="ghost-button min-h-[38px] px-[10px] py-[8px]" disabled={isConfirming} onClick={onClose} type="button">
            {cancelLabel}
          </button>
          <button
            className={`primary-button min-h-[38px] px-[10px] py-[8px] text-white disabled:text-[#748092] ${
              tone === "danger" ? "danger" : ""
            }`}
            disabled={isConfirming}
            onClick={onConfirm}
            type="button"
          >
            {isConfirming ? "处理中" : confirmLabel}
          </button>
        </div>
      </article>
    </section>
  );
}
