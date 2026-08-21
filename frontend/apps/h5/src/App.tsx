import { ClientLayout } from "@h5/layouts/client";
import { homeRoute } from "@pages/home/routes";
import { LoginRoute, MineRoute, SettingsRoute } from "@pages/home/auth/routes";
import { Navigate, useRoutes } from "react-router-dom";

const appRoutes = [
  { path: "/login", element: <LoginRoute /> },
  {
    element: <ClientLayout />,
    children: [homeRoute, { path: "/mine", element: <MineRoute /> }, { path: "/settings", element: <SettingsRoute /> }]
  },
  { path: "*", element: <Navigate replace to="/" /> }
] satisfies RouteObject[];

/** H5 根组件，只装配 Home 运行时与一级页面路由。 */
export function App() {
  return useRoutes(appRoutes);
}
