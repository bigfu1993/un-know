import { getDefaultRouteForRole, getRouteForTab } from "@h5/router/paths";
import { useHomeRuntimeContext } from "@pages/home/provider";
import { Mine } from "@pages/mine";
import { SettingsView } from "@pages/settings";
import { Navigate, useNavigate } from "react-router-dom";
import { UnauthenticatedScreen } from "./components/AppStateScreens";

/** 登录一级路由；已登录用户直接返回当前角色默认首页。 */
export function LoginRoute() {
  const { home, session } = useHomeRuntimeContext();

  if (session.isAuthenticated) {
    return <Navigate replace to={getDefaultRouteForRole(home.role)} />;
  }

  return <UnauthenticatedScreen onLoginSuccess={session.handleLoginSuccess} />;
}

/** 我的一级路由适配器。 */
export function MineRoute() {
  const { navigation, pages, session } = useHomeRuntimeContext();
  const navigate = useNavigate();

  return (
    <Mine
      onBack={() => navigate(getRouteForTab(navigation.activeTab), { replace: true })}
      onLogout={session.handleLogout}
      onNavigate={navigation.handleNavigate}
      orders={pages.roleOrders}
      walletSummary={pages.walletSummary}
    />
  );
}

/** 设置一级路由适配器。 */
export function SettingsRoute() {
  const { navigation } = useHomeRuntimeContext();
  const navigate = useNavigate();

  return <SettingsView onBack={() => navigate(navigation.settingsBackRoute, { replace: true })} />;
}
