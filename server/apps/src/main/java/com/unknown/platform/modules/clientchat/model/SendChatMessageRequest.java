package com.unknown.platform.modules.clientchat.model;

import jakarta.validation.constraints.NotBlank;

/** 发送聊天消息请求，不包含表情和语音能力。 */
public record SendChatMessageRequest(
    @NotBlank(message = "消息内容不能为空") String content,
    String messageType,
    String relatedCardType,
    String relatedCardId
) {
}
