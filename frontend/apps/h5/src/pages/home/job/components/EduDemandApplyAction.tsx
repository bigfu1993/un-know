/**
 * 家教兼职试课申请按钮及确认弹窗，从 EduDemandCard 抽离，作为 footer 插槽内容由调用方装配，
 * 使 EduDemandCard 能被非"试课申请"语义的家教兼职场景（如仅查看、其它操作）复用。
 */

/** 试课申请操作内的计划日程确认弹窗。 */
function EduJobScheduleView({
  isApplying,
  onClose,
  onConfirmApply,
  plannedDates
}: {
  isApplying: boolean;
  onClose: () => void;
  onConfirmApply: () => void;
  plannedDates: string[];
}) {
  const [activeDate, setActiveDate] = useState(getDefaultTutorScheduleDate);

  return (
    <Modal
      ariaLabel="家教日程"
      icon={<CalendarDays size={18} />}
      onClose={onClose}
      panelClassName="edu-job-schedule-sheet mx-auto grid max-w-[420px] gap-[12px] px-[14px] pb-[calc(16px+env(safe-area-inset-bottom))] pt-[16px]"
      title={
        <>
          <strong>家教日程</strong>
          <span>{plannedDates.length > 0 ? `共 ${plannedDates.length} 天` : "家长暂未确定具体日期"}</span>
        </>
      }
    >
      {plannedDates.length > 0 ? (
        <ScheduleCalendar
          activeDate={activeDate}
          mode="view"
          onActiveDateChange={setActiveDate}
          plannedDates={plannedDates}
        />
      ) : (
        <p className="notice p-[10px] text-[var(--h5-warning)]">家长暂未确定具体日程，可通过消息与家长确认。</p>
      )}
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
    </Modal>
  );
}

export function EduDemandApplyAction({
  job,
  onApplyTrial,
  role
}: {
  job: TutorTrialJob;
  onApplyTrial?: (job: TutorTrialJob) => Promise<unknown> | unknown;
  role: Role;
}) {
  const [isApplyingTrial, setIsApplyingTrial] = useState(false);
  const [isApplyConfirmOpen, setIsApplyConfirmOpen] = useState(false);

  /** 学生在日程确认弹窗里点击"申请试课"才真正提交，成功后关闭弹窗。 */
  async function handleApplyTrial() {
    if (!onApplyTrial || isApplyingTrial) {
      return;
    }

    setIsApplyingTrial(true);
    try {
      await onApplyTrial(job);
      setIsApplyConfirmOpen(false);
    } finally {
      setIsApplyingTrial(false);
    }
  }

  return (
    <>
      <button
        className="primary-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white disabled:text-[var(--h5-subtle)]"
        disabled={!onApplyTrial || role !== "student"}
        onClick={() => setIsApplyConfirmOpen(true)}
        type="button"
      >
        申请试课
      </button>
      {isApplyConfirmOpen ? (
        <EduJobScheduleView
          isApplying={isApplyingTrial}
          onClose={() => setIsApplyConfirmOpen(false)}
          onConfirmApply={() => void handleApplyTrial()}
          plannedDates={job.plannedDates}
        />
      ) : null}
    </>
  );
}
