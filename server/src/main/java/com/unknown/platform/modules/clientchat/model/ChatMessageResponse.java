package com.unknown.platform.modules.clientchat.model;

/** 聊天消息响应，支持文本、进行中卡片和订单卡片。 */
public record ChatMessageResponse(
    String id,
    String conversationId,
    boolean mine,
    String senderName,
    String messageType,
    String content,
    String relatedCardType,
    String relatedCardId,
    String createdAt
) {
}
