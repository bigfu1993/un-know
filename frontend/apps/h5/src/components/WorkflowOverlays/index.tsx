/** 跨页面流程弹窗，仅负责采集或展示数据，提交和导航由调用方处理。 */
import { AddressInfoForm } from "@components/AddressInfoForm";
import { Modal } from "@ui/Modal";
import { OngoingOrdersList } from "@components/OngoingOrdersList";
import { hasInvalidRequiredFields } from "@tools/validation";

/** 委托履约动作由进行中弹窗按按钮语义映射到真实业务 action。 */
type OngoingHuntingFulfillmentAction = HuntingTaskFulfillmentActionRequest["action"];

/** 进行中事项弹窗，支持分类筛选和面板高度配置。 */
export function OngoingOrders({
  maxHeight = "min(72vh, 620px)",
  orders,
  onClose,
  onCancelTutorDemand,
  onConfirmTutorTrialStart,
  onHuntingFulfillmentAction,
  onOpenQuoteList,
  onOpenTutorApplications,
  onOpenTutorTrialList,
  onRequestTutorTrialEnd,
  onSubmitTutorWorkflowAction
}: {
  maxHeight?: string;
  orders: ClientOrder[];
  onClose: () => void;
  onCancelTutorDemand?: (order: ClientOrder) => void;
  onConfirmTutorTrialStart?: (order: ClientOrder) => void;
  onHuntingFulfillmentAction?: (order: ClientOrder, action: OngoingHuntingFulfillmentAction) => Promise<unknown> | unknown;
  onOpenQuoteList?: (order: ClientOrder) => void;
  onOpenTutorApplications?: (order: ClientOrder) => void;
  onOpenTutorTrialList?: (order: ClientOrder) => void;
  onRequestTutorTrialEnd?: (order: ClientOrder) => void;
  onSubmitTutorWorkflowAction?: (
    payload: TutorWorkflowActionRequest & {
      applicationId: string;
    }
  ) => Promise<boolean> | boolean | void;
}) {
  /** 将进行中委托按钮映射到服务端履约 action。 */
  function handleHuntingFulfillmentAction(order: ClientOrder, action: OngoingHuntingFulfillmentAction) {
    void onHuntingFulfillmentAction?.(order, action);
  }

  /** 家教流程列表以订单为上下文，向上只提交服务端需要的应用载荷。 */
  function handleTutorWorkflowAction(
    order: ClientOrder,
    action: TutorWorkflowAction,
    payload: Partial<TutorWorkflowActionRequest> = {}
  ) {
    return onSubmitTutorWorkflowAction?.({
      ...payload,
      action,
      applicationId: order.id
    });
  }

  /** 进行中取消动作按业务类型分流，家教发布中主任务走真实取消发布接口。 */
  function handleRequestCancel(order: ClientOrder) {
    if (order.category === "tutor") {
      onCancelTutorDemand?.(order);
      return;
    }

    handleHuntingFulfillmentAction(order, "request_cancel");
  }

  /** 进行中完成动作按业务类型分流，家教试课走真实结束试课确认接口。 */
  function handleRequestComplete(order: ClientOrder) {
    if (order.category === "tutor") {
      onRequestTutorTrialEnd?.(order);
      return;
    }

    handleHuntingFulfillmentAction(order, "request_complete");
  }

  return (
    <Modal
      ariaLabel="进行中的列表"
      onClose={onClose}
      panelClassName="mx-auto grid max-w-[540px] gap-[12px] px-[14px] pb-[calc(16px+env(safe-area-inset-bottom))] pt-[16px]"
      panelStyle={{ maxHeight }}
      rootClassName="ongoing-modal"
      surfaceClassName="ongoing-panel"
    >
      <div className="card-title flex items-center justify-between gap-[10px]">
        <PackageCheck size={18} />
        <div className="ongoing-orders-title-copy">
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
        onConfirmCancel={(order) => handleHuntingFulfillmentAction(order, "confirm_cancel")}
        onConfirmComplete={(order) => handleHuntingFulfillmentAction(order, "confirm_complete")}
        onConfirmTutorTrialStart={onConfirmTutorTrialStart}
        onOpenQuoteList={onOpenQuoteList}
        onOpenTutorApplications={onOpenTutorApplications}
        onOpenTutorTrialList={onOpenTutorTrialList}
        onRepublish={(order) => handleHuntingFulfillmentAction(order, "republish")}
        onTutorWorkflowAction={onSubmitTutorWorkflowAction ? handleTutorWorkflowAction : undefined}
        onRequestCancel={handleRequestCancel}
        onRequestComplete={handleRequestComplete}
      />
    </Modal>
  );
}

/** 进行中快捷入口，封装右下角按钮和进行中事项弹窗。 */
export function OngoingShortcut({
  hasPaymentRisk,
  isOpen,
  onOpen,
  orders,
  ...overlayProps
}: {
  hasPaymentRisk: boolean;
  isOpen: boolean;
  onCancelTutorDemand?: (order: ClientOrder) => void;
  onClose: () => void;
  onConfirmTutorTrialStart?: (order: ClientOrder) => void;
  onHuntingFulfillmentAction?: (order: ClientOrder, action: OngoingHuntingFulfillmentAction) => Promise<unknown> | unknown;
  onOpen: () => void;
  onOpenQuoteList?: (order: ClientOrder) => void;
  onOpenTutorApplications?: (order: ClientOrder) => void;
  onOpenTutorTrialList?: (order: ClientOrder) => void;
  onRequestTutorTrialEnd?: (order: ClientOrder) => void;
  onSubmitTutorWorkflowAction?: (
    payload: TutorWorkflowActionRequest & {
      applicationId: string;
    }
  ) => Promise<boolean> | boolean | void;
  orders: ClientOrder[];
}) {
  const buttonClassName = `quick-action-button quick-action-order order-shortcut grid h-[46px] w-[46px] place-items-center font-extrabold text-white ${
    hasPaymentRisk ? "danger" : ""
  }`;

  return (
    <>
      <button
        className={buttonClassName}
        onClick={onOpen}
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label="查看进行中事项"
      >
        <PackageCheck size={18} />
        <span className="quick-action-badge">{orders.length}</span>
      </button>

      {isOpen ? <OngoingOrders orders={orders} {...overlayProps} /> : null}
    </>
  );
}

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
      onClose={onClose}
      onSubmit={handleSubmit}
      panelClassName="profile-sheet mx-auto grid max-h-[86vh] max-w-[540px] gap-[14px] overflow-auto px-[14px] pb-[calc(18px+env(safe-area-inset-bottom))] pt-[16px]"
      panelElement="form"
    >
      <div className="card-title flex items-center justify-between gap-[10px]">
        <BadgeCheck size={18} />
        <div className="profile-completion-title-copy">
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
      onClose={onClose}
      panelClassName="mx-auto grid max-h-[86vh] max-w-[540px] gap-[14px] overflow-auto px-[14px] pb-[calc(18px+env(safe-area-inset-bottom))] pt-[16px]"
    >
      <div className="card-title flex items-center justify-between gap-[10px]">
        <ShoppingBag size={18} />
        <div className="checkout-title-copy">
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
    </Modal>
  );
}
