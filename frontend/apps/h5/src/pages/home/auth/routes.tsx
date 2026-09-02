import { getStoredClientAuthSession, setStoredClientAuthSession } from "@unknown/api-client";
import { getDefaultRouteForRole, getRouteForTab } from "@h5/router/paths";
import { useHomeRuntimeContext } from "@pages/home/provider";
import { showMessage } from "@tools/messageToast";
import { Navigate, useNavigate } from "react-router-dom";
import { UnauthenticatedScreen } from "@components/AppStateScreens";

/** 我的、设置访问频率低于首页 tab，按需懒加载。 */
const Mine = lazy(() => import("@pages/mine").then((module) => ({ default: module.Mine })));
const SettingsView = lazy(() => import("@pages/settings").then((module) => ({ default: module.SettingsView })));

/** 登录一级路由；已登录用户直接返回当前角色默认首页。 */
export function LoginRoute() {
  const navigate = useNavigate();
  const session = getStoredClientAuthSession();

  if (session) {
    return <Navigate replace to={getDefaultRouteForRole(session.role)} />;
  }

  /** 保存登录接口返回的会话，并进入该角色对应的受保护路由。 */
  function handleLoginSuccess(nextSession: LoginResponse) {
    setStoredClientAuthSession(nextSession);
    showMessage(nextSession.profileCompletionRequired ? "登录成功，可稍后进入设置补充资料。" : "登录成功。", {
      type: "success"
    });
    navigate(getDefaultRouteForRole(nextSession.role), { replace: true });
  }

  return <UnauthenticatedScreen onLoginSuccess={handleLoginSuccess} />;
}

/** 我的一级路由适配器。 */
export function MineRoute() {
  const { navigation, pages, session } = useHomeRuntimeContext();
  const navigate = useNavigate();

  return (
    <Suspense fallback={<RouteLoading />}>
      <Mine
        onBack={() => navigate(getRouteForTab(navigation.activeTab), { replace: true })}
        onLogout={session.handleLogout}
        onNavigate={navigation.handleNavigate}
        orders={pages.roleOrders}
        walletSummary={pages.walletSummary}
      />
    </Suspense>
  );
}

/** 设置一级路由适配器。 */
export function SettingsRoute() {
  const { navigation } = useHomeRuntimeContext();
  const navigate = useNavigate();

  return (
    <Suspense fallback={<RouteLoading />}>
      <SettingsView onBack={() => navigate(navigation.settingsBackRoute, { replace: true })} />
    </Suspense>
  );
}
