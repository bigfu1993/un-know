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
      <div className="product-thumb grid min-h-[76px] place-items-center text-center text-[var(--h5-success)] max-[430px]:min-h-[64px]">
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
        <div className="meta-line mt-[10px] flex flex-wrap items-center gap-[6px] text-[13px] leading-[1.45] text-[var(--h5-muted)]">
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
              className="ghost-button button-inline-layout min-h-[34px] px-[10px] py-[8px] text-[var(--h5-muted)]"
              type="button"
            >
              <Heart size={15} /> 收藏
            </button>
            <button
              className="ghost-button button-inline-layout min-h-[34px] px-[10px] py-[8px] text-[var(--h5-muted)]"
              type="button"
            >
              <AlertCircle size={15} /> 举报
            </button>
            <button
              className="primary-button button-inline-layout min-h-[34px] px-[10px] py-[8px] text-white disabled:text-[var(--h5-subtle)]"
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

