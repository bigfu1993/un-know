import type { Role } from "@unknown/domain";

/** 客户端地址列表查询键。 */
export const clientAddressQueryKey = ["client-addresses"] as const;

/** 客户端工作台聚合查询键。 */
export const clientWorkspaceQueryKey = ["client-workspace"] as const;

/** 客户端进行中列表查询键，不管什么角色都用这一个 key，后端按登录态区分角色数据。 */
export const clientOngoingOrdersQueryKey = ["client-ongoing-orders"] as const;

/** 客户端订单历史查询键，跟进行中列表同一套底层数据但不做归档过滤，只服务订单历史页。 */
export const clientOrderHistoryQueryKey = ["client-order-history"] as const;

/** 客户端兼职列表查询键。 */
export const clientPartTimeJobsQueryKey = ["client-part-time-jobs"] as const;

/** 客户端委托/狩猎列表查询键。 */
export const clientHuntingTasksQueryKey = ["client-hunting-tasks"] as const;

/** 客户端家长可浏览的认证学生列表查询键。 */
export const clientTutorCertifiedStudentsQueryKey = ["client-tutor-certified-students"] as const;

/** 客户端家教进行中申请列表查询键（家长自己发布的需求 + 申请人，只服务进行中弹窗）。 */
export const clientTutorApplicationsQueryKey = ["client-tutor-applications"] as const;

/**
 * 根据角色生成查询键，保留前端缓存隔离。
 *
 * @param baseKey 基础查询键
 * @param role 当前登录角色
 * @returns 带角色维度的查询键
 */
export function getRoleQueryKey(baseKey: readonly string[], role: Role) {
  return [...baseKey, role] as const;
}
