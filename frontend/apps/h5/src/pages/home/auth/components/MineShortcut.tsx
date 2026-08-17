import { MinePopover } from "./MinePopover";

/** 我的悬浮头像入口属性，外部只负责控制开合和业务动作。 */
export interface MineShortcutProps extends MinePopoverProps {
  isOpen: boolean;
  isQuickDockExpanded: boolean;
  onTrigger: () => void;
}

/** 我的悬浮头像入口，封装头像按钮和对应弹窗。 */
export function MineShortcut({
  isOpen,
  isQuickDockExpanded,
  onTrigger,
  ...popoverProps
}: MineShortcutProps) {
  return (
    <>
      {isOpen ? <MinePopover {...popoverProps} /> : null}

      <button
        className="floating-avatar grid h-[54px] w-[54px] place-items-center text-[#17212b]"
        onClick={onTrigger}
        type="button"
        aria-expanded={isQuickDockExpanded}
        aria-haspopup="dialog"
        aria-label="我的"
      >
        <UserRound size={22} />
      </button>
    </>
  );
}
