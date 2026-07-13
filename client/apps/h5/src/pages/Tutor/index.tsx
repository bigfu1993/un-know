/** 家长家教招募页面，维护家教需求卡片的排序状态。 */
export function Tutor({ tutorDemands }: { tutorDemands: TutorDemand[] }) {
  const [tutorSort, setTutorSort] = useState<TutorSort>("recommended");

  return (
    <section className="module-stack grid gap-[10px]">
      <SectionHeader
        countText="1 个需求"
        eyebrow="按学校、学科筛选，按收藏、受聘次数、系统推荐、可兼职时长排序"
        title="家教招募"
      />
      <div className="segmented-control wrap my-[12px] flex gap-[8px]" aria-label="家教排序">
        {tutorSorts.map((item) => (
          <button
            className={item.key === tutorSort ? "active" : ""}
            key={item.key}
            onClick={() => setTutorSort(item.key)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>
      <article className="flow-card compact p-[14px]">
        <div className="card-title flex items-center justify-between gap-[10px]">
          <Plus size={18} />
          <strong>发布家教需求</strong>
        </div>
        <p>发布时选择孩子档案，强校验年级和科目；可填写是否试课、试课时长和试课费用。</p>
      </article>
      {tutorDemands.map((demand) => (
        <article className="flow-card p-[14px]" key={demand.id}>
          <div className="card-title flex items-center justify-between gap-[10px]">
            <GraduationCap size={18} />
            <div>
              <strong>
                {demand.child} · {demand.subject}
              </strong>
              <span>
                {demand.school} · {demand.budget}
              </span>
            </div>
            <em>{demand.status}</em>
          </div>
          <div className="card-list nested mt-[12px] grid gap-[10px]">
            {demand.applicants.map((applicant) => (
              <article className="applicant-row grid gap-[10px] py-[10px]" key={applicant.id}>
                <div>
                  <strong>{applicant.name}</strong>
                  <p>
                    {applicant.school} · {applicant.major} · GPA {applicant.gpa}
                  </p>
                  <div className="meta-line mt-[10px] flex flex-wrap items-center gap-[6px] text-[13px] leading-[1.45] text-[#657181]">
                    <span>受聘 {applicant.hiredTimes} 次</span>
                    <span>{applicant.availability}</span>
                    <span>{applicant.status}</span>
                  </div>
                </div>
                <div className="vertical-actions grid gap-[6px]">
                  <button
                    className="ghost-button inline-flex min-h-[32px] items-center justify-center gap-[5px] px-[10px] py-[7px] text-[#475466]"
                    type="button"
                  >
                    拒绝
                  </button>
                  <button
                    className="ghost-button inline-flex min-h-[32px] items-center justify-center gap-[5px] px-[10px] py-[7px] text-[#475466]"
                    type="button"
                  >
                    交换电话
                  </button>
                  <button
                    className="primary-button inline-flex min-h-[32px] items-center justify-center gap-[5px] px-[10px] py-[7px] text-white"
                    type="button"
                  >
                    确认招募
                  </button>
                </div>
              </article>
            ))}
          </div>
          <div className="product-actions mt-[12px] flex flex-wrap items-center justify-between gap-[10px]">
            <span>完成家教后可互评，家长可收藏优秀学生。</span>
            <button
              className="ghost-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-[#475466]"
              type="button"
            >
              <Heart size={15} /> 收藏学生
            </button>
          </div>
        </article>
      ))}
    </section>
  );
}
