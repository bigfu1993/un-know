package com.unknown.platform.modules.clientchat.model;

/** 聊天快捷按钮配置响应。 */
public record ChatQuickActionResponse(
    String id,
    String label,
    String content,
    int sortOrder
) {
}
