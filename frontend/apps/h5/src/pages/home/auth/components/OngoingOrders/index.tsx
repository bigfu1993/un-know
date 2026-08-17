import { useConfirmAction } from "@h5/hooks/useConfirmAction";
import { EduCard } from "./components/EduCard";
import { OrderActions, OrderStatus } from "./components/OrderActions";
import { getOngoingOrderCategory, getOngoingOrderDisplayDetail, showOngoingOrderMessagePlaceholder } from "./model";

/** 进行中事项列表组件入参。 */
interface OngoingOrdersProps extends OngoingOrderActionHandlers {
  orders: ClientOrder[];
}

/** 进行中列表筛选标签配置。 */
const ongoingOrderFilterOptions: Array<{ label: string; value: OngoingOrderFilter }> = [
  { label: "全部", value: "all" },
  { label: "优选", value: "featured" },
  { label: "委托", value: "delegation" },
  { label: "狩猎", value: "hunting" },
  { label: "家教", value: "tutor" }
];

/**
 * 进行中事项列表，负责分类筛选、空状态和卡片展示；家教卡片委托给 EduCard 自己承接状态和弹窗，
 * 这里只保留跨卡片共用的取消确认弹窗（同一时间只需要一个实例）。
 */
export function OngoingOrders({ orders, ...handlers }: OngoingOrdersProps) {
  const [activeFilter, setActiveFilter] = useState<OngoingOrderFilter>("all");
  const {
    closeConfirmation: closeCancelConfirmation,
    confirmCurrentAction: confirmCancelAction,
    confirmation: cancelConfirmation,
    openConfirmation: openCancelConfirmation
  } = useConfirmAction();
  /** 按当前标签过滤后的进行中事项列表。 */
  const filteredOrders = useMemo(
    () => orders.filter((order) => activeFilter === "all" || getOngoingOrderCategory(order) === activeFilter),
    [activeFilter, orders]
  );

  return (
    <>
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
              <OrderActions order={order} {...handlers} onMessageOrder={showOngoingOrderMessagePlaceholder} onOpenCancelConfirmation={openCancelConfirmation} />
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
    </>
  );
}
