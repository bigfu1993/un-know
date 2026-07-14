package com.unknown.platform.modules.clientchat.controller.client;

import com.unknown.platform.common.api.ApiResponse;
import com.unknown.platform.modules.clientchat.application.ClientChatAppService;
import com.unknown.platform.modules.clientchat.model.ChatConversationResponse;
import com.unknown.platform.modules.clientchat.model.ChatMessageResponse;
import com.unknown.platform.modules.clientchat.model.ChatQuickActionRequest;
import com.unknown.platform.modules.clientchat.model.ChatQuickActionResponse;
import com.unknown.platform.modules.clientchat.model.CreateChatConversationRequest;
import com.unknown.platform.modules.clientchat.model.SendChatMessageRequest;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 客户端独立聊天接口，暂不绑定现有页面入口。 */
@RestController
@RequestMapping("/api/client/chat")
public class ClientChatController {
  private final ClientChatAppService clientChatAppService;

  public ClientChatController(ClientChatAppService clientChatAppService) {
    this.clientChatAppService = clientChatAppService;
  }

  /** 查询当前账号聊天会话。 */
  @GetMapping("/conversations")
  public ApiResponse<List<ChatConversationResponse>> conversations(
      @RequestHeader(value = "Authorization", required = false) String authorization
  ) {
    return ApiResponse.ok(clientChatAppService.conversations(authorization));
  }

  /** 创建或复用聊天会话。 */
  @PostMapping("/conversations")
  public ApiResponse<ChatConversationResponse> createConversation(
      @Valid @RequestBody CreateChatConversationRequest request,
      @RequestHeader(value = "Authorization", required = false) String authorization
  ) {
    return ApiResponse.ok(clientChatAppService.createConversation(request, authorization));
  }

  /** 查询会话内消息。 */
  @GetMapping("/conversations/{conversationId}/messages")
  public ApiResponse<List<ChatMessageResponse>> messages(
      @PathVariable String conversationId,
      @RequestHeader(value = "Authorization", required = false) String authorization
  ) {
    return ApiResponse.ok(clientChatAppService.messages(conversationId, authorization));
  }

  /** 发送会话消息。 */
  @PostMapping("/conversations/{conversationId}/messages")
  public ApiResponse<ChatMessageResponse> sendMessage(
      @PathVariable String conversationId,
      @Valid @RequestBody SendChatMessageRequest request,
      @RequestHeader(value = "Authorization", required = false) String authorization
  ) {
    return ApiResponse.ok(clientChatAppService.sendMessage(conversationId, request, authorization));
  }

  /** 查询当前账号快捷按钮。 */
  @GetMapping("/quick-actions")
  public ApiResponse<List<ChatQuickActionResponse>> quickActions(
      @RequestHeader(value = "Authorization", required = false) String authorization
  ) {
    return ApiResponse.ok(clientChatAppService.quickActions(authorization));
  }

  /** 新增聊天快捷按钮。 */
  @PostMapping("/quick-actions")
  public ApiResponse<ChatQuickActionResponse> createQuickAction(
      @Valid @RequestBody ChatQuickActionRequest request,
      @RequestHeader(value = "Authorization", required = false) String authorization
  ) {
    return ApiResponse.ok(clientChatAppService.createQuickAction(request, authorization));
  }
}
