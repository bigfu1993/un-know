import { useConfirmAction } from "@h5/hooks/useConfirmAction";
import { createTutorTaskModel } from "@tools/tutorTaskWorkflow";
import { EduTaskCard, type EduTaskCardJob } from "@h5/pages/home/job/components/EduTaskCard";
import { FilterTags } from "./components/FilterTags";
import { OrderActions, OrderStatus } from "./components/OrderActions";
import { getOngoingOrderCategory, getOngoingOrderDisplayDetail } from "./model";

/**
 * 进行中事项弹窗，负责分类筛选、空状态和卡片展示。家教卡片直接用 EduTaskCard 卡片壳组装
 * OrderStatus/OrderActions；家教流程内部的全部状态、弹窗和取消申请动作都收敛在 OrderActions
 * 组件自己内部（跟单张卡片一一对应），这里只保留跨卡片共用的取消确认弹窗（同一时间只需要一个
 * 实例）；同时把上层传入的委托履约/家教流程动作统一转换成卡片消费的扁平 handler。
 */
export function OngoingOrders({
  maxHeight = "min(72vh, 620px)",
  orders,
  onCancelTutorDemand,
  onClose,
  onConfirmTutorTrialStart,
  onHuntingFulfillmentAction,
  onOpenQuoteList,
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
          <strong>进行中的列表卡片</strong>
          <span>{orders.length} 个进行中事项</span>
        </>
      }
    >
      <FilterTags onChange={setActiveFilter} value={activeFilter} />
      <div className="ongoing-list grid gap-[10px]">
        {filteredOrders.map((order) => {
          if (getOngoingOrderCategory(order) === "tutor") {
            const tutorTask = createTutorTaskModel({ order, role: order.role });
            /** 后端已把完整需求结构挂在 order.tutorDemand 上，这里只是把需求字段名对齐到
             *  EduTaskCard 的展示字段名（addressLabel/school → address），不再拼假数据。 */
            const demand = order.tutorDemand;
            const taskCardJob: EduTaskCardJob = {
              address: demand?.addressLabel ?? demand?.school ?? "",
              description: demand?.description ?? "暂无描述",
              periodDates: demand?.periodDates ?? order.periodDates ?? [],
              publisher: demand?.publisher ?? { nickname: "" },
              subject: demand?.subject ?? order.subject ?? "",
              title: demand?.title ?? order.title
            };

            return (
              <EduTaskCard
                budgetSlot={<OrderStatus order={order} tutorTask={tutorTask} />}
                className={order.risk ? "risk-card" : ""}
                footer={<OrderActions onOpenCancelConfirmation={openCancelConfirmation} order={order} {...handlers} />}
                job={taskCardJob}
                key={order.id}
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
              <div className="ongoing-card-actions mt-[10px] flex flex-wrap gap-[8px]">
                <OrderActions onOpenCancelConfirmation={openCancelConfirmation} order={order} {...handlers} />
              </div>
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
