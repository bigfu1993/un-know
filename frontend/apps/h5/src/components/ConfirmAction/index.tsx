import "./index.less";
import { AlertTriangle } from "lucide-react";

/** 二次确认弹窗属性，用于高风险或不可直接撤销的业务动作。 */
export interface ConfirmActionProps {
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
export function ConfirmAction({
  cancelLabel = "返回",
  confirmLabel = "确认",
  description,
  isConfirming = false,
  onClose,
  onConfirm,
  title,
  tone = "danger"
}: ConfirmActionProps) {
  return (
    <Modal
      ariaLabel={title}
      icon={<AlertTriangle className={tone === "danger" ? "danger" : ""} size={18} />}
      onClose={onClose}
      panelClassName="confirm-action-modal mx-auto grid max-w-[540px] gap-[12px] px-[14px] pb-[calc(16px+env(safe-area-inset-bottom))] pt-[16px]"
      title={
        <>
          <strong>{title}</strong>
          <span>{description}</span>
        </>
      }
    >
      <div className="sheet-actions grid grid-cols-2 gap-[8px]">
        <button className="ghost-button min-h-[38px] px-[10px] py-[8px]" disabled={isConfirming} onClick={onClose} type="button">
          {cancelLabel}
        </button>
        <button
          className={`primary-button min-h-[38px] px-[10px] py-[8px] text-white disabled:text-[var(--h5-subtle)] ${
            tone === "danger" ? "danger" : ""
          }`}
          disabled={isConfirming}
          onClick={onConfirm}
          type="button"
        >
          {isConfirming ? "处理中" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
