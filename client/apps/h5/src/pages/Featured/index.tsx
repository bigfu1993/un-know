/** 优选商品页面，维护商品筛选状态，购买确认由 App 统一处理。 */
export function Featured({
  role,
  purchasePending,
  onOpenCheckout
}: {
  role: Role;
  purchasePending: boolean;
  onOpenCheckout: (product: ProductSummary) => void;
}) {
  const [productFilter, setProductFilter] = useState<ProductFilter>("selfRun");
  const { data: products = [], isLoading: isProductsLoading } = useProducts(role);
  const visibleProducts = filterProducts(products, role, productFilter);
  const title = role === "parent" ? "快递商品" : "优选商品/服务";

  return (
    <section className="module-stack grid gap-[10px]">
      <SectionHeader
        countText={isProductsLoading ? "加载中" : `${visibleProducts.length} 个`}
        eyebrow={role === "parent" ? "家长端固定快递配送" : "自营耗材、平台闲置、商户商品与服务"}
        title={title}
      />

      <div className="segmented-control my-[12px] flex min-w-0 flex-wrap gap-[8px] font-bold" aria-label="优选筛选">
        {productFilters.map((item) => (
          <button
            className={item.key === productFilter ? "active" : ""}
            key={item.key}
            onClick={() => setProductFilter(item.key)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="product-list grid gap-[10px]" aria-label="商品和服务列表">
        {visibleProducts.map((product) => (
          <ProductListCard
            key={product.id}
            onOpenCheckout={onOpenCheckout}
            product={product}
            purchasePending={purchasePending}
            role={role}
          />
        ))}
      </div>

      <article className="flow-card compact p-[14px]">
        <div className="card-title flex min-w-0 items-center justify-between gap-[10px]">
          <PackageCheck size={18} />
          <strong>购买订单状态</strong>
        </div>
        <div className="status-flow mt-[10px] grid gap-[8px] text-center">
          {["待配送/备货中", "配送中", "已送达", "待确认", "已完成"].map((status) => (
            <span key={status}>{status}</span>
          ))}
        </div>
        <p>待确认 48 小时自动完成；已完成 7*24 小时内可申请退款，需售后同意后进入退款流程。</p>
      </article>
    </section>
  );
}
