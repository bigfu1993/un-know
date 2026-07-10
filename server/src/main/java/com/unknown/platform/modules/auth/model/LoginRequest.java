package com.unknown.platform.modules.auth.model;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record LoginRequest(
    @NotBlank @Pattern(regexp = "^1[3-9]\\d{9}$", message = "请输入正确的手机号") String phone,
    @NotBlank @Pattern(regexp = "^\\d{6}$", message = "请输入 6 位验证码") String code
) {
}
