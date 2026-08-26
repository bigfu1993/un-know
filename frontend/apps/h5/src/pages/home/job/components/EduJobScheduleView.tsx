/**
 * 展示家教兼职计划周期的日历弹窗。periodDates 是家长实际选中的完整日期集合（允许不连续），
 * 直接喂给日历高亮，不再用 period（"开始 至 结束"摘要文案）反推日期区间。
 * "日程"按钮触发时不传 onConfirmApply，仅供查看；"申请试课"按钮触发时传入 onConfirmApply，
 * 弹窗底部会出现"取消/申请试课"两个按钮，点击"申请试课"才真正调用接口提交。
 */
export function EduJobScheduleView({
  isApplying = false,
  onClose,
  onConfirmApply,
  periodDates
}: {
  isApplying?: boolean;
  onClose: () => void;
  onConfirmApply?: () => void;
  periodDates: string[];
}) {
  const [activeDate, setActiveDate] = useState(() => getDefaultTutorScheduleDate(periodDates));

  return (
    <Modal
      ariaLabel="家教日程"
      icon={<CalendarDays size={18} />}
      onClose={onClose}
      panelClassName="edu-job-schedule-sheet mx-auto grid max-w-[420px] gap-[12px] px-[14px] pb-[calc(16px+env(safe-area-inset-bottom))] pt-[16px]"
      title={
        <>
          <strong>家教日程</strong>
          <span>{periodDates.length > 0 ? `共 ${periodDates.length} 天` : "家长暂未确定具体日期"}</span>
        </>
      }
    >
      {periodDates.length > 0 ? (
        <ScheduleCalendar
          activeDate={activeDate}
          mode="view"
          onActiveDateChange={setActiveDate}
          selectedDates={periodDates}
        />
      ) : (
        <p className="notice p-[10px] text-[var(--h5-warning)]">家长暂未确定具体日程，可通过消息与家长确认。</p>
      )}
      {onConfirmApply ? (
        <div className="sheet-actions grid grid-cols-2 gap-[8px]">
          <button
            className="ghost-button min-h-[38px] px-[10px] py-[8px]"
            disabled={isApplying}
            onClick={onClose}
            type="button"
          >
            取消
          </button>
          <button
            className="primary-button min-h-[38px] px-[10px] py-[8px] text-white disabled:text-[var(--h5-subtle)]"
            disabled={isApplying}
            onClick={onConfirmApply}
            type="button"
          >
            {isApplying ? "提交中" : "申请试课"}
          </button>
        </div>
      ) : null}
    </Modal>
  );
}
