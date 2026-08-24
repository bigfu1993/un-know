import "./index.less";
import { Search } from "lucide-react";

/** 订单列表筛选类型。 */
type OrderListFilter = "all" | "featured" | "partTime" | "delegation" | "hunting" | "cancelled" | "completed";

/** 订单列表筛选标签配置。 */
const orderListFilterOptions: Array<{ label: string; value: OrderListFilter }> = [
  { label: "全部", value: "all" },
  { label: "优选", value: "featured" },
  { label: "兼职", value: "partTime" },
  { label: "委托", value: "delegation" },
  { label: "狩猎", value: "hunting" },
  { label: "已取消", value: "cancelled" },
  { label: "已完成", value: "completed" }
];

/** 判断订单是否匹配当前筛选标签。 */
function isOrderMatchedFilter(order: ClientOrder, filter: OrderListFilter) {
  if (filter === "all") {
    return true;
  }
  if (filter === "cancelled") {
    return order.status.includes("取消");
  }
  if (filter === "completed") {
    return order.status.includes("完成");
  }
  if (filter === "partTime") {
    return order.category === "partTime" || order.category === "tutor";
  }

  return order.category === filter || (!order.category && filter === "featured");
}

/** 判断订单是否匹配搜索关键字。 */
function isOrderMatchedKeyword(order: ClientOrder, keyword: string) {
  const normalizedKeyword = keyword.trim().toLowerCase();

  if (!normalizedKeyword) {
    return true;
  }

  return [order.id, order.title, order.status, order.contact, order.detail].some((value) =>
    Boolean(value?.toLowerCase().includes(normalizedKeyword))
  );
}

/** 订单页面，展示按角色过滤后的订单、委托历史订单和售后处理入口。 */
export function Orders({
  orders,
  onRepublishDelegation
}: {
  orders: ClientOrder[];
  onRepublishDelegation?: (order: ClientOrder) => void;
}) {
  const [keyword, setKeyword] = useState("");
  const [activeFilter, setActiveFilter] = useState<OrderListFilter>("all");
  const visibleOrders = useMemo(
    () => orders.filter((order) => isOrderMatchedFilter(order, activeFilter) && isOrderMatchedKeyword(order, keyword)),
    [activeFilter, keyword, orders]
  );

  return (
    <section className="module-stack grid gap-[10px]">
      <SectionHeader
        countText={`${visibleOrders.length}/${orders.length} 单`}
        eyebrow="订单快捷入口、联系电话、取消/改约/售后"
        title="订单列表"
      />
      <div className="order-list-toolbar grid gap-[8px]">
        <label className="order-search-field flex min-h-[40px] items-center gap-[8px] px-[12px]" aria-label="搜索订单">
          <Search size={16} />
          <input
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="搜索标题、订单号、联系人"
            type="search"
            value={keyword}
          />
        </label>
        <div className="order-filter-tags flex gap-[8px]" aria-label="筛选订单">
          {orderListFilterOptions.map((option) => (
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
      </div>
      <div className="card-list grid gap-[10px]">
        {visibleOrders.map((order) => (
          <article className={`flow-card p-[14px] ${order.risk ? "risk-card" : ""}`} key={order.id}>
            <div className="card-title flex items-center justify-between gap-[10px]">
              <PackageCheck size={18} />
              <div className="order-card-title-copy">
                <strong>{order.title}</strong>
                <span>{order.id}</span>
              </div>
              <em>{order.status}</em>
            </div>
            <p>{order.detail}</p>
            <div className="meta-line mt-[10px] flex flex-wrap items-center gap-[6px] text-[13px] leading-[1.45] text-[var(--h5-muted)]">
              <span>{order.amountLabel ?? formatCurrency(order.amount)}</span>
              <span>{order.contact}</span>
            </div>
            <div className="product-actions mt-[12px] flex flex-wrap items-center justify-between gap-[10px]">
              <span>
                {order.status.includes("取消")
                  ? "取消委托可再次发布，原订单保留历史记录。"
                  : "已完成订单补充入口：评价、申请退款、举报/投诉。"}
              </span>
              <div className="order-card-actions">
                {order.canRepublish ? (
                  <button
                    className="primary-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white"
                    onClick={() => onRepublishDelegation?.(order)}
                    type="button"
                  >
                    再次发布
                  </button>
                ) : null}
                <button
                  className="ghost-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-[var(--h5-muted)]"
                  type="button"
                >
                  售后/投诉
                </button>
                <button
                  className="primary-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white"
                  type="button"
                >
                  查看详情
                </button>
              </div>
            </div>
          </article>
        ))}
        {visibleOrders.length === 0 ? (
          <article className="empty-state p-[14px] text-center">
            <strong>暂无匹配订单</strong>
            <span>调整搜索关键词或筛选条件后再试。</span>
          </article>
        ) : null}
      </div>
    </section>
  );
}
