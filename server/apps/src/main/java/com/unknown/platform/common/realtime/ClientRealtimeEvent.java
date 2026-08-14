package com.unknown.platform.common.realtime;

/**
 * 客户端实时事件消息。
 *
 * <p>WebSocket 只承载事件通知，不承载业务详情数据；H5 收到后按 scope 重新调用 HTTP 接口查询权威数据。</p>
 */
public record ClientRealtimeEvent(
    String type,
    String scope,
    String bizType,
    String bizId,
    String reason,
    long version,
    String occurredAt
) {
}
