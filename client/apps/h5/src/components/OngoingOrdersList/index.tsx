import "./index.less";

/** 进行中列表筛选类型。 */
type OngoingOrderFilter = "all" | "delegation" | "featured" | "hunting" | "tutor";

/** 进行中事项动作回调集合，由弹窗或页面注入业务处理。 */
interface OngoingOrderActionHandlers {
  onCallOrder?: (order: ClientOrder) => void;
  onConfirmCancel?: (order: ClientOrder) => void;
  onConfirmComplete?: (order: ClientOrder) => void;
  onMessageOrder?: (order: ClientOrder) => void;
  onOpenQuoteList?: (order: ClientOrder) => void;
  onOpenTutorApplications?: (order: ClientOrder) => void;
  onOpenTrialResult?: (order: ClientOrder) => void;
  onOpenTrialSchedule?: (order: ClientOrder) => void;
  onRejectTrial?: (order: ClientOrder) => void;
  onAgreeTrial?: (order: ClientOrder) => void;
  onRepublish?: (order: ClientOrder) => void;
  onRequestCancel?: (order: ClientOrder) => void;
  onRequestComplete?: (order: ClientOrder) => void;
}

/** 进行中事项列表组件入参。 */
interface OngoingOrdersListProps extends OngoingOrderActionHandlers {
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

/** 获取进行中事项分类，未标记的订单默认归入优选。 */
function getOngoingOrderCategory(order: ClientOrder): Exclude<OngoingOrderFilter, "all"> {
  return order.category === "delegation" || order.category === "hunting" || order.category === "tutor"
    ? order.category
    : "featured";
}

/** 判断进行中卡片是否存在常规履约动作。 */
function hasOngoingOrderActions(order: ClientOrder): boolean {
  return Boolean(
    order.canCall ||
      order.canMessage ||
      order.canOpenTutorApplications ||
      order.canOpenTrialSchedule ||
      order.canRejectTrial ||
      order.canAgreeTrial ||
      order.canOpenTrialResult ||
      order.canRequestCancel ||
      order.canRequestComplete ||
      order.canConfirmCancel ||
      order.canConfirmComplete ||
      order.canRepublish
  );
}

/** 渲染进行中事项的报价入口和履约动作。 */
function OngoingOrderActions({ order, ...handlers }: { order: ClientOrder } & OngoingOrderActionHandlers) {
  /** 当前卡片所属业务分类，用于隔离委托报价和狩猎报价入口。 */
  const category = getOngoingOrderCategory(order);
  /** 发布方委托卡片是否展示报价列表入口。 */
  const showDelegationQuote = category === "delegation" && Boolean(order.quoteCount && order.quoteCount > 0);
  /** 履约方狩猎卡片是否展示报价处理入口。 */
  const showHuntingQuote = category === "hunting" && Boolean(order.quoteId && order.quoteActionLabel);
  /** 当前卡片是否展示电话、消息、取消、完成等履约动作。 */
  const showFulfillmentActions = hasOngoingOrderActions(order);

  if (!showDelegationQuote && !showHuntingQuote && !showFulfillmentActions) {
    return null;
  }

  return (
    <>
      {showDelegationQuote ? (
        <div className="ongoing-card-actions mt-[10px] flex flex-wrap gap-[8px]">
          <button
            className="primary-button delegation-quote-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white"
            onClick={() => handlers.onOpenQuoteList?.(order)}
            type="button"
          >
            查看报价
            <span className="delegation-quote-badge">{order.quoteCount}</span>
          </button>
        </div>
      ) : null}
      {showHuntingQuote ? (
        <div className="ongoing-card-actions mt-[10px] flex flex-wrap gap-[8px]">
          <button
            className="primary-button delegation-quote-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white"
            onClick={() => handlers.onOpenQuoteList?.(order)}
            type="button"
          >
            {order.quoteActionLabel}
          </button>
        </div>
      ) : null}
      {showFulfillmentActions ? (
        <div className="ongoing-card-actions mt-[10px] flex flex-wrap gap-[8px]">
          {order.canCall ? (
            <button
              className="ghost-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-[#475466]"
              onClick={() => handlers.onCallOrder?.(order)}
              type="button"
            >
              电话
            </button>
          ) : null}
          {order.canMessage ? (
            <button
              className="secondary-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px]"
              onClick={() => handlers.onMessageOrder?.(order)}
              type="button"
            >
              <MessageCircle size={15} />
              消息
            </button>
          ) : null}
          {order.canOpenTutorApplications ? (
            <button
              className="primary-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white"
              onClick={() => handlers.onOpenTutorApplications?.(order)}
              type="button"
            >
              申请列表
            </button>
          ) : null}
          {order.canOpenTrialSchedule ? (
            <button
              className="ghost-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-[#475466]"
              onClick={() => handlers.onOpenTrialSchedule?.(order)}
              type="button"
            >
              <CalendarClock size={15} />
              试课安排
            </button>
          ) : null}
          {order.canRejectTrial ? (
            <button
              className="danger-outline-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px]"
              onClick={() => handlers.onRejectTrial?.(order)}
              type="button"
            >
              拒绝
            </button>
          ) : null}
          {order.canAgreeTrial ? (
            <button
              className="primary-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white"
              onClick={() => handlers.onAgreeTrial?.(order)}
              type="button"
            >
              同意试课
            </button>
          ) : null}
          {order.canOpenTrialResult ? (
            <button
              className="primary-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white"
              onClick={() => handlers.onOpenTrialResult?.(order)}
              type="button"
            >
              试课结果
            </button>
          ) : null}
          {order.canRequestCancel ? (
            <button
              className="danger-outline-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px]"
              onClick={() => handlers.onRequestCancel?.(order)}
              type="button"
            >
              取消
            </button>
          ) : null}
          {order.canRequestComplete ? (
            <button
              className="primary-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white"
              onClick={() => handlers.onRequestComplete?.(order)}
              type="button"
            >
              完成
            </button>
          ) : null}
          {order.canConfirmCancel ? (
            <button
              className="danger-outline-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px]"
              onClick={() => handlers.onConfirmCancel?.(order)}
              type="button"
            >
              确认取消
            </button>
          ) : null}
          {order.canConfirmComplete ? (
            <button
              className="primary-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white"
              onClick={() => handlers.onConfirmComplete?.(order)}
              type="button"
            >
              <CheckCircle2 size={15} />
              确认完成
            </button>
          ) : null}
          {order.canRepublish ? (
            <button
              className="primary-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white"
              onClick={() => handlers.onRepublish?.(order)}
              type="button"
            >
              重新发布
            </button>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

/** 进行中事项列表，负责分类筛选、空状态和卡片动作展示。 */
export function OngoingOrdersList({ orders, ...handlers }: OngoingOrdersListProps) {
  const [activeFilter, setActiveFilter] = useState<OngoingOrderFilter>("all");
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
            <OngoingOrderActions order={order} {...handlers} />
          </article>
        ))}
        {filteredOrders.length === 0 ? (
          <article className="empty-state p-[14px] text-center">
            <strong>暂无当前筛选事项</strong>
            <span>切换筛选标签查看其它进行中内容。</span>
          </article>
        ) : null}
      </div>
    </>
  );
}
