package com.unknown.platform.modules.clientchat.model;

import jakarta.validation.constraints.NotBlank;

/** 保存聊天快捷按钮请求。 */
public record ChatQuickActionRequest(
    @NotBlank(message = "快捷按钮名称不能为空") String label,
    @NotBlank(message = "快捷按钮内容不能为空") String content,
    Integer sortOrder
) {
}
