package com.unknown.platform.common.api;

/** 用户名称展示快照，名称字段统一来自 app_user.nickname。 */
public record UserNickname(
    String nickname,
    String phone
) {
}
