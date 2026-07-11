import type { TutorCertificationStatus } from "@unknown/domain";

export type { TutorCertificationStatus };

/** 家教卡片展示模式：entry 为认证入口，status 为审核态，simple/default 为认证通过后的信息卡片。 */
export type TutorCardMode = "entry" | "status" | "simple" | "default";

/** 家教卡片展示数据。 */
export interface TutorCardData {
  certificationStatus: TutorCertificationStatus;
  grade: string;
  hasChat: boolean;
  level: string;
  messageCount: number;
  subject: string;
}

/** 家教认证状态中文文案。 */
export const tutorCertificationStatusLabels: Record<TutorCertificationStatus, string> = {
  pending: "待认证",
  reviewing: "认证中",
  normal: "正常",
  frozen: "冻结"
};

/** 从全局资料草稿生成家教卡片数据；认证状态由后端首页接口同步到该草稿。 */
export function getTutorCardDataFromDraft(profileDraft: ProfileDraftState): TutorCardData {
  const rawStatus = profileDraft.tutorCertificationStatus as TutorCertificationStatus | undefined;
  const certificationStatus = rawStatus && rawStatus in tutorCertificationStatusLabels ? rawStatus : "pending";
  const messageCount = Number(profileDraft.tutorMessageCount ?? 0);

  return {
    certificationStatus,
    grade: profileDraft.tutorGrade || "年级待完善",
    hasChat: profileDraft.tutorHasChat === "true" || messageCount > 0,
    level: profileDraft.tutorLevel || "L1",
    messageCount: Number.isFinite(messageCount) ? Math.max(0, messageCount) : 0,
    subject: profileDraft.tutorSubject || "学科待完善"
  };
}

/** 根据认证状态选择最终展示模式：仅认证通过后显示家教卡片。 */
export function getTutorCardMode(
  certificationStatus: TutorCertificationStatus,
  preferredMode: Exclude<TutorCardMode, "entry" | "status">
) {
  if (certificationStatus === "pending") {
    return "entry";
  }
  if (certificationStatus !== "normal") {
    return "status";
  }
  return preferredMode;
}
