/**
 * 性别的唯一标准。枚举成员的值是稳定 KEY，不是中文展示文案——数据库
 * （`tutor_certification.gender`）、接口提交参数传的都是这个 KEY，
 * 中文展示文案统一在 `genderLabel` 里查表得到，不再直接拼裸中文字符串。
 */
export enum Gender {
  /** 男。 */
  Male = "MALE",
  /** 女。 */
  Female = "FEMALE",
  /** 其他。 */
  Other = "OTHER"
}

/** `Gender` → 中文展示文案，界面渲染时查这张表，不直接展示 KEY。 */
export const genderLabel: Record<Gender, string> = {
  [Gender.Male]: "男",
  [Gender.Female]: "女",
  [Gender.Other]: "其他"
};
