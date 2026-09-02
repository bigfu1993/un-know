import { FileText, MapPin, Tags } from "lucide-react";

/**
 * EduDemandCard 展示实际用到的最小字段集合：job 列表场景用 TutorTrialJob（字段更全）天然满足；
 * 被其它家教场景（如进行中家教卡片）复用时，按这个更窄的形状适配真实数据即可，不需要凑出完整 TutorTrialJob。
 */
export interface EduDemandCardJob {
  address: string;
  description: string;
  plannedDates: string[];
  publisher: { nickname: string };
  subject: string;
  title: string;
}

/** 试课标记片段，跟后端 tutorWageBudgetLabel 拼接格式保持一致。 */
const TRIAL_REQUIRED_SEGMENT = "需要试课";

/** 家教卡片内的计划日程只读弹窗。 */
function EduJobScheduleView({ onClose, plannedDates }: { onClose: () => void; plannedDates: string[] }) {
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
    </Modal>
  );
}

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

/** 家教兼职默认预算展示：需要试课标记 + 收费文案，供 EduDemandCard 的 budgetSlot 调用方直接组装。 */
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
 * 家教场景通用卡片壳，头部预算区域和底部操作区域均为插槽：消息按钮固定内置在 footer，
 * 计划日程入口默认内置，进行中学生卡片可关闭后改由流程操作区提供统一日程入口；
 * `budgetSlot`（预算展示内容，默认用 `EduJobBudget`）/`footer`（追加操作按钮，如试课申请）
 * 由调用方按具体业务场景装配；`job` 只需满足 `EduDemandCardJob` 的最小字段集合，
 * 兼职列表用完整 TutorTrialJob，其它家教场景（如进行中家教卡片）按需适配真实数据传入即可。
 */
export function EduDemandCard({
  budgetSlot,
  className,
  footer,
  job,
  showScheduleAction = true
}: {
  budgetSlot?: ReactNode;
  className?: string;
  footer?: ReactNode;
  job: EduDemandCardJob;
  /** 是否展示卡片内置的计划日程入口；进行中学生卡片由流程操作区提供统一日程入口。 */
  showScheduleAction?: boolean;
}) {
  const [isScheduleViewOpen, setIsScheduleViewOpen] = useState(false);
  const periodDaysLabel = job.plannedDates.length > 0 ? `${job.plannedDates.length} 天` : "待定";
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
          <div className="edu-job-field-row grid grid-cols-2 gap-[7px]">
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
            className="secondary-button button-inline-layout min-h-[34px] px-[10px] py-[8px]"
            type="button"
          >
            <MessageCircle size={15} /> 消息
          </button>
          {showScheduleAction ? (
            <button
              className="secondary-button accent-text button-inline-layout min-h-[34px] px-[10px] py-[8px]"
              onClick={() => setIsScheduleViewOpen(true)}
              type="button"
            >
              <CalendarDays size={15} /> 日程
            </button>
          ) : null}
          {footer}
        </div>
      </article>
      {showScheduleAction && isScheduleViewOpen ? (
        <EduJobScheduleView onClose={() => setIsScheduleViewOpen(false)} plannedDates={job.plannedDates} />
      ) : null}
    </>
  );
}
