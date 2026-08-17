import { formatTutorSubjectLabels, formatTutorSubjects, parseTutorSubjects } from "@shared/tutorModel";

export type { TutorCertificationStatus };

/** 家教卡片展示模式：entry 为认证入口，status 为审核态，simple/default 为认证通过后的信息卡片。 */
export type TutorCardMode = "entry" | "status" | "simple" | "default";

/** 家教学科能力条目，每个学科单独维护可授课年级和水平等级。 */
export interface TutorSubjectLevelItem {
  grade: string;
  level: string;
  subject: string;
}

/** 家教卡片展示数据。 */
export interface TutorCardData {
  certificationStatus: TutorCertificationStatus;
  grade: string;
  hasChat: boolean;
  level: string;
  messageCount: number;
  subject: string;
}

/** 家教可授课年级选项。 */
export const tutorGradeOptions = ["小学", "初中", "高中", "大学", "成人"];

/** 家教学科水平等级选项。 */
export const tutorLevelOptions = ["L1", "L2", "L3", "L4", "L5"];

/** 家教认证状态中文文案。 */
export const tutorCertificationStatusLabels: Record<TutorCertificationStatus, string> = {
  pending: "待认证",
  reviewing: "认证中",
  normal: "正常",
  frozen: "冻结"
};

/** 安全解析本地保存的学科能力列表。 */
export function parseTutorSubjectLevelItems(profileDraft: ProfileDraftState): TutorSubjectLevelItem[] {
  try {
    const storedItems = profileDraft.tutorSubjectLevels
      ? (JSON.parse(profileDraft.tutorSubjectLevels) as TutorSubjectLevelItem[])
      : [];
    const normalizedItems = storedItems
      .map((item) => ({
        grade: item.grade?.trim() || profileDraft.tutorGrade || tutorGradeOptions[0],
        level: item.level?.trim() || profileDraft.tutorLevel || tutorLevelOptions[0],
        subject: item.subject?.trim() || ""
      }))
      .filter((item) => item.subject);

    if (normalizedItems.length > 0) {
      return normalizedItems;
    }
  } catch {
    // 本地草稿可能来自旧版本，解析失败时回退到原有学科字段。
  }

  return parseTutorSubjects(profileDraft.tutorSubject).map((subject) => ({
    grade: profileDraft.tutorGrade || tutorGradeOptions[0],
    level: profileDraft.tutorLevel || tutorLevelOptions[0],
    subject
  }));
}

/** 将学科能力列表序列化为本地资料草稿字段。 */
export function stringifyTutorSubjectLevelItems(items: TutorSubjectLevelItem[]) {
  const normalizedItems = items
    .map((item) => ({
      grade: item.grade.trim(),
      level: item.level.trim(),
      subject: item.subject.trim()
    }))
    .filter((item) => item.subject);

  return JSON.stringify(normalizedItems);
}

/** 从全局资料草稿生成家教卡片数据；认证状态由后端首页接口同步到该草稿。 */
export function getTutorCardDataFromDraft(profileDraft: ProfileDraftState): TutorCardData {
  const rawStatus = profileDraft.tutorCertificationStatus as TutorCertificationStatus | undefined;
  const certificationStatus = rawStatus && rawStatus in tutorCertificationStatusLabels ? rawStatus : "pending";
  const messageCount = Number(profileDraft.tutorMessageCount ?? 0);
  const subjectLevelItems = parseTutorSubjectLevelItems(profileDraft);
  const subjectText =
    subjectLevelItems.length > 0
      ? formatTutorSubjectLabels(formatTutorSubjects(subjectLevelItems.map((item) => item.subject)))
      : formatTutorSubjectLabels(profileDraft.tutorSubject) || "学科待完善";
  const gradeText =
    subjectLevelItems.length > 0
      ? Array.from(new Set(subjectLevelItems.map((item) => item.grade))).join("、")
      : profileDraft.tutorGrade || "年级待完善";
  const levelText =
    subjectLevelItems.length > 0
      ? Array.from(new Set(subjectLevelItems.map((item) => item.level))).join("、")
      : profileDraft.tutorLevel || "L1";

  return {
    certificationStatus,
    grade: gradeText,
    hasChat: profileDraft.tutorHasChat === "true" || messageCount > 0,
    level: levelText,
    messageCount: Number.isFinite(messageCount) ? Math.max(0, messageCount) : 0,
    subject: subjectText
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
