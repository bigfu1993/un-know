package com.unknown.platform.common.realtime;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

/**
 * 客户端 WebSocket 注册配置。
 */
@Configuration
@EnableWebSocket
public class ClientRealtimeWebSocketConfig implements WebSocketConfigurer {
  private final ClientRealtimeWebSocketHandler clientRealtimeWebSocketHandler;

  public ClientRealtimeWebSocketConfig(ClientRealtimeWebSocketHandler clientRealtimeWebSocketHandler) {
    this.clientRealtimeWebSocketHandler = clientRealtimeWebSocketHandler;
  }

  @Override
  public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
    registry.addHandler(clientRealtimeWebSocketHandler, "/ws/client")
        .setAllowedOrigins("http://127.0.0.1:8899", "http://localhost:8899");
  }
}
