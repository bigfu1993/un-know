/**
 * 家教学科的唯一标准。枚举成员的值是稳定 KEY，不是中文展示文案——数据库
 * （`tutor_demand.subject`/`tutor_certification.subject`）、接口提交参数传的都是这个 KEY，
 * 中文展示文案统一在 `tutorSubjectLabel` 里查表得到，不再直接拼裸中文字符串。
 */
export enum TutorSubject {
  /** 语文。 */
  Chinese = "CHINESE",
  /** 数学。 */
  Math = "MATH",
  /** 英语。 */
  English = "ENGLISH",
  /** 物理。 */
  Physics = "PHYSICS",
  /** 化学。 */
  Chemistry = "CHEMISTRY",
  /** 生物。 */
  Biology = "BIOLOGY",
  /** 历史。 */
  History = "HISTORY",
  /** 地理。 */
  Geography = "GEOGRAPHY",
  /** 政治。 */
  Politics = "POLITICS",
  /** 编程。 */
  Programming = "PROGRAMMING"
}

/** `TutorSubject` → 中文展示文案，界面渲染时查这张表，不直接展示 KEY。 */
export const tutorSubjectLabel: Record<TutorSubject, string> = {
  [TutorSubject.Chinese]: "语文",
  [TutorSubject.Math]: "数学",
  [TutorSubject.English]: "英语",
  [TutorSubject.Physics]: "物理",
  [TutorSubject.Chemistry]: "化学",
  [TutorSubject.Biology]: "生物",
  [TutorSubject.History]: "历史",
  [TutorSubject.Geography]: "地理",
  [TutorSubject.Politics]: "政治",
  [TutorSubject.Programming]: "编程"
};
