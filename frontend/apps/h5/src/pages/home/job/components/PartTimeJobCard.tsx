/** 按学生和商户两种操作布局展示的兼职卡片。 */
export function PartTimeJobCard({ job, mode = "student" }: { job: PartTimeJob; mode?: "student" | "merchant" }) {
  if (mode === "merchant") {
    return (
      <article className="flow-card p-[14px]">
        <div className="card-title flex items-center justify-between gap-[10px]">
          <BriefcaseBusiness size={18} />
          <div className="merchant-job-title-copy">
            <strong>{job.title}</strong>
            <span>负责人：王店长 188****2201</span>
          </div>
          <em>{job.status}</em>
        </div>
        <p>{job.description}</p>
        <div className="meta-line mt-[10px] flex flex-wrap items-center gap-[6px] text-[13px] leading-[1.45] text-[#657181]">
          <span>人数 6</span>
          <span>{job.period}</span>
          <span>{job.requirement}</span>
          <span>{job.signRule}</span>
        </div>
        <div className="product-actions mt-[12px] flex flex-wrap items-center justify-between gap-[10px]">
          <span>{job.fundingState}，可配置签到保证金。</span>
          <div className="merchant-job-action-buttons">
            <button
              className="ghost-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-[#475466]"
              type="button"
            >
              发布
            </button>
            <button
              className="ghost-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-[#475466]"
              type="button"
            >
              取消发布
            </button>
            <button
              className="ghost-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-[#475466]"
              type="button"
            >
              招募结束
            </button>
            <button
              className="primary-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white"
              type="button"
            >
              编辑
            </button>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="flow-card p-[14px]">
      <div className="card-title flex items-center justify-between gap-[10px]">
        <BriefcaseBusiness size={18} />
        <div className="student-job-title-copy">
          <strong>{job.title}</strong>
          <span>{job.publisher.nickname}</span>
        </div>
        <em>{formatCurrency(job.hourlyPay)}/时</em>
      </div>
      <p>{job.description}</p>
      <div className="meta-line mt-[10px] flex flex-wrap items-center gap-[6px] text-[13px] leading-[1.45] text-[#657181]">
        <span>{job.period}</span>
        <span>{job.location}</span>
        <span>{job.status}</span>
        <span>{job.fundingState}</span>
      </div>
      <div className="form-preview mt-[10px] grid gap-[8px]">
        {job.formFields.map((field) => (
          <span key={field}>{field}</span>
        ))}
      </div>
      <div className="product-actions mt-[12px] flex flex-wrap items-center justify-between gap-[10px]">
        <span>{job.signRule}</span>
        <div className="student-job-action-buttons">
          <button
            className="ghost-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-[#475466]"
            type="button"
          >
            <ClipboardCheck size={15} /> 报名快照
          </button>
          <button
            className="primary-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white"
            type="button"
          >
            <CheckCircle2 size={15} /> 报名
          </button>
        </div>
      </div>
    </article>
  );
}
