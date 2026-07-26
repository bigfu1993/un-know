package com.unknown.platform.modules.clientchat.model;

import com.unknown.platform.common.api.UserNickname;

/** 聊天会话摘要，后续可接入任意页面消息入口。 */
public record ChatConversationResponse(
    String id,
    UserNickname peer,
    String title,
    String relatedBizType,
    String relatedBizId,
    String lastMessage,
    String updatedAt,
    int unreadCount
) {
}
