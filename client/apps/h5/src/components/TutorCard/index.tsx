import { BadgeCheck, GraduationCap } from "lucide-react";
import { tutorCertificationStatusLabels, type TutorCardData, type TutorCardMode } from "./model";

/** 家教卡片属性。 */
export interface TutorCardProps extends TutorCardData {
  className?: string;
  mode: TutorCardMode;
  onOpenInfo?: () => void;
  onStartCertification?: () => void;
}

/** 家教资格卡片，供我的页和头像弹窗复用。 */
export function TutorCard({
  certificationStatus,
  className,
  grade,
  level,
  mode,
  onOpenInfo,
  onStartCertification,
  subject
}: TutorCardProps) {
  const rootClassName = ["tutor-card", `tutor-card--${mode}`, className].filter(Boolean).join(" ");
  const statusText = tutorCertificationStatusLabels[certificationStatus];
  const subjectButtonLabel = mode === "simple" ? subject : `${subject} · ${grade}`;

  if (mode === "entry") {
    return (
      <button className={rootClassName} onClick={onStartCertification} type="button">
        <span className="tutor-card-icon grid h-[40px] w-[40px] shrink-0 place-items-center">
          <GraduationCap size={21} />
        </span>
        <span className="tutor-card-main min-w-0">
          <strong>认证家教</strong>
        </span>
      </button>
    );
  }

  if (mode === "status") {
    return (
      <article className={rootClassName}>
        <div className="tutor-card-head flex items-center gap-[10px]">
          <span className="tutor-card-icon grid h-[40px] w-[40px] shrink-0 place-items-center">
            <GraduationCap size={21} />
          </span>
          <div className="tutor-card-main min-w-0 flex-1">
            <strong>{statusText}</strong>
            <em>{certificationStatus === "reviewing" ? "认证资料已提交，等待平台审核。" : "家教资格当前不可用。"}</em>
          </div>
          <span className={`tutor-status tutor-status--${certificationStatus}`}>{statusText}</span>
        </div>
      </article>
    );
  }

  const content = (
    <>
      <div className="tutor-card-head flex items-center gap-[10px]">
        <span className="tutor-card-icon grid h-[40px] w-[40px] shrink-0 place-items-center">
          <GraduationCap size={21} />
        </span>
        <div className="tutor-card-main min-w-0 flex-1">
          <strong>家教卡片</strong>
          <em>{mode === "simple" ? subject : `${subject} · ${grade}`}</em>
        </div>
        <span className={`tutor-status tutor-status--${certificationStatus}`}>{statusText}</span>
      </div>

      {mode === "default" ? (
        <div className="tutor-card-meta grid gap-[8px]">
          <span>
            <em>学科/年级</em>
            <strong>{subjectButtonLabel}</strong>
          </span>
          <span>
            <em>等级</em>
            <strong>{level}</strong>
          </span>
        </div>
      ) : (
        <div className="tutor-card-meta grid gap-[8px]">
          <span>
            <em>学科</em>
            <strong>{subjectButtonLabel}</strong>
          </span>
        </div>
      )}

      {certificationStatus === "frozen" ? (
        <p className="tutor-card-warning">
          <BadgeCheck size={14} />
          家教资格冻结中，暂不可接单。
        </p>
      ) : null}
    </>
  );

  if (onOpenInfo) {
    return (
      <button className={rootClassName} onClick={onOpenInfo} type="button">
        {content}
      </button>
    );
  }

  return <article className={rootClassName}>{content}</article>;
}
