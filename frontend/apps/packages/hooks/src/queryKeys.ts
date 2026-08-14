import type { Role } from "@unknown/domain";

/** 客户端地址列表查询键。 */
export const clientAddressQueryKey = ["client-addresses"] as const;

/** 客户端工作台聚合查询键。 */
export const clientWorkspaceQueryKey = ["client-workspace"] as const;

/** 客户端兼职列表查询键。 */
export const clientPartTimeJobsQueryKey = ["client-part-time-jobs"] as const;

/** 客户端委托/狩猎列表查询键。 */
export const clientHuntingTasksQueryKey = ["client-hunting-tasks"] as const;

/** 客户端家教列表查询键。 */
export const clientTutorDemandsQueryKey = ["client-tutor-demands"] as const;

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
