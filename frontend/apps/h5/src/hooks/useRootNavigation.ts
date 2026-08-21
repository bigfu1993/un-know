import { getRouteForTab } from "@h5/router/paths";

/** 获取栈式次级页面的标题信息。 */
function getPageMeta(page: PageSurface, role: Role) {
  if (page === "mine") {
    return { title: "我的", eyebrow: roleLabels[role] };
  }
  if (page === "wallet") {
    return { title: "钱包详情", eyebrow: "可提现与观察期账户" };
  }
  if (page === "orders") {
    return { title: "订单详情", eyebrow: "订单与配送" };
  }
  if (page === "tutorCertification") {
    return { title: "家教认证", eyebrow: "资格认证" };
  }
  if (page === "huntingCertification") {
    return { title: "狩猎认证", eyebrow: "资格认证" };
  }
  return { title: "设置", eyebrow: "昵称与安全" };
}

/** 根导航控制器入参。 */
interface UseRootNavigationOptions {
  locationPathname: string;
  locationState: unknown;
  navigate: (to: string, options?: { replace?: boolean; state?: unknown }) => void;
  onRouteChange?: () => void;
  role: Role;
}

/** App 根导航控制器，集中管理主模块 tab、二级页面栈和浏览器路由镜像。 */
export function useRootNavigation({
  locationPathname,
  locationState,
  navigate,
  onRouteChange,
  role
}: UseRootNavigationOptions) {
  const [activeTab, setActiveTab] = useState<ClientModuleKey>(() => getDefaultPrimaryTab(role));
  const [pageStack, setPageStack] = useState<PageSurface[]>([]);
  const activePage = pageStack.length > 0 ? pageStack[pageStack.length - 1] : null;
  const pageMeta = activePage ? getPageMeta(activePage, role) : null;
  const isSettingsRoute = locationPathname === "/settings";
  const isMineRoute = locationPathname === "/mine";
  const settingsRouteState = locationState as { from?: string } | null;
  const settingsBackRoute = settingsRouteState?.from === "mine" ? "/mine" : getRouteForTab(activeTab);

  /** 打开主模块路由，并清空二级页面栈。 */
  function openTab(tab: ClientModuleKey) {
    setActiveTab(tab);
    setPageStack([]);
    onRouteChange?.();
    navigate(getRouteForTab(tab));
  }

  /** 打开二级页面；我的和设置使用浏览器路由，其他页面使用 App 内栈。 */
  function navigatePage(page: PageSurface) {
    if (page === "settings" || page === "mine") {
      navigate(page === "settings" ? "/settings" : "/mine", {
        state: page === "settings" && locationPathname === "/mine" ? { from: "mine" } : undefined
      });
      setPageStack([]);
      onRouteChange?.();
      return;
    }

    setPageStack((stack) => [...stack, page]);
    onRouteChange?.();
  }

  /** 返回上一级 App 内页面。 */
  function back() {
    setPageStack((stack) => stack.slice(0, -1));
    onRouteChange?.();
  }

  /** 登录或退出时重置主模块和页面栈。 */
  function resetForRole(nextRole: Role) {
    setActiveTab(getDefaultPrimaryTab(nextRole));
    setPageStack([]);
  }

  /** 回到当前主模块首页，可选择替换浏览器历史。 */
  function replaceToActiveTab() {
    setPageStack([]);
    onRouteChange?.();
    navigate(getRouteForTab(activeTab), { replace: true });
  }

  /** 外部浏览器路由变化时同步主模块 tab。 */
  function syncRouteTab(routeTab: ClientModuleKey) {
    setActiveTab(routeTab);
    setPageStack([]);
    onRouteChange?.();
  }

  return {
    activePage,
    activeTab,
    back,
    isMineRoute,
    isSettingsRoute,
    navigatePage,
    openTab,
    pageMeta,
    pageStack,
    replaceToActiveTab,
    resetForRole,
    setActiveTab,
    setPageStack,
    settingsBackRoute,
    syncRouteTab
  };
}
