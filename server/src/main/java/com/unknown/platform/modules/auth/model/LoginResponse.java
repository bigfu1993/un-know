package com.unknown.platform.modules.auth.model;

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
