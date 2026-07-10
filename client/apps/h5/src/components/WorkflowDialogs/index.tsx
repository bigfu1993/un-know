/**
 * Cross-page workflow dialogs.
 * Dialogs collect or display data; mutations and navigation stay in the caller.
 */
export function OngoingOrdersDialog({
  orders,
  onClose,
  onOpenOrders
}: {
  orders: ClientOrder[];
  onClose: () => void;
  onOpenOrders: () => void;
}) {
  return (
    <section className="ongoing-dialog" aria-label="进行中的列表">
      <div className="sheet-backdrop" onClick={onClose} />
      <article className="ongoing-panel mx-auto grid max-h-[min(78vh,680px)] max-w-[540px] gap-[12px] overflow-auto px-[14px] pb-[calc(16px+env(safe-area-inset-bottom))] pt-[16px]">
        <div className="card-title flex items-center justify-between gap-[10px]">
          <PackageCheck size={18} />
          <div>
            <strong>进行中的列表卡片</strong>
            <span>{orders.length} 个配送/订单事项</span>
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
        <div className="ongoing-list grid gap-[10px]">
          {orders.map((order) => (
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
                <span>{formatCurrency(order.amount)}</span>
                <span>{order.contact}</span>
              </div>
            </article>
          ))}
        </div>
        <button
          className="primary-button full inline-flex min-h-[38px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white"
          onClick={onOpenOrders}
          type="button"
        >
          <PackageCheck size={16} />
          查看订单详情
        </button>
      </article>
    </section>
  );
}

/** Renders the active scene profile template and delegates saving to App. */
export function ProfileCompletionDialog({
  template,
  profileDraft,
  onChange,
  onClose,
  onSave
}: {
  template: ProfileRequirementTemplate;
  profileDraft: ProfileDraftState;
  onChange: (key: string, value: string) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const hasMissingFields = template.fields.some((field) => !profileDraft[field.key]?.trim());

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!hasMissingFields) {
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

        <div className="profile-field-list grid gap-[10px]">
          {template.fields.map((field) => {
            const value = profileDraft[field.key] ?? "";
            const isMissing = !value.trim();

            return (
              <label className={`profile-field grid gap-[7px] ${isMissing ? "missing" : ""}`} key={field.key}>
                <span>{field.label}</span>
                <input
                  inputMode={field.inputMode ?? "text"}
                  list={field.kind === "area" ? `profile-area-${field.key}` : undefined}
                  onChange={(event) => onChange(field.key, event.target.value)}
                  placeholder={field.placeholder}
                  value={value}
                />
                {field.kind === "area" ? (
                  <datalist id={`profile-area-${field.key}`}>
                    {campusAreaOptions.map((area) => (
                      <option key={area} value={area} />
                    ))}
                  </datalist>
                ) : null}
              </label>
            );
          })}
        </div>

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
            disabled={hasMissingFields}
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

/** Collects fulfillment and payment choices before App submits the purchase. */
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
