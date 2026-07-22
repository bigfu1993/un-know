/** 跨页面流程弹窗，仅负责采集或展示数据，提交和导航由调用方处理。 */
import { AddressInfoForm } from "@components/AddressInfoForm";
import { OngoingOrdersList } from "@components/OngoingOrdersList";
import { hasInvalidRequiredFields } from "@tools/validation";

/** 进行中事项弹窗，支持分类筛选和面板高度配置。 */
export function OngoingOrdersDialog({
  maxHeight = "min(72vh, 620px)",
  orders,
  onClose,
  onConfirmCancel,
  onConfirmComplete,
  onConfirmTutorTrialStart,
  onOpenQuoteList,
  onOpenTutorApplications,
  onOpenTutorTrialList,
  onRepublish,
  onTutorWorkflowAction,
  onRequestCancel,
  onRequestComplete
}: {
  maxHeight?: string;
  orders: ClientOrder[];
  onClose: () => void;
  onConfirmCancel?: (order: ClientOrder) => void;
  onConfirmComplete?: (order: ClientOrder) => void;
  onConfirmTutorTrialStart?: (order: ClientOrder) => void;
  onOpenQuoteList?: (order: ClientOrder) => void;
  onOpenTutorApplications?: (order: ClientOrder) => void;
  onOpenTutorTrialList?: (order: ClientOrder) => void;
  onRepublish?: (order: ClientOrder) => void;
  onTutorWorkflowAction?: (order: ClientOrder, action: TutorWorkflowAction, payload?: Partial<TutorWorkflowActionRequest>) => Promise<boolean> | boolean | void;
  onRequestCancel?: (order: ClientOrder) => void;
  onRequestComplete?: (order: ClientOrder) => void;
}) {
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
        <OngoingOrdersList
          orders={orders}
          onConfirmCancel={onConfirmCancel}
          onConfirmComplete={onConfirmComplete}
          onConfirmTutorTrialStart={onConfirmTutorTrialStart}
          onOpenQuoteList={onOpenQuoteList}
          onOpenTutorApplications={onOpenTutorApplications}
          onOpenTutorTrialList={onOpenTutorTrialList}
          onRepublish={onRepublish}
          onTutorWorkflowAction={onTutorWorkflowAction}
          onRequestCancel={onRequestCancel}
          onRequestComplete={onRequestComplete}
        />
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
  /** 当前资料模板是否存在未通过校验的必填项。 */
  const hasInvalidFields = hasInvalidRequiredFields(template.fields, profileDraft);

  /** 拦截表单默认提交，并在校验通过后交给调用方保存。 */
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
          onChange={(nextDraft, changedKey) => onChange(changedKey, nextDraft[changedKey] ?? "")}
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
  purchasePending = false,
  onClose,
  onDeliveryChange,
  onPaymentChange,
  onSubmit
}: {
  checkout: CheckoutState;
  role: Role;
  purchasePending?: boolean;
  onClose: () => void;
  onDeliveryChange: (mode: DeliveryMode) => void;
  onPaymentChange: (method: PaymentMethod) => void;
  onSubmit: () => void;
}) {
  /** 家长端商品购买第一版仅开放快递配送，其它角色沿用商品可用配送方式。 */
  const availableModes = role === "parent" ? ["express" as DeliveryMode] : checkout.product.deliveryModes;
  /** 当前配送方式对应的履约费用。 */
  const deliveryFee = getDeliveryFee(checkout.deliveryMode);
  /** 购买确认页展示和提交的订单合计金额。 */
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
