/** 订单页面，展示按角色过滤后的订单和后续处理入口。 */
export function Orders({ orders }: { orders: ClientOrder[] }) {
  return (
    <section className="module-stack grid gap-[10px]">
      <SectionHeader
        countText={`${orders.length} 单`}
        eyebrow="订单快捷入口、联系电话、取消/改约/售后"
        title="订单列表"
      />
      <div className="card-list grid gap-[10px]">
        {orders.map((order) => (
          <article className={`flow-card p-[14px] ${order.risk ? "risk-card" : ""}`} key={order.id}>
            <div className="card-title flex items-center justify-between gap-[10px]">
              <PackageCheck size={18} />
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
            <div className="product-actions mt-[12px] flex flex-wrap items-center justify-between gap-[10px]">
              <span>已完成订单补充入口：评价、申请退款、举报/投诉。</span>
              <div>
                <button
                  className="ghost-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-[#475466]"
                  type="button"
                >
                  取消/改约
                </button>
                <button
                  className="ghost-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-[#475466]"
                  type="button"
                >
                  申请退款
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
      </div>
    </section>
  );
}
