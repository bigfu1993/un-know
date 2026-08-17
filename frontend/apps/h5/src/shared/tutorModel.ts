/** 家教可授课学科 KEY 列表，供认证、卡片编辑和设置页共用；渲染文案统一用 `getTutorSubjectLabel` 查表。 */
export const tutorSubjectOptions: TutorSubject[] = Object.values(TutorSubject);

/** 学科 KEY 转中文展示文案，查不到时兜底返回原始 KEY，避免非法/历史脏数据渲染空白。 */
export function getTutorSubjectLabel(subject: string): string {
  return (tutorSubjectLabel as Record<string, string>)[subject] ?? subject;
}

/** 将家教学科字符串拆分为去重后的标签列表。 */
export function parseTutorSubjects(subjectText?: string) {
  return Array.from(new Set((subjectText ?? "").split("、").map((item) => item.trim()).filter(Boolean)));
}

/** 将学科标签列表转换为卡片展示和资料持久化使用的字符串。 */
export function formatTutorSubjects(subjects: string[]) {
  return parseTutorSubjects(subjects.join("、")).join("、");
}

/** 将一个或多个"、"分隔的学科 KEY 字符串转成中文展示文案，供卡片直接渲染。 */
export function formatTutorSubjectLabels(subjectText?: string) {
  return parseTutorSubjects(subjectText).map(getTutorSubjectLabel).join("、");
}
