import { useConfirmAction } from "@h5/hooks/useConfirmAction";
import { EduCard } from "./components/EduCard";
import { FilterTags } from "./components/FilterTags";
import { OrderActions, OrderStatus } from "./components/OrderActions";
import { getOngoingOrderCategory, getOngoingOrderDisplayDetail, showOngoingOrderMessagePlaceholder } from "./model";

/** 委托履约动作由进行中弹窗按按钮语义映射到真实业务 action。 */
export type OngoingHuntingFulfillmentAction = HuntingTaskFulfillmentActionRequest["action"];

/** 进行中事项弹窗属性，调用方提供真实业务动作。 */
export interface OngoingOrdersProps {
  maxHeight?: string;
  orders: ClientOrder[];
  onCancelTutorDemand?: (order: ClientOrder) => void;
  onClose: () => void;
  /** 测试用：点击弹窗标题手动触发一次进行中列表查询，不做真实业务用途，验证完可移除。 */
  onDebugRefetch?: () => void;
  onConfirmTutorTrialStart?: (order: ClientOrder) => void;
  onHuntingFulfillmentAction?: (
    order: ClientOrder,
    action: OngoingHuntingFulfillmentAction
  ) => Promise<unknown> | unknown;
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

/**
 * 进行中事项弹窗，负责分类筛选、空状态和卡片展示，家教卡片委托给 EduCard 自己承接状态和弹窗，
 * 这里只保留跨卡片共用的取消确认弹窗（同一时间只需要一个实例）；同时把上层传入的委托履约/
 * 家教流程动作统一转换成卡片消费的扁平 handler。
 */
export function OngoingOrders({
  maxHeight = "min(72vh, 620px)",
  orders,
  onCancelTutorDemand,
  onClose,
  onConfirmTutorTrialStart,
  onDebugRefetch,
  onHuntingFulfillmentAction,
  onOpenQuoteList,
  onOpenTutorApplications,
  onOpenTutorTrialList,
  onRequestTutorTrialEnd,
  onSubmitTutorWorkflowAction
}: OngoingOrdersProps) {
  const [activeFilter, setActiveFilter] = useState<OngoingOrderFilter>("all");
  const {
    closeConfirmation: closeCancelConfirmation,
    confirmCurrentAction: confirmCancelAction,
    confirmation: cancelConfirmation,
    openConfirmation: openCancelConfirmation
  } = useConfirmAction();

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

  const handlers: OngoingOrderActionHandlers = {
    onConfirmCancel: (order) => handleHuntingFulfillmentAction(order, "confirm_cancel"),
    onConfirmComplete: (order) => handleHuntingFulfillmentAction(order, "confirm_complete"),
    onConfirmTutorTrialStart,
    onOpenQuoteList,
    onOpenTutorApplications,
    onOpenTutorTrialList,
    onRepublish: (order) => handleHuntingFulfillmentAction(order, "republish"),
    onTutorWorkflowAction: onSubmitTutorWorkflowAction ? handleTutorWorkflowAction : undefined,
    onRequestCancel: handleRequestCancel,
    onRequestComplete: handleRequestComplete
  };

  /** 按当前标签过滤后的进行中事项列表。 */
  const filteredOrders = useMemo(
    () => orders.filter((order) => activeFilter === "all" || getOngoingOrderCategory(order) === activeFilter),
    [activeFilter, orders]
  );

  return (
    <Modal
      ariaLabel="进行中的列表"
      icon={<PackageCheck size={18} />}
      onClose={onClose}
      panelClassName="mx-auto grid max-w-[540px] gap-[12px] px-[14px] pb-[calc(16px+env(safe-area-inset-bottom))] pt-[16px]"
      panelStyle={{ maxHeight }}
      rootClassName="ongoing-modal"
      surfaceClassName="ongoing-panel"
      title={
        <>
          <strong
            onClick={onDebugRefetch}
            style={onDebugRefetch ? { cursor: "pointer" } : undefined}
            title={onDebugRefetch ? "点击手动查询进行中列表（测试用）" : undefined}
          >
            进行中的列表卡片
          </strong>
          <span>{orders.length} 个进行中事项</span>
        </>
      }
    >
      <FilterTags onChange={setActiveFilter} value={activeFilter} />
      <div className="ongoing-list grid gap-[10px]">
        {filteredOrders.map((order) => {
          if (getOngoingOrderCategory(order) === "tutor") {
            return (
              <EduCard
                key={order.id}
                onOpenCancelConfirmation={openCancelConfirmation}
                order={order}
                role={order.role}
                {...handlers}
              />
            );
          }

          return (
            <article className={`flow-card compact p-[12px] ${order.risk ? "risk-card" : ""}`} key={order.id}>
              <div className="card-title flex items-center justify-between gap-[10px]">
                <div className="ongoing-order-title-copy">
                  <strong>{order.title}</strong>
                  <span>{order.id}</span>
                </div>
                <OrderStatus order={order} tutorTask={null} />
              </div>
              <p>{getOngoingOrderDisplayDetail(order)}</p>
              <div className="meta-line mt-[10px] flex flex-wrap items-center gap-[6px] text-[13px] leading-[1.45] text-[#657181]">
                <span>{order.amountLabel ?? formatCurrency(order.amount)}</span>
                <span>{order.contact}</span>
              </div>
              <OrderActions
                order={order}
                {...handlers}
                onMessageOrder={showOngoingOrderMessagePlaceholder}
                onOpenCancelConfirmation={openCancelConfirmation}
              />
            </article>
          );
        })}
        {filteredOrders.length === 0 ? (
          <article className="empty-state p-[14px] text-center">
            <strong>暂无当前筛选事项</strong>
            <span>切换筛选标签查看其它进行中内容。</span>
          </article>
        ) : null}
      </div>
      {cancelConfirmation ? (
        <ConfirmAction
          confirmLabel={cancelConfirmation.confirmLabel}
          description={cancelConfirmation.description}
          onClose={closeCancelConfirmation}
          onConfirm={confirmCancelAction}
          title={cancelConfirmation.title}
        />
      ) : null}
    </Modal>
  );
}
