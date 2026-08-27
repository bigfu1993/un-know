import { Banknote, BriefcaseBusiness, CalendarClock, CheckCircle2, ClipboardCheck, MapPin, Tags, UserRound } from "lucide-react";

/** 按学生和商户两种操作布局展示的兼职卡片。 */
export function PartTimeJobCard({ job, mode = "student" }: { job: PartTimeJob; mode?: "student" | "merchant" }) {
  return (
    <article className="flow-card p-[14px]">
      {mode === "merchant" ? (
        <>
          <div className="card-title flex items-center justify-between gap-[10px]">
            <BriefcaseBusiness size={18} />
            <div className="merchant-job-title-copy min-w-0 flex-1">
              <strong>{job.title}</strong>
              <span>负责人：王店长 188****2201</span>
            </div>
            <em>{job.status}</em>
          </div>
          <p>{job.description}</p>
          <div className="job-task-fields grid gap-[7px] mt-[10px]">
            <span>
              <UserRound size={14} />
              报名人数：6 人
            </span>
            <span>
              <CalendarClock size={14} />
              兼职周期：{job.period}
            </span>
            <span>
              <ClipboardCheck size={14} />
              要求：{job.requirement}
            </span>
            <span>
              <Banknote size={14} />
              签到规则：{job.signRule}
            </span>
            <span>
              <Banknote size={14} />
              资金状态：{job.fundingState}，可配置签到保证金
            </span>
          </div>
          <div className="product-actions mt-[12px] flex flex-wrap items-center justify-between gap-[10px]">
            <div className="merchant-job-action-buttons">
              <button
                className="ghost-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-[var(--h5-muted)]"
                type="button"
              >
                发布
              </button>
              <button
                className="ghost-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-[var(--h5-muted)]"
                type="button"
              >
                取消发布
              </button>
              <button
                className="ghost-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-[var(--h5-muted)]"
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
        </>
      ) : (
        <>
          <div className="card-title flex items-center justify-between gap-[10px]">
            <BriefcaseBusiness size={18} />
            <div className="student-job-title-copy min-w-0 flex-1">
              <strong>{job.title}</strong>
              <span>{job.publisher.nickname}</span>
            </div>
            <em>{formatCurrency(job.hourlyPay)}/时</em>
          </div>
          <p>{job.description}</p>
          <div className="job-task-fields grid gap-[7px] mt-[10px]">
            <span>
              <CalendarClock size={14} />
              兼职周期：{job.period}
            </span>
            <span>
              <MapPin size={14} />
              工作地点：{job.location}
            </span>
            <span>
              <Tags size={14} />
              当前状态：{job.status}
            </span>
            <span>
              <Banknote size={14} />
              资金状态：{job.fundingState}
            </span>
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
                className="ghost-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-[var(--h5-muted)]"
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
        </>
      )}
    </article>
  );
}
