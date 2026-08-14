package com.unknown.platform.modules.auth.model;

import jakarta.validation.constraints.NotBlank;

/** 小程序一键登录请求，phoneCode 由微信客户端授权后提供。 */
public record MiniappOneTapLoginRequest(
    @NotBlank(message = "缺少微信手机号授权码") String phoneCode,
    ClientRole role
) {
}
