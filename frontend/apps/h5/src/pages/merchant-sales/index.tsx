import "./index.less";

/** 商户销售工作台，展示经营指标、快捷入口和商品卡片。 */
export function MerchantSales({
  dashboard,
  merchantProducts
}: {
  dashboard: MerchantDashboard;
  merchantProducts: MerchantProduct[];
}) {
  return (
    <section className="module-stack grid gap-[10px]">
      <SectionHeader countText="全部门店" eyebrow="销售、配送、消息和经营看板" title="销售工作台" />
      <WorkbenchInfoCard
        description="全部门店汇总，可按门店筛选销售、配送、消息和转化表现。"
        icon={Store}
        metrics={[
          { label: "销售数/额", value: `${dashboard.salesCount} / ${formatCurrency(dashboard.salesAmount)}` },
          { label: "待配送", value: `${dashboard.pendingDelivery}` },
          { label: "配送中", value: `${dashboard.delivering}` },
          { label: "售后/对话", value: `${dashboard.afterSaleMessages} / ${dashboard.chatMessages}` },
          { label: "浏览/收藏", value: `${dashboard.views} / ${dashboard.favorites}` },
          { label: "售后率", value: dashboard.afterSaleRate }
        ]}
        title="经营数据"
        variant="large"
      />

      <WorkbenchQuickEntryCard
        description="把销售、配送、消息和添加商品入口收在同一张快捷卡片中。"
        entries={[
          { icon: PackageCheck, label: "销售列表", text: "订单卡片、详情弹窗、订单诉求" },
          { icon: Truck, label: "配送入口", text: "待配送、配送中、物流单号、人工配送" },
          { icon: MessageCircle, label: "消息列表", text: "售后置顶、常规交流对话" },
          { icon: Plus, label: "添加产品", text: "名称、型号、售价、库存、图片" }
        ]}
        icon={ClipboardCheck}
      />

      <div className="card-list grid gap-[10px]">
        {merchantProducts.map((product) => (
          <MerchantProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}

function MerchantProductCard({ product }: { product: MerchantProduct }) {
  return (
    <article className="flow-card p-[14px]">
      <div className="card-title flex items-center justify-between gap-[10px]">
        <Store size={18} />
        <div className="merchant-product-copy">
          <strong>{product.name}</strong>
          <span>
            {product.code} · {product.model}
          </span>
        </div>
        <em>{formatCurrency(product.price)}</em>
      </div>
      <div className="meta-line mt-[10px] flex flex-wrap items-center gap-[6px] text-[13px] leading-[1.45] text-[var(--h5-muted)]">
        <span>{product.category}</span>
        <span>库存 {product.stock}</span>
        <span>限购 {product.purchaseLimit}</span>
        <span>{product.status}</span>
        <span>{product.visible}</span>
      </div>
      <div className="product-actions mt-[12px] flex flex-wrap items-center justify-between gap-[10px]">
        <span>商户发布商品交易责任边界为商户自售。</span>
        <div className="merchant-product-actions">
          <button
            className="ghost-button button-inline-layout min-h-[34px] px-[10px] py-[8px] text-[var(--h5-muted)]"
            type="button"
          >
            上下架
          </button>
          <button
            className="ghost-button button-inline-layout min-h-[34px] px-[10px] py-[8px] text-[var(--h5-muted)]"
            type="button"
          >
            隐藏
          </button>
          <button
            className="ghost-button button-inline-layout min-h-[34px] px-[10px] py-[8px] text-[var(--h5-muted)]"
            type="button"
          >
            编辑
          </button>
          <button
            className="primary-button button-inline-layout min-h-[34px] px-[10px] py-[8px] text-white"
            type="button"
          >
            价格
          </button>
        </div>
      </div>
    </article>
  );
}
