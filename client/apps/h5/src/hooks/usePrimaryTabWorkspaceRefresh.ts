/** 主导航 workspace 刷新控制入参。 */
interface UsePrimaryTabWorkspaceRefreshOptions {
  activePage: PageSurface | null;
  activeTab: ClientModuleKey;
  isAuthenticated: boolean;
  isMineRoute: boolean;
  isSettingsRoute: boolean;
  isWorkspaceFetching: boolean;
  refetchWorkspace: () => void;
}

/** 直接依赖工作台聚合接口展示列表的主模块。 */
const workspaceBackedPrimaryTabs: ClientModuleKey[] = ["partTime", "hunting", "merchantSales", "tutor"];

/** 判断当前主模块是否需要通过工作台聚合接口刷新列表数据。 */
function isWorkspaceBackedPrimaryTab(tab: ClientModuleKey) {
  return workspaceBackedPrimaryTabs.includes(tab);
}

/** 主导航切换到工作台列表页面时，主动刷新真实 workspace 接口。 */
export function usePrimaryTabWorkspaceRefresh({
  activePage,
  activeTab,
  isAuthenticated,
  isMineRoute,
  isSettingsRoute,
  isWorkspaceFetching,
  refetchWorkspace
}: UsePrimaryTabWorkspaceRefreshOptions) {
  const previousPrimaryTabRef = useRef<ClientModuleKey | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      previousPrimaryTabRef.current = null;
      return;
    }

    if (activePage || isMineRoute || isSettingsRoute) {
      return;
    }

    const previousTab = previousPrimaryTabRef.current;
    previousPrimaryTabRef.current = activeTab;

    if (previousTab === null || previousTab === activeTab) {
      return;
    }

    if (!isWorkspaceBackedPrimaryTab(activeTab) || isWorkspaceFetching) {
      return;
    }

    refetchWorkspace();
  }, [
    activePage,
    activeTab,
    isAuthenticated,
    isMineRoute,
    isSettingsRoute,
    isWorkspaceFetching,
    refetchWorkspace
  ]);
}
