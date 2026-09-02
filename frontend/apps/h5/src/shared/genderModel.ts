/** 性别选项列表，供各类认证表单渲染；展示文案统一用 `getGenderLabel` 查表。 */
export const genderOptions: Gender[] = Object.values(Gender);

/** 性别 KEY 转中文展示文案，查不到或未填写时兜底返回原始值，避免非法/历史脏数据渲染空白。 */
export function getGenderLabel(gender?: string | null): string {
  if (!gender) {
    return "";
  }

  return (genderLabel as Record<string, string>)[gender] ?? gender;
}

/** 性别对应的图标颜色，男生蓝色、女生粉色，其余性别（含未填写）沿用调用方图标默认色；
 *  供家教浏览列表和统一申请列表两处头像图标共用。返回值要用内联 style 而不是 Tailwind 类名，
 *  因为全局 `.card-title svg { color: #1d6f55 }` 比单个 class 选择器优先级更高，
 *  className 会被它覆盖，必须用内联样式才能真正生效。 */
export function getGenderIconColor(gender?: string | null) {
  if (gender === Gender.Male) {
    return "#2563eb";
  }
  if (gender === Gender.Female) {
    return "#db2777";
  }
  return undefined;
}
