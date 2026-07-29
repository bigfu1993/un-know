import "./index.less";
import { TutorTrialJobCard } from "@components/PageWidgets";

/** 学生兼职页展开的工具面板。 */
type PartTimeToolbarPanel = "area" | "sort" | null;

/** 从兼职地点中提取适合做快速筛选的区域文案。 */
function getPartTimeArea(location: string) {
  return location.split(/->|→|·|,|，|-|\s+/)[0]?.trim() || "未知区域";
}

/** 汇总兼职可搜索文本，保持搜索逻辑集中。 */
function getPartTimeSearchText(job: PartTimeJob) {
  return [
    job.title,
    job.description,
    job.publisher.nickname,
    job.location,
    job.period,
    job.requirement,
    job.status,
    job.fundingState,
    ...job.formFields
  ]
    .join(" ")
    .toLowerCase();
}

/** 兼职页面，维护学生筛选状态，并按角色切换商户工作台。 */
export function PartTime({
  role,
  dashboard,
  jobs,
  tutorJobs = [],
  onApplyTutorTrial
}: {
  role: Role;
  dashboard: MerchantDashboard;
  jobs: PartTimeJob[];
  tutorJobs?: TutorTrialJob[];
  onApplyTutorTrial?: (job: TutorTrialJob, availability: string) => Promise<unknown> | unknown;
}) {
  const [keyword, setKeyword] = useState("");
  const [activePanel, setActivePanel] = useState<PartTimeToolbarPanel>(null);
  const [selectedArea, setSelectedArea] = useState("");
  const [jobFilter, setJobFilter] = useState<JobFilter>("latest");
  const areaOptions = useMemo(
    () => Array.from(new Set([...jobs.map((job) => getPartTimeArea(job.location)), ...tutorJobs.map((job) => getPartTimeArea(job.address))])),
    [jobs, tutorJobs]
  );
  const visibleJobs = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    const filteredJobs = jobs.filter((job) => {
      const keywordMatched = normalizedKeyword ? getPartTimeSearchText(job).includes(normalizedKeyword) : true;
      const areaMatched = selectedArea ? getPartTimeArea(job.location) === selectedArea : true;

      return keywordMatched && areaMatched;
    });

    return jobFilter === "hourly" ? [...filteredJobs].sort((a, b) => b.hourlyPay - a.hourlyPay) : filteredJobs;
  }, [jobFilter, jobs, keyword, selectedArea]);
  const visibleTutorJobs = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return tutorJobs.filter((job) => {
      const searchText = [job.title, job.publisher.nickname, job.subject, job.address, job.period, job.requirement]
        .join(" ")
        .toLowerCase();
      const keywordMatched = normalizedKeyword ? searchText.includes(normalizedKeyword) : true;
      const areaMatched = selectedArea ? getPartTimeArea(job.address) === selectedArea : true;

      return keywordMatched && areaMatched;
    });
  }, [keyword, selectedArea, tutorJobs]);
  const selectedSortLabel = jobFilters.find((item) => item.key === jobFilter)?.label ?? "最新发布";
  const totalVisibleCount = visibleJobs.length + visibleTutorJobs.length;

  if (role === "merchant") {
    return <MerchantPartTime dashboard={dashboard} jobs={jobs} />;
  }

  return (
    <section className="module-stack part-time-list-page grid gap-[10px]">
      <SectionHeader countText={`${totalVisibleCount} 个`} eyebrow="中长期兼职、短期任务、家教兼职" title="兼职列表与报名" />

      <div className="delegation-toolbar grid gap-[8px]">
        <div className="delegation-toolbar-row flex items-center gap-[8px]">
          <label className="delegation-search min-w-0 flex-1">
            <span className="sr-only">搜索兼职</span>
            <input
              onChange={(event) => setKeyword(event.target.value)}
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
                  setSelectedArea(area);
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
                  setJobFilter(item.key);
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

      <div className="card-list part-time-list-scroll grid gap-[10px]">
        {visibleTutorJobs.map((job) => (
          <TutorTrialJobCard job={job} key={job.id} onApplyTrial={onApplyTutorTrial} />
        ))}
        {visibleJobs.map((job) => (
          <PartTimeJobCard job={job} key={job.id} />
        ))}
        {totalVisibleCount === 0 ? (
          <article className="empty-state p-[16px] text-center">
            <strong>暂无匹配兼职</strong>
            <span>换个关键词、地点或排序方式再试试。</span>
          </article>
        ) : null}
        <article className="flow-card p-[14px] compact">
          <div className="card-title flex items-center justify-between gap-[10px] min-w-0">
            <CalendarClock size={18} />
            <strong>学生报名状态流</strong>
          </div>
          <div className="status-flow mt-[10px] grid gap-[8px] text-center">
            {["已报名", "待筛选", "未通过", "已确认/待签到", "已签到", "进行中", "结算中", "已结算"].map((status) => (
              <span key={status}>{status}</span>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}

function MerchantPartTime({ dashboard, jobs }: { dashboard: MerchantDashboard; jobs: PartTimeJob[] }) {
  return (
    <section className="module-stack grid gap-[10px]">
      <SectionHeader countText="2 个招募中" eyebrow="发布兼职、筛选名单、招募结束" title="兼职工作台" />
      <WorkbenchInfoCard
        description="展示招募沉淀、历史人员和发布前资金状态。"
        icon={BriefcaseBusiness}
        metrics={[
          { label: "已完成招募", value: "12 次" },
          { label: "历史人员", value: "68 人" },
          { label: "岗位保证金", value: dashboard.depositStatus },
          { label: "钱款状态", value: "预算托管中" }
        ]}
        title="招募数据"
      />
      <WorkbenchQuickEntryCard
        description="发布、名单筛选、报名表和结算配置聚合为兼职快捷入口。"
        entries={[
          { icon: Plus, label: "发布兼职", text: "填写主题、周期、人数、薪资、结算日期" },
          { icon: ClipboardCheck, label: "报名表", text: "籍贯、年龄、身高、性别、体重、近视、是否本地" },
          { icon: UserRound, label: "筛选名单", text: "查看报名信息、确认招募、邮件发送名单" },
          { icon: WalletCards, label: "结算配置", text: "岗位保证金、签到保证金、结束后结算时间" }
        ]}
        icon={Plus}
      />
      <div className="card-list grid gap-[10px]">
        {jobs.map((job) => (
          <PartTimeJobCard job={job} key={job.id} mode="merchant" />
        ))}
      </div>
    </section>
  );
}
