import { getDefaultRouteForRole } from "@h5/router/paths";
import { Navigate } from "react-router-dom";
import { useHomeRuntimeContext } from "../provider";

/**
 * 五个一级 tab 页面按需懒加载：每个页面只在用户真正切到对应 tab 时才下载自己的代码分包，
 * 避免首屏把商户经营、家教等用户可能从不访问的模块也一并打进主包。命名导出没有 default，
 * 用 .then 把目标导出适配成 lazy() 需要的 { default } 形状。
 */
const Featured = lazy(() => import("@pages/home/shop").then((module) => ({ default: module.Featured })));
const PartTime = lazy(() => import("@pages/home/job").then((module) => ({ default: module.PartTime })));
const Commission = lazy(() => import("@pages/home/commission").then((module) => ({ default: module.Commission })));
const MerchantSales = lazy(() =>
  import("@pages/merchant-sales").then((module) => ({ default: module.MerchantSales }))
);
const Tutor = lazy(() => import("@pages/home/edu").then((module) => ({ default: module.Tutor })));

/** 按当前角色跳转到 Home 默认主模块。 */
export function DefaultRoute() {
  const { home } = useHomeRuntimeContext();

  return <Navigate replace to={getDefaultRouteForRole(home.role)} />;
}

/** 优选子路由适配器，只读取页面实际需要的角色。 */
export function ShopRoute() {
  const { home } = useHomeRuntimeContext();

  return (
    <Suspense fallback={<RouteLoading />}>
      <Featured role={home.role} />
    </Suspense>
  );
}

/** 兼职子路由适配器，隔离 Home 运行时与页面展示契约。 */
export function JobRoute() {
  const { home } = useHomeRuntimeContext();

  return (
    <Suspense fallback={<RouteLoading />}>
      <PartTime {...home.routes.job} role={home.role} />
    </Suspense>
  );
}

/** 委托子路由适配器。 */
export function CommissionRoute() {
  const { home } = useHomeRuntimeContext();

  return (
    <Suspense fallback={<RouteLoading />}>
      <Commission {...home.routes.commission} />
    </Suspense>
  );
}

/** 商户经营子路由适配器。 */
export function MerchantSalesRoute() {
  const { home } = useHomeRuntimeContext();

  return (
    <Suspense fallback={<RouteLoading />}>
      <MerchantSales {...home.routes.merchantSales} />
    </Suspense>
  );
}

/** 家教子路由适配器。 */
export function TutorRoute() {
  const { home } = useHomeRuntimeContext();

  return (
    <Suspense fallback={<RouteLoading />}>
      <Tutor {...home.routes.tutor} />
    </Suspense>
  );
}
