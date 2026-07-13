package com.unknown.platform.modules.auth.model;

/** 登录、注册和角色确认接口返回的客户端会话信息。 */
public record LoginResponse(
    String accessToken,
    String refreshToken,
    ClientRole role,
    String accountStatus,
    String phone,
    String displayName,
    boolean profileCompletionRequired
) {
}
