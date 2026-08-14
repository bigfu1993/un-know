package com.unknown.platform.modules.auth.model;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/** 客户端重置登录密码请求，验证码和旧密码两种校验方式统一由服务端确认。 */
public record ResetPasswordRequest(
    @NotBlank @Pattern(regexp = "^1[3-9]\\d{9}$", message = "请输入正确的手机号") String phone,
    @NotBlank(message = "请选择密码重置校验方式") String verifyMode,
    @Pattern(regexp = "^\\d{6}$", message = "请输入 6 位验证码") String code,
    String oldPassword,
    @NotBlank(message = "请输入新密码") String password,
    @NotBlank(message = "请再次输入新密码") String passwordConfirm
) {
}

