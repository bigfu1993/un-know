import { getDefaultRouteForRole } from "@h5/router/paths";
import { Commission } from "@pages/home/commission";
import { Tutor } from "@pages/home/edu";
import { PartTime } from "@pages/home/job";
import { Featured } from "@pages/home/shop";
import { MerchantSales } from "@pages/merchant-sales";
import { Navigate } from "react-router-dom";
import { useHomeRuntimeContext } from "../provider";

/** 按当前角色跳转到 Home 默认主模块。 */
export function DefaultRoute() {
  const { home } = useHomeRuntimeContext();

  return <Navigate replace to={getDefaultRouteForRole(home.role)} />;
}

/** 优选子路由适配器，只读取页面实际需要的角色。 */
export function ShopRoute() {
  const { home } = useHomeRuntimeContext();

  return <Featured role={home.role} />;
}

/** 兼职子路由适配器，隔离 Home 运行时与页面展示契约。 */
export function JobRoute() {
  const { home } = useHomeRuntimeContext();

  return <PartTime {...home.routes.job} role={home.role} />;
}

/** 委托子路由适配器。 */
export function CommissionRoute() {
  const { home } = useHomeRuntimeContext();

  return <Commission {...home.routes.commission} />;
}

/** 商户经营子路由适配器。 */
export function MerchantSalesRoute() {
  const { home } = useHomeRuntimeContext();

  return <MerchantSales {...home.routes.merchantSales} />;
}

/** 家教子路由适配器。 */
export function TutorRoute() {
  const { home } = useHomeRuntimeContext();

  return <Tutor {...home.routes.tutor} />;
}
