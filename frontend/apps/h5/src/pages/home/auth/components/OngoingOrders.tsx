import { OngoingOrdersList } from "@components/OngoingOrdersList";
import { Modal } from "@ui/Modal";

/** 委托履约动作由进行中弹窗按按钮语义映射到真实业务 action。 */
export type OngoingHuntingFulfillmentAction = HuntingTaskFulfillmentActionRequest["action"];

/** 进行中事项弹窗属性，调用方提供真实业务动作。 */
export interface OngoingOrdersProps {
  maxHeight?: string;
  orders: ClientOrder[];
  onCancelTutorDemand?: (order: ClientOrder) => void;
  onClose: () => void;
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
}

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
}: OngoingOrdersProps) {
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
