package com.unknown.platform.modules.auth.model;

/** 客户端重置密码结果，保持统一响应 data 不为空，便于多端 API 客户端消费。 */
public record ResetPasswordResponse(boolean success) {
}
