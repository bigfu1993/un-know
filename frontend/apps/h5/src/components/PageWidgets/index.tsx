import { TutorTrialSchedule } from "@components/TutorTrialSchedule";
import type { TrialScheduleValue } from "@components/TutorTrialSchedule/model";

/** 业务页面标题栏属性。 */
interface SectionHeaderProps {
  countText?: string;
  eyebrow?: string;
  title: string;
}

/** 工作台指标字段。 */
interface WorkbenchMetricItem {
  label: string;
  value: string;
}

/** 工作台快捷入口字段。 */
interface WorkbenchQuickEntryItem {
  icon: LucideIcon;
  label: string;
  text: string;
}

/** 工作台信息卡片属性。 */
interface WorkbenchInfoCardProps {
  description: string;
  icon: LucideIcon;
  metrics?: WorkbenchMetricItem[];
  title: string;
  variant?: "default" | "large";
}

/** 工作台快捷入口卡片属性。 */
interface WorkbenchQuickEntryCardProps {
  description: string;
  entries?: WorkbenchQuickEntryItem[];
  icon: LucideIcon;
  title?: string;
}

/** 默认空指标列表，避免组件默认值创建新数组。 */
const emptyWorkbenchMetrics: WorkbenchMetricItem[] = [];

/** 默认空快捷入口列表，避免组件默认值创建新数组。 */
const emptyWorkbenchQuickEntries: WorkbenchQuickEntryItem[] = [];

/** 业务页面标题栏，右侧数量文案可按页面需要省略。 */
export function SectionHeader({ eyebrow, title, countText = "" }: SectionHeaderProps) {
  return (
    <section className="section-title mb-[12px] mt-[20px] flex items-end justify-between gap-[12px]">
      <div className="min-w-0">
        {eyebrow ? <p>{eyebrow}</p> : null}
        <h2>{title}</h2>
      </div>
      <span>{countText}</span>
    </section>
  );
}

