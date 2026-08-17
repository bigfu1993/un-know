/** 进行中列表筛选标签配置，仅供本组件内部使用，不对外暴露。 */
const filterOptions: Array<{ label: string; value: OngoingOrderFilter }> = [
  { label: "全部", value: "all" },
  { label: "优选", value: "featured" },
  { label: "委托", value: "delegation" },
  { label: "狩猎", value: "hunting" },
  { label: "家教", value: "tutor" }
];

/** 进行中列表分类筛选标签属性，受控组件，对外只暴露当前选中的筛选值。 */
interface FilterTagsProps {
  onChange: (value: OngoingOrderFilter) => void;
  value: OngoingOrderFilter;
}

/** 进行中事项分类筛选标签，标签配置和渲染都收在组件内部，父级只关心选中了哪个筛选值。 */
export function FilterTags({ onChange, value }: FilterTagsProps) {
  return (
    <div className="ongoing-filter-tags flex flex-wrap gap-[8px]" aria-label="筛选进行中事项">
      {filterOptions.map((option) => (
        <button
          className={value === option.value ? "active" : ""}
          key={option.value}
          onClick={() => onChange(option.value)}
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
