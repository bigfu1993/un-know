/** 进行中快捷按钮属性，仅维护悬浮入口自身状态。 */
export interface OngoingShortcutProps {
  hasPaymentRisk: boolean;
  isOpen: boolean;
  onOpen: () => void;
  orderCount: number;
}

/** 进行中快捷按钮，弹窗由上层悬浮模块作为同级组件管理。 */
export function OngoingShortcut({ hasPaymentRisk, isOpen, onOpen, orderCount }: OngoingShortcutProps) {
  const buttonClassName = `quick-action-button quick-action-order order-shortcut grid h-[46px] w-[46px] place-items-center font-extrabold text-white ${
    hasPaymentRisk ? "danger" : ""
  }`;

  return (
    <button
      className={buttonClassName}
      onClick={onOpen}
      type="button"
      aria-expanded={isOpen}
      aria-haspopup="dialog"
      aria-label="查看进行中事项"
    >
      <PackageCheck size={18} />
      <span className="quick-action-badge">{orderCount}</span>
    </button>
  );
}
