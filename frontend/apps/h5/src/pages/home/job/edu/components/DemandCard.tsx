import { getTutorDemandBudgetLabel } from "@tools/tutorDemand";

/** 家长端家教招募列表的单张需求卡片属性。 */
interface DemandCardProps {
  demand: TutorDemand;
}

/** 展示家教需求、申请人摘要和卡片级操作。 */
export function DemandCard({ demand }: DemandCardProps) {
  return (
    <article className="flow-card p-[14px]">
      <div className="card-title flex items-center justify-between gap-[10px]">
        <GraduationCap size={18} />
        <div className="tutor-demand-title-copy">
          <strong>
            {demand.child} · {demand.subject}
          </strong>
          <span>
            {demand.school} · {getTutorDemandBudgetLabel(demand.budget)}
          </span>
        </div>
        <em>{demand.status}</em>
      </div>
      <div className="card-list nested mt-[12px] grid gap-[10px]">
        {demand.applicants.map((applicant) => (
          <article className="applicant-row grid gap-[10px] py-[10px]" key={applicant.id}>
            <div className="tutor-applicant-summary-copy">
              <strong>{applicant.nickname}</strong>
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
  );
}
