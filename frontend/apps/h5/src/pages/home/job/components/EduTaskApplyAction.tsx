import { EduJobScheduleView } from "./EduJobScheduleView";

/**
 * 家教兼职试课申请按钮及确认弹窗，从 EduTaskCard 抽离，作为 footer 插槽内容由调用方装配，
 * 使 EduTaskCard 能被非"试课申请"语义的家教兼职场景（如仅查看、其它操作）复用。
 */
export function EduTaskApplyAction({
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
          periodDates={job.periodDates}
        />
      ) : null}
    </>
  );
}
