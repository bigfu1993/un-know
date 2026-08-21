import { Marketing } from "@pages/marketing";
import { HomePage } from ".";
import {
  CommissionRoute,
  DefaultRoute,
  JobRoute,
  MerchantSalesRoute,
  ShopRoute,
  TutorRoute
} from "./components/RouteEntries";

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
    { path: "marketing", element: <Marketing /> },
    { path: "edu", element: <TutorRoute /> },
    { path: "*", element: <DefaultRoute /> }
  ]
} satisfies RouteObject;
