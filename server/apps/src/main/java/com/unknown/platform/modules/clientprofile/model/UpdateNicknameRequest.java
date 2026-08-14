package com.unknown.platform.modules.clientprofile.model;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** 客户端修改用户昵称请求，昵称持久化到 app_user.nickname。 */
public record UpdateNicknameRequest(
    @NotBlank(message = "昵称不能为空") @Size(max = 40, message = "昵称最多 40 个字符") String nickname
) {
}
