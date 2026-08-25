/**
 * 家教学历的唯一标准。枚举成员的值是稳定 KEY，不是中文展示文案——数据库
 * （`tutor_certification.education`）、接口提交参数传的都是这个 KEY，
 * 中文展示文案统一在 `tutorEducationLabel` 里查表得到，不再直接拼裸中文字符串。
 */
export enum TutorEducation {
  /** 本科。 */
  Bachelor = "BACHELOR",
  /** 硕士。 */
  Master = "MASTER",
  /** 博士。 */
  Doctorate = "DOCTORATE"
}

/** `TutorEducation` → 中文展示文案，界面渲染时查这张表，不直接展示 KEY。 */
export const tutorEducationLabel: Record<TutorEducation, string> = {
  [TutorEducation.Bachelor]: "本科",
  [TutorEducation.Master]: "硕士",
  [TutorEducation.Doctorate]: "博士"
};
