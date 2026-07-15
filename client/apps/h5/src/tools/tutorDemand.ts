/** 将家教兼职预算文案转换为当前产品口径。 */
export function getTutorDemandBudgetLabel(budget: string) {
  return budget === "支持试课" ? "需要试课" : budget;
}
