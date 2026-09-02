import "./index.less";

/** 路由级懒加载分包的过渡占位；分包多数已被浏览器缓存，正常情况下只会闪现极短时间。 */
export function RouteLoading() {
  return <div className="route-loading min-h-[40vh] text-[13px]">加载中…</div>;
}
