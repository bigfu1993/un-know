/** Part-time page: owns student filter state and switches to merchant workbench by role. */
export function PartTime({ role, dashboard, jobs }: { role: Role; dashboard: MerchantDashboard; jobs: PartTimeJob[] }) {
  const [jobFilter, setJobFilter] = useState<JobFilter>("latest");

  if (role === "merchant") {
    return <MerchantPartTime dashboard={dashboard} jobs={jobs} />;
  }

  const visibleJobs = jobFilter === "hourly" ? [...jobs].sort((a, b) => b.hourlyPay - a.hourlyPay) : jobs;

  return (
    <section className="module-stack grid gap-[10px]">
      <SectionHeader
        countText={`${visibleJobs.length} 个`}
        eyebrow="中长期兼职、短期任务、平台合作兼职"
        title="兼职列表与报名"
      />

      <div
        className="segmented-control my-[12px] flex gap-[8px] flex-wrap min-w-0 flex-1 font-bold"
        aria-label="兼职筛选"
      >
        {jobFilters.map((item) => (
          <button
            className={item.key === jobFilter ? "active" : ""}
            key={item.key}
            onClick={() => setJobFilter(item.key)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="card-list grid gap-[10px]">
        {visibleJobs.map((job) => (
          <PartTimeJobCard job={job} key={job.id} mode="student" />
        ))}
      </div>

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
        title="快捷入口"
      />
      <div className="card-list grid gap-[10px]">
        {jobs.map((job) => (
          <PartTimeJobCard job={job} key={job.id} mode="merchant" />
        ))}
      </div>
    </section>
  );
}
