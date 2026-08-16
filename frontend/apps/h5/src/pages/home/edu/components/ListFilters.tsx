import { parseTutorSubjects } from "@shared/tutorModel";

/** 家教列表筛选组件属性。 */
interface ListFiltersProps {
  /** 当前可筛选的家教需求源数据。 */
  demands: TutorDemand[];
  /** 当前选中的学校筛选项，空字符串表示全部学校。 */
  selectedSchool: string;
  /** 当前选中的学科筛选项，空字符串表示全部学科。 */
  selectedSubject: string;
  /** 当前家教列表排序方式。 */
  selectedSort: TutorSort;
  /** 切换学校筛选项。 */
  onSchoolChange: (school: string) => void;
  /** 切换学科筛选项。 */
  onSubjectChange: (subject: string) => void;
  /** 切换排序方式。 */
  onSortChange: (sort: TutorSort) => void;
}

/** 家教筛选面板类型。 */
type ActivePanel = "school" | "subject" | "sort" | null;

/** 去重并移除空值，生成筛选按钮选项。 */
function getFilterOptions(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

/** 家长端家教列表筛选条，负责学校、学科和排序选项的展开与选择。 */
export function ListFilters({
  demands,
  onSchoolChange,
  onSortChange,
  onSubjectChange,
  selectedSchool,
  selectedSort,
  selectedSubject
}: ListFiltersProps) {
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const schoolOptions = useMemo(
    () =>
      getFilterOptions(
        demands.flatMap((demand) => [demand.school, ...demand.applicants.map((applicant) => applicant.school)])
      ),
    [demands]
  );
  const subjectOptions = useMemo(
    () => getFilterOptions(demands.flatMap((demand) => parseTutorSubjects(demand.subject))),
    [demands]
  );
  const selectedSortLabel = tutorSorts.find((item) => item.key === selectedSort)?.label ?? "系统推荐";

  /** 切换当前展开面板；再次点击同一入口时收起。 */
  function handleTogglePanel(panel: Exclude<ActivePanel, null>) {
    setActivePanel((currentPanel) => (currentPanel === panel ? null : panel));
  }

  /** 选中学校后收起筛选面板。 */
  function handleSelectSchool(school: string) {
    onSchoolChange(school);
    setActivePanel(null);
  }

  /** 选中学科后收起筛选面板。 */
  function handleSelectSubject(subject: string) {
    onSubjectChange(subject);
    setActivePanel(null);
  }

  /** 选中排序后收起筛选面板。 */
  function handleSelectSort(sort: TutorSort) {
    onSortChange(sort);
    setActivePanel(null);
  }

  return (
    <div className="tutor-toolbar grid gap-[8px]">
      <div className="tutor-toolbar-row flex items-center gap-[8px]">
        <button
          aria-expanded={activePanel === "school"}
          aria-label={`学校筛选，当前${selectedSchool || "全部学校"}`}
          className={`tutor-toolbar-button ${activePanel === "school" ? "active" : ""}`}
          onClick={() => handleTogglePanel("school")}
          type="button"
        >
          <Filter size={17} />
          <span>学校</span>
        </button>
        <button
          aria-expanded={activePanel === "subject"}
          aria-label={`学科筛选，当前${selectedSubject || "全部学科"}`}
          className={`tutor-toolbar-button ${activePanel === "subject" ? "active" : ""}`}
          onClick={() => handleTogglePanel("subject")}
          type="button"
        >
          <GraduationCap size={17} />
          <span>学科</span>
        </button>
        <button
          aria-expanded={activePanel === "sort"}
          aria-label={`排序，当前${selectedSortLabel}`}
          className={`tutor-toolbar-button ${activePanel === "sort" ? "active" : ""}`}
          onClick={() => handleTogglePanel("sort")}
          type="button"
        >
          <ArrowDownUp size={17} />
          <span>排序</span>
        </button>
      </div>

      {activePanel === "school" ? (
        <div className="tutor-option-panel flex flex-wrap gap-[8px]" aria-label="家教学校筛选">
          {["", ...schoolOptions].map((school) => (
            <button
              className={selectedSchool === school ? "active" : ""}
              key={school || "all"}
              onClick={() => handleSelectSchool(school)}
              type="button"
            >
              {school || "全部学校"}
            </button>
          ))}
        </div>
      ) : null}

      {activePanel === "subject" ? (
        <div className="tutor-option-panel flex flex-wrap gap-[8px]" aria-label="家教学科筛选">
          {["", ...subjectOptions].map((subject) => (
            <button
              className={selectedSubject === subject ? "active" : ""}
              key={subject || "all"}
              onClick={() => handleSelectSubject(subject)}
              type="button"
            >
              {subject || "全部学科"}
            </button>
          ))}
        </div>
      ) : null}

      {activePanel === "sort" ? (
        <div className="tutor-option-panel flex flex-wrap gap-[8px]" aria-label="家教排序">
          {tutorSorts.map((item) => (
            <button
              className={item.key === selectedSort ? "active" : ""}
              key={item.key}
              onClick={() => handleSelectSort(item.key)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}

      <div className="tutor-live-status">
        <span>
          当前筛选：{selectedSchool || "全部学校"} · {selectedSubject || "全部学科"} · {selectedSortLabel}
        </span>
      </div>
    </div>
  );
}
