import { BadgeCheck, CalendarClock, GraduationCap, MessageCircle } from "lucide-react";
import { tutorCertificationStatusLabels, type TutorCardData, type TutorCardMode } from "./model";

/** 家教卡片属性。 */
export interface TutorCardProps extends TutorCardData {
  className?: string;
  mode: TutorCardMode;
  onEditSubject?: () => void;
  onOpenCalendar?: () => void;
  onOpenMessages?: () => void;
  onStartCertification?: () => void;
}

/** 家教资格卡片，供我的页和头像弹窗复用。 */
export function TutorCard({
  certificationStatus,
  className,
  grade,
  hasChat,
  level,
  messageCount,
  mode,
  onEditSubject,
  onOpenCalendar,
  onOpenMessages,
  onStartCertification,
  subject
}: TutorCardProps) {
  const rootClassName = ["tutor-card", `tutor-card--${mode}`, className].filter(Boolean).join(" ");
  const statusText = tutorCertificationStatusLabels[certificationStatus];
  const canOpenMessages = hasChat;
  const subjectButtonLabel = mode === "simple" ? subject : `${subject} · ${grade}`;

  if (mode === "entry") {
    return (
      <button className={rootClassName} onClick={onStartCertification} type="button">
        <span className="tutor-card-icon grid h-[40px] w-[40px] shrink-0 place-items-center">
          <GraduationCap size={21} />
        </span>
        <span className="tutor-card-main min-w-0">
          <strong>认证家教</strong>
          <em>提交资格认证后展示家教卡片、课程日历和消息提醒。</em>
        </span>
      </button>
    );
  }

  if (mode === "status") {
    return (
      <article className={rootClassName}>
        <div className="tutor-card-head flex items-start gap-[10px]">
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

  return (
    <article className={rootClassName}>
      <div className="tutor-card-head flex items-start gap-[10px]">
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
          <button className="tutor-subject-edit" disabled={!onEditSubject} onClick={onEditSubject} type="button">
            <em>学科/年级</em>
            <strong>{subjectButtonLabel}</strong>
          </button>
          <span>
            <em>等级</em>
            <strong>{level}</strong>
          </span>
        </div>
      ) : (
        <div className="tutor-card-meta grid gap-[8px]">
          <button className="tutor-subject-edit" disabled={!onEditSubject} onClick={onEditSubject} type="button">
            <em>学科</em>
            <strong>{subjectButtonLabel}</strong>
          </button>
        </div>
      )}

      <div className="tutor-card-actions grid gap-[8px]">
        <button className="ghost-button" onClick={onOpenCalendar} type="button">
          <CalendarClock size={15} />
          课程日历
        </button>
        <button className="ghost-button" disabled={!canOpenMessages} onClick={onOpenMessages} type="button">
          <MessageCircle size={15} />
          消息提示
          <span className="tutor-message-badge">{messageCount}</span>
        </button>
      </div>

      {certificationStatus === "frozen" ? (
        <p className="tutor-card-warning">
          <BadgeCheck size={14} />
          家教资格冻结中，暂不可接单。
        </p>
      ) : null}
    </article>
  );
}
