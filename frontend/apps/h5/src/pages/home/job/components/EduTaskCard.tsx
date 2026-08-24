import { FileText, MapPin, Tags } from "lucide-react";

/**
 * EduTaskCard 展示实际用到的最小字段集合：job 列表场景用 TutorTrialJob（字段更全）天然满足；
 * 被其它家教场景（如进行中家教卡片）复用时，按这个更窄的形状适配真实数据即可，不需要凑出完整 TutorTrialJob。
 */
export interface EduTaskCardJob {
  address: string;
  description: string;
  periodDates: string[];
  publisher: { nickname: string };
  subject: string;
  title: string;
}

/** 试课标记片段，跟后端 tutorWageBudgetLabel 拼接格式保持一致。 */
const TRIAL_REQUIRED_SEGMENT = "需要试课";

/**
 * 解析家教兼职的预算文案，拆出"是否试课"和"收费"两部分。
 * 后端按 " · " 拼接为「付费类型 · ¥金额/单位 · 需要试课」（金额可选、试课标记可选）；
 * 按小时/按天场景金额段已经带了单位，付费类型文字是冗余信息，直接丢弃只保留金额段；
 * 汇总结算等没有金额单位的场景，付费类型文字本身就是唯一的收费信息，原样保留。
 */
function parseTutorTrialJobBudget(budget: string) {
  const segments = budget.split(" · ").filter(Boolean);
  const isTrialRequired = segments.includes(TRIAL_REQUIRED_SEGMENT);
  const feeSegments = segments.filter((segment) => segment !== TRIAL_REQUIRED_SEGMENT);

  return {
    feeLabel: feeSegments.length > 1 ? feeSegments[feeSegments.length - 1] : feeSegments[0] || "",
    isTrialRequired
  };
}

/** 家教兼职默认预算展示：需要试课标记 + 收费文案，供 EduTaskCard 的 budgetSlot 调用方直接组装。 */
export function EduJobBudget({ job }: { job: TutorTrialJob }) {
  const { feeLabel, isTrialRequired } = parseTutorTrialJobBudget(job.budget);

  return (
    <>
      {isTrialRequired ? <span className="edu-job-trial-badge">需要试课</span> : null}
      <em>{feeLabel}</em>
    </>
  );
}

/**
 * 展示家教兼职计划周期的日历弹窗。periodDates 是家长实际选中的完整日期集合（允许不连续），
 * 直接喂给日历高亮，不再用 period（"开始 至 结束"摘要文案）反推日期区间。
 * "日程"按钮触发时不传 onConfirmApply，仅供查看；"申请试课"按钮触发时传入 onConfirmApply，
 * 弹窗底部会出现"取消/申请试课"两个按钮，点击"申请试课"才真正调用接口提交。
 */
function EduJobScheduleView({
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

/**
 * 家教兼职试课申请按钮及确认弹窗，从 EduTaskCard 抽离，作为 footer 插槽内容由调用方装配，
 * 使 EduTaskCard 能被非"试课申请"语义的家教兼职场景（如仅查看、其它操作）复用。
 */
export function EduTrialApplyAction({
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

/**
 * 家教场景通用卡片壳，头部预算区域和底部操作区域均为插槽：日程/消息按钮固定内置在 footer，
 * `budgetSlot`（预算展示内容，默认用 `EduJobBudget`）/`footer`（追加操作按钮，如试课申请）
 * 由调用方按具体业务场景装配；`job` 只需满足 `EduTaskCardJob` 的最小字段集合，
 * 兼职列表用完整 TutorTrialJob，其它家教场景（如进行中家教卡片）按需适配真实数据传入即可。
 */
export function EduTaskCard({
  budgetSlot,
  className,
  footer,
  job
}: {
  budgetSlot?: ReactNode;
  className?: string;
  footer?: ReactNode;
  job: EduTaskCardJob;
}) {
  const [isScheduleViewOpen, setIsScheduleViewOpen] = useState(false);
  const periodDaysLabel = job.periodDates.length > 0 ? `${job.periodDates.length} 天` : "待定";
  const rootClassName = ["flow-card", "edu-job-card-container", "grid", "gap-[6px]", "p-[14px]", className]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <article className={rootClassName}>
        <div className="edu-job-card-header card-title flex items-center justify-between gap-[10px]">
          <GraduationCap size={18} />
          <div className="edu-job-title-copy min-w-0 flex-1">
            <strong>{job.title}</strong>
            <span>{job.publisher.nickname}</span>
          </div>
          <div className="edu-job-budget grid gap-[2px] text-right">{budgetSlot}</div>
        </div>
        <div className="edu-job-card-content job-task-fields grid gap-[7px]">
          <div className="grid grid-cols-2 gap-[7px]">
            <span>
              <Tags size={14} />
              学科：{job.subject}
            </span>
            <span>
              <CalendarClock size={14} />
              时间：{periodDaysLabel}
            </span>
          </div>
          <span>
            <MapPin size={14} />
            位置：{job.address}
          </span>
          <span>
            <FileText size={14} />
            描述：{job.description}
          </span>
        </div>
        <div className="edu-job-card-footer flex flex-wrap items-center gap-[8px]">
          <button
            className="secondary-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px]"
            type="button"
          >
            <MessageCircle size={15} /> 消息
          </button>
          <button
            className="secondary-button accent-text inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px]"
            onClick={() => setIsScheduleViewOpen(true)}
            type="button"
          >
            <CalendarDays size={15} /> 日程
          </button>
          {footer}
        </div>
      </article>
      {isScheduleViewOpen ? (
        <EduJobScheduleView onClose={() => setIsScheduleViewOpen(false)} periodDates={job.periodDates} />
      ) : null}
    </>
  );
}
