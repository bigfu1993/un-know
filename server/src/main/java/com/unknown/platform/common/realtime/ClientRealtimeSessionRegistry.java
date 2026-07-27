package com.unknown.platform.common.realtime;

import java.io.IOException;
import java.util.Collection;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

/**
 * 客户端 WebSocket 会话注册表。
 *
 * <p>第一阶段单 JVM 内维护连接，后续多节点部署时可替换为 Redis Pub/Sub 或独立 WebSocket 网关。</p>
 */
@Component
public class ClientRealtimeSessionRegistry {
  private final Map<String, WebSocketSession> sessions = new ConcurrentHashMap<>();
  private final Map<String, Long> sessionUserIds = new ConcurrentHashMap<>();
  private final Map<Long, Set<String>> userSessionIds = new ConcurrentHashMap<>();

  /**
   * 绑定已认证客户端连接。
   *
   * @param userId 当前登录用户 ID
   * @param session WebSocket 会话
   */
  public void register(long userId, WebSocketSession session) {
    sessions.put(session.getId(), session);
    sessionUserIds.put(session.getId(), userId);
    userSessionIds.computeIfAbsent(userId, ignored -> ConcurrentHashMap.newKeySet()).add(session.getId());
  }

  /**
   * 清理断开的客户端连接。
   *
   * @param session WebSocket 会话
   */
  public void unregister(WebSocketSession session) {
    Long userId = sessionUserIds.remove(session.getId());
    sessions.remove(session.getId());
    if (userId == null) {
      return;
    }

    Set<String> userSessions = userSessionIds.get(userId);
    if (userSessions == null) {
      return;
    }

    userSessions.remove(session.getId());
    if (userSessions.isEmpty()) {
      userSessionIds.remove(userId);
    }
  }

  /**
   * 向指定用户的全部在线端发送轻量事件。
   *
   * @param userIds 目标用户 ID
   * @param payload 已序列化事件 JSON
   */
  public void sendToUsers(Collection<Long> userIds, String payload) {
    userIds.forEach(userId -> {
      Set<String> userSessions = userSessionIds.get(userId);
      if (userSessions == null) {
        return;
      }

      userSessions.forEach(sessionId -> {
        WebSocketSession session = sessions.get(sessionId);
        if (session != null) {
          send(session, payload);
        }
      });
    });
  }

  private void send(WebSocketSession session, String payload) {
    if (!session.isOpen()) {
      unregister(session);
      return;
    }

    try {
      synchronized (session) {
        session.sendMessage(new TextMessage(payload));
      }
    } catch (IOException exception) {
      unregister(session);
    }
  }
}