/** 工作台和看板内使用的单个指标块。 */
export function Metric({ label, value }: WorkbenchMetricItem) {
  return (
    <div className="metric-card p-[12px]">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

/** 商户和招募工作台使用的紧凑指标卡。 */
export function WorkbenchInfoCard({
  icon: Icon,
  title,
  description,
  metrics = emptyWorkbenchMetrics,
  variant = "default"
}: WorkbenchInfoCardProps) {
  return (
    <article className="flow-card compact workbench-info-card p-[13px]">
      <div className="card-title flex items-center justify-between gap-[10px]">
        <Icon size={18} />
        <div className="workbench-info-copy">
          <strong>{title}</strong>
          <span>{description}</span>
        </div>
      </div>
      <div
        className={`metric-grid workbench-metric-grid mt-[12px] grid gap-[8px] ${variant === "large" ? "large" : ""}`}
      >
        {metrics.map((metric) => (
          <Metric key={metric.label} label={metric.label} value={metric.value} />
        ))}
      </div>
    </article>
  );
}

/** 快捷入口卡片仅描述可用动作，具体行为由调用方决定。 */
export function WorkbenchQuickEntryCard({
  icon: Icon,
  title = "快捷入口",
  description,
  entries = emptyWorkbenchQuickEntries
}: WorkbenchQuickEntryCardProps) {
  return (
    <article className="flow-card compact workbench-quick-card p-[13px]">
      <div className="card-title flex items-center justify-between gap-[10px]">
        <Icon size={18} />
        <div className="workbench-quick-copy">
          <strong>{title}</strong>
          <span>{description}</span>
        </div>
      </div>
      <div className="quick-entry-grid workbench-quick-grid mt-[12px] grid gap-[8px]">
        {entries.map((entry) => (
          <QuickEntry icon={entry.icon} key={entry.label} label={entry.label} text={entry.text} />
        ))}
      </div>
    </article>
  );
}

/** 工作台快捷入口中的单项说明。 */
function QuickEntry({ icon: Icon, label, text }: WorkbenchQuickEntryItem) {
  return (
    <article className="quick-entry flex items-start gap-[10px] p-[10px]">
      <Icon size={18} />
      <div className="quick-entry-copy">
        <strong>{label}</strong>
        <span>{text}</span>
      </div>
    </article>
  );
}

/** 商品摘要卡片，通过 onOpenCheckout 将购买意图交回调用方。 */
export function ProductListCard({
  role,
  product,
  purchasePending = false,
  onOpenCheckout
}: {
  role: Role;
  product: ProductSummary;
  purchasePending?: boolean;
  onOpenCheckout: (product: ProductSummary) => void;
}) {
  const deliveryMode = getDefaultDeliveryMode(role, product);
  const deliveryFee = getDeliveryFee(deliveryMode);
  const payableAmount = product.price + product.serviceFee + deliveryFee;

  return (
    <article className="product-row grid gap-[12px] p-[12px]">
      <div className="product-thumb grid min-h-[76px] place-items-center text-center text-[#1d6f55] max-[430px]:min-h-[64px]">
        <ShoppingBag size={24} />
        <span>{product.category.slice(0, 4)}</span>
      </div>
      <div className="product-main min-w-0">
        <div className="product-line flex items-start justify-between gap-[10px]">
          <div className="min-w-0">
            <h3>{product.title}</h3>
            <p>{product.description}</p>
          </div>
          <strong>{formatCurrency(product.price)}</strong>
        </div>
        <div className="meta-line mt-[10px] flex flex-wrap items-center gap-[6px] text-[13px] leading-[1.45] text-[#657181]">
          <span>{product.source}</span>
          <span>{deliveryModeLabels[deliveryMode]}</span>
          <span>库存 {product.stock}</span>
          <span>{product.location}</span>
          <span>零售价 {formatCurrency(product.retailPrice)}</span>
        </div>
        <div className="product-actions mt-[12px] flex flex-wrap items-center justify-between gap-[10px]">
          <span>合计 {formatCurrency(payableAmount)}</span>
          <div className="product-card-action-buttons">
            <button
              className="ghost-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-[#475466]"
              type="button"
            >
              <Heart size={15} /> 收藏
            </button>
            <button
              className="ghost-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-[#475466]"
              type="button"
            >
              <AlertCircle size={15} /> 举报
            </button>
            <button
              className="primary-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white disabled:text-[#748092]"
              disabled={role === "merchant" || purchasePending}
              onClick={() => onOpenCheckout(product)}
              type="button"
            >
              <ShoppingBag size={15} />
              {role === "parent" ? "快递购买" : "购买/预约"}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

/** 按学生和商户两种操作布局展示的兼职卡片。 */
export function PartTimeJobCard({ job, mode = "student" }: { job: PartTimeJob; mode?: "student" | "merchant" }) {
  if (mode === "merchant") {
    return (
      <article className="flow-card p-[14px]">
        <div className="card-title flex items-center justify-between gap-[10px]">
          <BriefcaseBusiness size={18} />
          <div className="merchant-job-title-copy">
            <strong>{job.title}</strong>
            <span>负责人：王店长 188****2201</span>
          </div>
          <em>{job.status}</em>
        </div>
        <p>{job.description}</p>
        <div className="meta-line mt-[10px] flex flex-wrap items-center gap-[6px] text-[13px] leading-[1.45] text-[#657181]">
          <span>人数 6</span>
          <span>{job.period}</span>
          <span>{job.requirement}</span>
          <span>{job.signRule}</span>
        </div>
        <div className="product-actions mt-[12px] flex flex-wrap items-center justify-between gap-[10px]">
          <span>{job.fundingState}，可配置签到保证金。</span>
          <div className="merchant-job-action-buttons">
            <button
              className="ghost-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-[#475466]"
              type="button"
            >
              发布
            </button>
            <button
              className="ghost-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-[#475466]"
              type="button"
            >
              取消发布
            </button>
            <button
              className="ghost-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-[#475466]"
              type="button"
            >
              招募结束
            </button>
            <button
              className="primary-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white"
              type="button"
            >
              编辑
            </button>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="flow-card p-[14px]">
      <div className="card-title flex items-center justify-between gap-[10px]">
        <BriefcaseBusiness size={18} />
        <div className="student-job-title-copy">
          <strong>{job.title}</strong>
          <span>{job.publisher.nickname}</span>
        </div>
        <em>{formatCurrency(job.hourlyPay)}/时</em>
      </div>
      <p>{job.description}</p>
      <div className="meta-line mt-[10px] flex flex-wrap items-center gap-[6px] text-[13px] leading-[1.45] text-[#657181]">
        <span>{job.period}</span>
        <span>{job.location}</span>
        <span>{job.status}</span>
        <span>{job.fundingState}</span>
      </div>
      <div className="form-preview mt-[10px] grid gap-[8px]">
        {job.formFields.map((field) => (
          <span key={field}>{field}</span>
        ))}
      </div>
      <div className="product-actions mt-[12px] flex flex-wrap items-center justify-between gap-[10px]">
        <span>{job.signRule}</span>
        <div className="student-job-action-buttons">
          <button
            className="ghost-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-[#475466]"
            type="button"
          >
            <ClipboardCheck size={15} /> 报名快照
          </button>
          <button
            className="primary-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white"
            type="button"
          >
            <CheckCircle2 size={15} /> 报名
          </button>
        </div>
      </div>
    </article>
  );
}

/** 学生端家教兼职卡片，提供试课申请入口。 */
export function TutorTrialJobCard({
  job,
  onApplyTrial
}: {
  job: TutorTrialJob;
  onApplyTrial?: (job: TutorTrialJob, availability: string) => Promise<unknown> | unknown;
}) {
  const [isApplyScheduleOpen, setIsApplyScheduleOpen] = useState(false);
  const [isApplyingTrial, setIsApplyingTrial] = useState(false);

  /** 提交学生可试课时间，并由上层业务 hook 调真实申请接口。 */
  async function handleConfirmAvailability(value: TrialScheduleValue) {
    if (!onApplyTrial || isApplyingTrial) {
      return;
    }

    setIsApplyingTrial(true);
    try {
      const applied = await onApplyTrial(job, value.plan.summary);
      if (applied !== false) {
        setIsApplyScheduleOpen(false);
      }
    } finally {
      setIsApplyingTrial(false);
    }
  }

  return (
    <>
      <article className="flow-card tutor-trial-job-card p-[14px]">
        <div className="card-title flex items-center justify-between gap-[10px]">
          <GraduationCap size={18} />
          <div className="tutor-trial-job-title-copy">
            <strong>{job.title}</strong>
            <span>{job.publisher.nickname}</span>
          </div>
          <em>{job.budget}</em>
        </div>
        <p>{job.description}</p>
        <div className="meta-line mt-[10px] flex flex-wrap items-center gap-[6px] text-[13px] leading-[1.45] text-[#657181]">
          <span>{job.subject}</span>
          <span>{job.period}</span>
          <span>{job.address}</span>
          <span>{job.status}</span>
        </div>
        <div className="product-actions mt-[12px] flex flex-wrap items-center justify-between gap-[10px]">
          <span>{job.requirement}</span>
          <div className="tutor-trial-job-action-buttons">
            <button
              className="ghost-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-[#475466]"
              type="button"
            >
              <MessageCircle size={15} /> 消息
            </button>
            <button
              className="primary-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white disabled:text-[#748092]"
              disabled={!onApplyTrial}
              onClick={() => setIsApplyScheduleOpen(true)}
              type="button"
            >
              <CalendarClock size={15} /> 申请试课
            </button>
          </div>
        </div>
      </article>
      {isApplyScheduleOpen ? (
        <TutorTrialSchedule
          confirmLabel={isApplyingTrial ? "提交中" : "提交申请"}
          initialValue={null}
          isConfirming={isApplyingTrial}
          maxSelectedDates={null}
          onClose={() => setIsApplyScheduleOpen(false)}
          onConfirm={handleConfirmAvailability}
          subtitle="可提交多个可试课日期和时间段，家长会在这些时间内最多安排 3 天试课。"
          title="提交可试课时间"
        />
      ) : null}
    </>
  );
}
