package com.unknown.platform.modules.clientchat.model;

import jakarta.validation.constraints.NotBlank;

/** 创建或复用聊天会话请求。 */
public record CreateChatConversationRequest(
    @NotBlank(message = "对方用户 ID 不能为空") String peerUserId,
    String title,
    String relatedBizType,
    String relatedBizId
) {
}
