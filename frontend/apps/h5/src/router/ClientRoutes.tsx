import { Commission } from "@pages/home/commission";
import { Tutor } from "@pages/home/edu";
import { PartTime } from "@pages/home/job";
import { Featured } from "@pages/home/shop";
import { Marketing } from "@pages/marketing";
import { MerchantSales } from "@pages/merchant-sales";
import { Navigate, Route, Routes } from "react-router-dom";
import { getDefaultRouteForRole } from "./paths";

/** H5 主模块路由，只负责路径到页面的映射和兜底重定向。 */
export function ClientRoutes({ commission, job, merchantSales, role, tutor }: ClientRoutesProps) {
  return (
    <Routes>
      <Route path="/shop" element={<Featured role={role} />} />
      <Route path="/job" element={<PartTime {...job} role={role} />} />
      <Route path="/commission" element={<Commission {...commission} />} />
      <Route path="/merchant-sales" element={<MerchantSales {...merchantSales} />} />
      <Route path="/marketing" element={<Marketing />} />
      <Route path="/edu" element={<Tutor {...tutor} />} />
      <Route path="*" element={<Navigate replace to={getDefaultRouteForRole(role)} />} />
    </Routes>
  );
}
