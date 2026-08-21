/** 我的悬浮头像入口，封装头像按钮和对应弹窗。 */
export function MineShortcut({
  children,
  isOpen,
  isQuickDockExpanded,
  onTrigger
}: MineShortcutProps) {
  return (
    <>
      {isOpen ? children : null}

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
