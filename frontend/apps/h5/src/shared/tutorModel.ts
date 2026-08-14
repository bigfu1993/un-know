/** 家教可授课学科标签，供认证、卡片编辑和设置页共用。 */
export const tutorSubjectOptions = ["语文", "数学", "英语", "物理", "化学", "生物", "历史", "地理", "政治", "编程"];

/** 将家教学科字符串拆分为去重后的标签列表。 */
export function parseTutorSubjects(subjectText?: string) {
  return Array.from(new Set((subjectText ?? "").split("、").map((item) => item.trim()).filter(Boolean)));
}

/** 将学科标签列表转换为卡片展示和资料持久化使用的字符串。 */
export function formatTutorSubjects(subjects: string[]) {
  return parseTutorSubjects(subjects.join("、")).join("、");
}
