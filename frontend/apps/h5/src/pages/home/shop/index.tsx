import "./index.less";
import { useCheckoutTrigger } from "@h5/overlays/checkout/provider";

/** 优选商品排序方式。 */
type ProductSortMode = "default" | "priceAsc" | "priceDesc" | "stock";

/** 优选页展开的工具面板。 */
type ProductToolbarPanel = "filter" | "sort" | null;

/** 商品接口返回前使用的稳定空列表，减少无数据阶段的重复派生。 */
const emptyProducts: ProductSummary[] = [];

/** 优选商品排序选项。 */
const productSortOptions: Array<{ label: string; value: ProductSortMode }> = [
  { label: "默认排序", value: "default" },
  { label: "价格从低到高", value: "priceAsc" },
  { label: "价格从高到低", value: "priceDesc" },
  { label: "库存优先", value: "stock" }
];

/** 汇总商品可搜索文本，避免页面内重复拼接搜索字段。 */
function getProductSearchText(product: ProductSummary) {
  return [product.title, product.description, product.category, product.source, product.location]
    .join(" ")
    .toLowerCase();
}

/** 优选商品页面，维护商品筛选、排序和购买确认入口。 */
export function Featured({ role }: { role: Role }) {
  const { openCheckout, purchasePending } = useCheckoutTrigger();
  const [keyword, setKeyword] = useState("");
  const [activePanel, setActivePanel] = useState<ProductToolbarPanel>(null);
  const [productFilter, setProductFilter] = useState<ProductFilter>("selfRun");
  const [sortMode, setSortMode] = useState<ProductSortMode>("default");
  const { data: products = emptyProducts, isLoading: isProductsLoading } = useProducts(role);
  const filteredProducts = useMemo(
    () => filterProducts(products, role, productFilter),
    [productFilter, products, role]
  );
  const visibleProducts = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    const searchedProducts = normalizedKeyword
      ? filteredProducts.filter((product) => getProductSearchText(product).includes(normalizedKeyword))
      : filteredProducts;

    return [...searchedProducts].sort((leftProduct, rightProduct) => {
      if (sortMode === "priceAsc") {
        return leftProduct.price - rightProduct.price;
      }
      if (sortMode === "priceDesc") {
        return rightProduct.price - leftProduct.price;
      }
      if (sortMode === "stock") {
        return rightProduct.stock - leftProduct.stock;
      }

      return 0;
    });
  }, [filteredProducts, keyword, sortMode]);
  const selectedFilterLabel = productFilters.find((item) => item.key === productFilter)?.label ?? "全部";
  const selectedSortLabel = productSortOptions.find((option) => option.value === sortMode)?.label ?? "默认排序";
  const title = role === "parent" ? "快递商品" : "优选商品/服务";

  return (
    <section className="module-stack product-list-page grid gap-[10px]">
      <SectionHeader
        countText={isProductsLoading ? "加载中" : `${visibleProducts.length} 个`}
        eyebrow={role === "parent" ? "家长端固定快递配送" : "自营耗材、平台闲置、商户商品与服务"}
        title={title}
      />

      <div className="delegation-toolbar grid gap-[8px]">
        <div className="delegation-toolbar-row flex items-center gap-[8px]">
          <label className="delegation-search min-w-0 flex-1">
            <span className="sr-only">搜索商品</span>
            <input
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="搜索商品、服务或地点"
              type="search"
              value={keyword}
            />
          </label>
          <button
            aria-expanded={activePanel === "filter"}
            aria-label={`优选筛选，当前${selectedFilterLabel}`}
            className={`delegation-icon-button ${activePanel === "filter" ? "active" : ""}`}
            onClick={() => setActivePanel((panel) => (panel === "filter" ? null : "filter"))}
            type="button"
          >
            <Filter size={17} />
          </button>
          <button
            aria-expanded={activePanel === "sort"}
            aria-label={`排序，当前${selectedSortLabel}`}
            className={`delegation-icon-button ${activePanel === "sort" ? "active" : ""}`}
            onClick={() => setActivePanel((panel) => (panel === "sort" ? null : "sort"))}
            type="button"
          >
            <ArrowDownUp size={17} />
          </button>
        </div>

        {activePanel === "filter" ? (
          <div className="delegation-option-panel flex flex-wrap gap-[8px]" aria-label="优选筛选">
            {productFilters.map((item) => (
              <button
                className={item.key === productFilter ? "active" : ""}
                key={item.key}
                onClick={() => {
                  setProductFilter(item.key);
                  setActivePanel(null);
                }}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </div>
        ) : null}

        {activePanel === "sort" ? (
          <div className="delegation-option-panel flex flex-wrap gap-[8px]" aria-label="商品排序">
            {productSortOptions.map((option) => (
              <button
                className={sortMode === option.value ? "active" : ""}
                key={option.value}
                onClick={() => {
                  setSortMode(option.value);
                  setActivePanel(null);
                }}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : null}

        <div className="delegation-live-status">
          <span>
            当前筛选：{selectedFilterLabel} · {selectedSortLabel}
          </span>
        </div>
      </div>

      <div className="product-list product-list-scroll grid gap-[10px]" aria-label="商品和服务列表">
        {visibleProducts.map((product) => (
          <ProductListCard
            key={product.id}
            onOpenCheckout={openCheckout}
            product={product}
            purchasePending={purchasePending}
            role={role}
          />
        ))}
        {visibleProducts.length === 0 ? (
          <article className="empty-state p-[16px] text-center">
            <strong>暂无匹配商品</strong>
            <span>换个关键词、筛选或排序方式再试试。</span>
          </article>
        ) : null}
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
      </div>
    </section>
  );
}
