import { HomePage } from ".";
import {
  CommissionRoute,
  DefaultRoute,
  JobRoute,
  MerchantSalesRoute,
  ShopRoute,
  TutorRoute
} from "./components/RouteEntries";

/** 营销活动页访问频率低，按需懒加载，不占用首屏主包体积。 */
const Marketing = lazy(() => import("@pages/marketing").then((module) => ({ default: module.Marketing })));

/** Home 路由记录；所有子路径均保持相对路径，由父级 Outlet 承载。 */
export const homeRoute = {
  path: "/",
  element: <HomePage />,
  children: [
    { index: true, element: <DefaultRoute /> },
    { path: "shop", element: <ShopRoute /> },
    { path: "job", element: <JobRoute /> },
    { path: "commission", element: <CommissionRoute /> },
    { path: "merchant-sales", element: <MerchantSalesRoute /> },
    {
      path: "marketing",
      element: (
        <Suspense fallback={<RouteLoading />}>
          <Marketing />
        </Suspense>
      )
    },
    { path: "edu", element: <TutorRoute /> },
    { path: "*", element: <DefaultRoute /> }
  ]
} satisfies RouteObject;
