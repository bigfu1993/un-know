package com.unknown.platform.common.realtime;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.unknown.platform.common.exception.BusinessException;
import com.unknown.platform.common.security.ClientSessionService;
import java.io.IOException;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

/**
 * 客户端 WebSocket 连接处理器。
 *
 * <p>浏览器原生 WebSocket 无法像 HTTP fetch 一样稳定携带自定义 header，因此连接建立后第一条消息必须发送
 * auth 消息完成 token 校验。</p>
 */
@Component
public class ClientRealtimeWebSocketHandler extends TextWebSocketHandler {
  private static final CloseStatus AUTH_REQUIRED = new CloseStatus(4001, "AUTH_REQUIRED");
  private static final CloseStatus INVALID_MESSAGE = new CloseStatus(4002, "INVALID_MESSAGE");
  private static final String AUTH_TYPE = "auth";
  private static final String CONNECTED_TYPE = "connected";

  private final ClientSessionService clientSessionService;
  private final ClientRealtimeSessionRegistry sessionRegistry;
  private final ObjectMapper objectMapper;

  public ClientRealtimeWebSocketHandler(
      ClientSessionService clientSessionService,
      ClientRealtimeSessionRegistry sessionRegistry,
      ObjectMapper objectMapper
  ) {
    this.clientSessionService = clientSessionService;
    this.sessionRegistry = sessionRegistry;
    this.objectMapper = objectMapper;
  }

  @Override
  protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
    ClientRealtimeAuthMessage authMessage;
    try {
      authMessage = readAuthMessage(message.getPayload());
    } catch (IOException exception) {
      session.close(INVALID_MESSAGE);
      return;
    }

    if (!AUTH_TYPE.equals(authMessage.type()) || !StringUtils.hasText(authMessage.accessToken())) {
      session.close(AUTH_REQUIRED);
      return;
    }

    try {
      long userId = clientSessionService.requireUserId("Bearer " + authMessage.accessToken().trim());
      sessionRegistry.register(userId, session);
      sendConnectedMessage(session);
    } catch (BusinessException exception) {
      session.close(AUTH_REQUIRED);
    }
  }

  @Override
  public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
    sessionRegistry.unregister(session);
  }

  private ClientRealtimeAuthMessage readAuthMessage(String payload) throws IOException {
    try {
      return objectMapper.readValue(payload, ClientRealtimeAuthMessage.class);
    } catch (IOException exception) {
      throw new IOException(INVALID_MESSAGE.getReason(), exception);
    }
  }

  private void sendConnectedMessage(WebSocketSession session) throws IOException {
    if (!session.isOpen()) {
      return;
    }

    session.sendMessage(new TextMessage(objectMapper.writeValueAsString(new ClientRealtimeConnectedMessage(CONNECTED_TYPE))));
  }

  private record ClientRealtimeAuthMessage(String type, String accessToken) {
  }

  private record ClientRealtimeConnectedMessage(String type) {
  }
}
