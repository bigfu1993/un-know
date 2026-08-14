package com.unknown.platform.modules.auth.model;

import jakarta.validation.constraints.NotNull;

/** 注册后角色确认请求，避免登录阶段反复切换学生、商户和家长身份。 */
public record SelectRoleRequest(
    @NotNull ClientRole role
) {
}
