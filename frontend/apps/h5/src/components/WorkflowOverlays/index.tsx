/** 跨页面流程弹窗，仅负责采集或展示数据，提交和导航由调用方处理。 */
import { hasInvalidRequiredFields } from "@tools/validation";

/** 渲染当前场景资料模板，并将保存动作交给 App。 */
export function ProfileCompletion({
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
    <Modal
      ariaLabel="补充资料"
      icon={<BadgeCheck size={18} />}
      onClose={onClose}
      onSubmit={handleSubmit}
      panelClassName="profile-sheet mx-auto grid max-h-[86vh] max-w-[540px] gap-[14px] overflow-auto px-[14px] pb-[calc(18px+env(safe-area-inset-bottom))] pt-[16px]"
      panelElement="form"
      title={
        <>
          <strong>{template.title}</strong>
          <span>{template.description}</span>
        </>
      }
    >
      <AddressInfoForm
        areaOptions={campusAreaOptions}
        draft={profileDraft}
        fields={template.fields}
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
    </Modal>
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
    <Modal
      ariaLabel="购买确认"
      icon={<ShoppingBag size={18} />}
      onClose={onClose}
      panelClassName="mx-auto grid max-h-[86vh] max-w-[540px] gap-[14px] overflow-auto px-[14px] pb-[calc(18px+env(safe-area-inset-bottom))] pt-[16px]"
      title={
        <>
          <strong>{checkout.product.title}</strong>
          <span>购买确认 · 产品金额 + 服务费/物流费</span>
        </>
      }
    >
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
    </Modal>
  );
}
