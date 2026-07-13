package com.unknown.platform.modules.auth.model;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** 客户端注册请求，账号创建后仍需通过角色确认流程锁定最终角色。 */
public record RegisterRequest(
    @NotBlank @Pattern(regexp = "^1[3-9]\\d{9}$", message = "请输入正确的手机号") String phone,
    @NotBlank @Pattern(regexp = "^\\d{6}$", message = "请输入 6 位验证码") String code,
    ClientRole role,
    @Size(max = 40, message = "昵称最多 40 个字符") String displayName
) {
}
