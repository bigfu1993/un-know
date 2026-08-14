package com.unknown.platform.modules.clienthome.model;

import java.util.List;

/** 客户端首页聚合响应，包含角色资料、模块入口卡片和全局提示。 */
public record ClientHomeResponse(
    RoleProfile profile,
    List<ModuleCard> modules,
    List<String> alerts
) {
}
