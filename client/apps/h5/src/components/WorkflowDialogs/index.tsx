/** 跨页面流程弹窗，仅负责采集或展示数据，提交和导航由调用方处理。 */
import { AddressInfoForm } from "../AddressInfoForm";
import { validateByKey } from "../../tools/validation";

/** 进行中列表筛选类型。 */
type OngoingOrderFilter = "all" | "delegation" | "featured" | "hunting";

/** 进行中列表筛选标签配置。 */
const ongoingOrderFilterOptions: Array<{ label: string; value: OngoingOrderFilter }> = [
  { label: "全部", value: "all" },
  { label: "优选", value: "featured" },
  { label: "委托", value: "delegation" },
  { label: "狩猎", value: "hunting" }
];

/** 获取进行中事项分类，未标记的订单默认归入优选。 */
function getOngoingOrderCategory(order: ClientOrder): Exclude<OngoingOrderFilter, "all"> {
  return order.category === "delegation" || order.category === "hunting" ? order.category : "featured";
}

/** 进行中事项弹窗，支持分类筛选和面板高度配置。 */
export function OngoingOrdersDialog({
  maxHeight = "min(72vh, 620px)",
  orders,
  onClose,
  onOpenQuoteList
}: {
  maxHeight?: string;
  orders: ClientOrder[];
  onClose: () => void;
  onOpenQuoteList?: (order: ClientOrder) => void;
}) {
  const [activeFilter, setActiveFilter] = useState<OngoingOrderFilter>("all");
  const filteredOrders = useMemo(
    () => orders.filter((order) => activeFilter === "all" || getOngoingOrderCategory(order) === activeFilter),
    [activeFilter, orders]
  );

  return (
    <section className="ongoing-dialog" aria-label="进行中的列表">
      <div className="sheet-backdrop" onClick={onClose} />
      <article
        className="ongoing-panel mx-auto grid max-w-[540px] gap-[12px] px-[14px] pb-[calc(16px+env(safe-area-inset-bottom))] pt-[16px]"
        style={{ maxHeight }}
      >
        <div className="card-title flex items-center justify-between gap-[10px]">
          <PackageCheck size={18} />
          <div>
            <strong>进行中的列表卡片</strong>
            <span>{orders.length} 个进行中事项</span>
          </div>
          <button
            className="icon-only grid h-[34px] w-[34px] place-items-center text-[#475466]"
            onClick={onClose}
            type="button"
            aria-label="关闭"
          >
            <XCircle size={20} />
          </button>
        </div>
        <div className="ongoing-filter-tags flex flex-wrap gap-[8px]" aria-label="筛选进行中事项">
          {ongoingOrderFilterOptions.map((option) => (
            <button
              className={activeFilter === option.value ? "active" : ""}
              key={option.value}
              onClick={() => setActiveFilter(option.value)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="ongoing-list grid gap-[10px]">
          {filteredOrders.map((order) => (
            <article className={`flow-card compact p-[12px] ${order.risk ? "risk-card" : ""}`} key={order.id}>
              <div className="card-title flex items-center justify-between gap-[10px]">
                <div>
                  <strong>{order.title}</strong>
                  <span>{order.id}</span>
                </div>
                <em>{order.status}</em>
              </div>
              <p>{order.detail}</p>
              <div className="meta-line mt-[10px] flex flex-wrap items-center gap-[6px] text-[13px] leading-[1.45] text-[#657181]">
                <span>{order.amountLabel ?? formatCurrency(order.amount)}</span>
                <span>{order.contact}</span>
              </div>
              {getOngoingOrderCategory(order) === "delegation" && order.quoteCount && order.quoteCount > 0 ? (
                <div className="ongoing-card-actions mt-[10px] flex flex-wrap gap-[8px]">
                  <button
                    className="primary-button delegation-quote-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white"
                    onClick={() => onOpenQuoteList?.(order)}
                    type="button"
                  >
                    查看报价
                    <span className="delegation-quote-badge">{order.quoteCount}</span>
                  </button>
                </div>
              ) : null}
              {getOngoingOrderCategory(order) === "hunting" && order.quoteId ? (
                <div className="ongoing-card-actions mt-[10px] flex flex-wrap gap-[8px]">
                  <button
                    className="primary-button delegation-quote-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white"
                    onClick={() => onOpenQuoteList?.(order)}
                    type="button"
                  >
                    处理报价
                  </button>
                </div>
              ) : null}
            </article>
          ))}
          {filteredOrders.length === 0 ? (
            <article className="empty-state p-[14px] text-center">
              <strong>暂无当前筛选事项</strong>
              <span>切换筛选标签查看其它进行中内容。</span>
            </article>
          ) : null}
        </div>
      </article>
    </section>
  );
}

/** 渲染当前场景资料模板，并将保存动作交给 App。 */
export function ProfileCompletionDialog({
  isSaving = false,
  template,
  profileDraft,
  onChange,
  onClose,
  onSave
}: {
  isSaving?: boolean;
  template: ProfileRequirementTemplate;
  profileDraft: ProfileDraftState;
  onChange: (key: string, value: string) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const hasInvalidFields = template.fields.some(
    (field) => !validateByKey(field.key, profileDraft[field.key] ?? "", { label: field.label, required: true }).isValid
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!hasInvalidFields && !isSaving) {
      onSave();
    }
  }

  return (
    <section className="checkout-sheet" aria-label="补充资料">
      <div className="sheet-backdrop" onClick={onClose} />
      <form
        className="sheet-panel profile-sheet mx-auto grid max-h-[86vh] max-w-[540px] gap-[14px] overflow-auto px-[14px] pb-[calc(18px+env(safe-area-inset-bottom))] pt-[16px]"
        onSubmit={handleSubmit}
      >
        <div className="card-title flex items-center justify-between gap-[10px]">
          <BadgeCheck size={18} />
          <div>
            <strong>{template.title}</strong>
            <span>{template.description}</span>
          </div>
          <button
            className="icon-only grid h-[34px] w-[34px] place-items-center text-[#475466]"
            onClick={onClose}
            type="button"
            aria-label="关闭"
          >
            <XCircle size={20} />
          </button>
        </div>

        <AddressInfoForm
          areaOptions={campusAreaOptions}
          draft={profileDraft}
          fields={template.fields}
          mode="edit"
          onChange={onChange}
        />

        <div className="sheet-actions grid gap-[8px]">
          <button
            className="ghost-button inline-flex min-h-[38px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-[#475466]"
            onClick={onClose}
            type="button"
          >
            取消
          </button>
          <button
            className="primary-button inline-flex min-h-[38px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white disabled:text-[#748092]"
            disabled={hasInvalidFields || isSaving}
            type="submit"
          >
            <CheckCircle2 size={16} />
            保存资料
          </button>
        </div>
      </form>
    </section>
  );
}

/** App 提交购买前，采集履约方式和支付方式。 */
export function CheckoutSheet({
  checkout,
  role,
  purchasePending,
  onClose,
  onDeliveryChange,
  onPaymentChange,
  onSubmit
}: {
  checkout: CheckoutState;
  role: Role;
  purchasePending: boolean;
  onClose: () => void;
  onDeliveryChange: (mode: DeliveryMode) => void;
  onPaymentChange: (method: PaymentMethod) => void;
  onSubmit: () => void;
}) {
  const availableModes = role === "parent" ? ["express" as DeliveryMode] : checkout.product.deliveryModes;
  const deliveryFee = getDeliveryFee(checkout.deliveryMode);
  const total = checkout.product.price + checkout.product.serviceFee + deliveryFee;

  return (
    <section className="checkout-sheet" aria-label="购买确认">
      <div className="sheet-backdrop" onClick={onClose} />
      <article className="sheet-panel mx-auto grid max-h-[86vh] max-w-[540px] gap-[14px] overflow-auto px-[14px] pb-[calc(18px+env(safe-area-inset-bottom))] pt-[16px]">
        <div className="card-title flex items-center justify-between gap-[10px]">
          <ShoppingBag size={18} />
          <div>
            <strong>{checkout.product.title}</strong>
            <span>购买确认 · 产品金额 + 服务费/物流费</span>
          </div>
          <button
            className="icon-only grid h-[34px] w-[34px] place-items-center text-[#475466]"
            onClick={onClose}
            type="button"
            aria-label="关闭"
          >
            <XCircle size={20} />
          </button>
        </div>
        <div className="sheet-section grid gap-[8px]">
          <span>配送方式</span>
          <div className="segmented-control wrap flex gap-[8px]">
            {availableModes.map((mode) => (
              <button
                className={checkout.deliveryMode === mode ? "active" : ""}
                key={mode}
                onClick={() => onDeliveryChange(mode)}
                type="button"
              >
                {deliveryModeLabels[mode]}
              </button>
            ))}
          </div>
        </div>
        <div className="sheet-section grid gap-[8px]">
          <span>付款方式</span>
          <div className="segmented-control wrap flex gap-[8px]">
            {(["wechat", "alipay", "balance"] as PaymentMethod[]).map((method) => (
              <button
                className={checkout.paymentMethod === method ? "active" : ""}
                key={method}
                onClick={() => onPaymentChange(method)}
                type="button"
              >
                {paymentMethodLabels[method]}
              </button>
            ))}
          </div>
        </div>
        <div className="price-breakdown grid gap-[6px] p-[12px]">
          <span>商品 {formatCurrency(checkout.product.price)}</span>
          <span>服务费 {formatCurrency(checkout.product.serviceFee)}</span>
          <span>履约费 {formatCurrency(deliveryFee)}</span>
          <strong>合计 {formatCurrency(total)}</strong>
        </div>
        <button
          className="primary-button full inline-flex min-h-[38px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white disabled:text-[#748092]"
          disabled={purchasePending}
          onClick={onSubmit}
          type="button"
        >
          <CircleDollarSign size={16} />
          {purchasePending ? "提交中" : "提交支付"}
        </button>
      </article>
    </section>
  );
}
