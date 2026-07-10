package com.unknown.platform.modules.auth.model;

import jakarta.validation.constraints.NotBlank;

public record MiniappOneTapLoginRequest(
    @NotBlank(message = "缺少微信手机号授权码") String phoneCode,
    ClientRole role
) {
}
