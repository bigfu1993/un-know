import { getDefaultPrimaryTab } from "@unknown/domain";

/** 底部主模块对应的浏览器路由路径，是主导航跳转和兜底重定向的唯一来源。 */
export const moduleRoutePaths: Partial<Record<ClientModuleKey, string>> = {
  featured: "/shop",
  partTime: "/job",
  hunting: "/commission",
  merchantSales: "/merchant-sales",
  marketing: "/marketing",
  tutor: "/edu"
};

/** 根据角色返回首次进入 H5 时的默认模块路由。 */
export function getDefaultRouteForRole(role: Role) {
  return moduleRoutePaths[getDefaultPrimaryTab(role)] ?? "/shop";
}

/** 根据主导航 tab 返回对应浏览器路由。 */
export function getRouteForTab(tab: ClientModuleKey) {
  return moduleRoutePaths[tab] ?? "/shop";
}

/** 根据浏览器路径反查主导航 tab；非主模块页面返回 null。 */
export function getTabFromRoute(pathname: string): ClientModuleKey | null {
  const match = Object.entries(moduleRoutePaths).find(([, routePath]) => routePath === pathname);
  return match ? (match[0] as ClientModuleKey) : null;
}
