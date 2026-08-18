/** 兼职列表工具栏展开的筛选面板，仅供本组件内部管理开合状态。 */
type SearchToolbarPanel = "area" | "sort" | null;

/** 兼职搜索/地点/排序筛选栏属性，受控组件，对外只暴露关键词、地点和排序的选中值。 */
interface SearchToolbarProps {
  areaOptions: string[];
  jobFilter: JobFilter;
  keyword: string;
  onJobFilterChange: (filter: JobFilter) => void;
  onKeywordChange: (keyword: string) => void;
  onSelectedAreaChange: (area: string) => void;
  selectedArea: string;
}

/**
 * 兼职列表的搜索 + 地点/排序筛选工具栏，面板展开态、排序文案等展示逻辑收在组件内部，
 * 父级只需要提供数据源（地点候选集合）和当前选中值。
 */
export function SearchToolbar({
  areaOptions,
  jobFilter,
  keyword,
  onJobFilterChange,
  onKeywordChange,
  onSelectedAreaChange,
  selectedArea
}: SearchToolbarProps) {
  const [activePanel, setActivePanel] = useState<SearchToolbarPanel>(null);
  const selectedSortLabel = jobFilters.find((item) => item.key === jobFilter)?.label ?? "最新发布";

  return (
    <div className="delegation-toolbar grid gap-[8px]">
      <div className="delegation-toolbar-row flex items-center gap-[8px]">
        <label className="delegation-search min-w-0 flex-1">
          <span className="sr-only">搜索兼职</span>
          <input
            onChange={(event) => onKeywordChange(event.target.value)}
            placeholder="搜索兼职、发布方或地点"
            type="search"
            value={keyword}
          />
        </label>
        <button
          aria-expanded={activePanel === "area"}
          aria-label={`地点筛选，当前${selectedArea || "全部地点"}`}
          className={`delegation-icon-button ${activePanel === "area" ? "active" : ""}`}
          onClick={() => setActivePanel((panel) => (panel === "area" ? null : "area"))}
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

      {activePanel === "area" ? (
        <div className="delegation-option-panel flex flex-wrap gap-[8px]" aria-label="兼职地点筛选">
          {["", ...areaOptions].map((area) => (
            <button
              className={selectedArea === area ? "active" : ""}
              key={area || "all"}
              onClick={() => {
                onSelectedAreaChange(area);
                setActivePanel(null);
              }}
              type="button"
            >
              {area || "全部地点"}
            </button>
          ))}
        </div>
      ) : null}

      {activePanel === "sort" ? (
        <div className="delegation-option-panel flex flex-wrap gap-[8px]" aria-label="兼职排序">
          {jobFilters.map((item) => (
            <button
              className={item.key === jobFilter ? "active" : ""}
              key={item.key}
              onClick={() => {
                onJobFilterChange(item.key);
                setActivePanel(null);
              }}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}

      <div className="delegation-live-status">
        <span>
          当前筛选：{selectedArea || "全部地点"} · {selectedSortLabel}
        </span>
      </div>
    </div>
  );
}
