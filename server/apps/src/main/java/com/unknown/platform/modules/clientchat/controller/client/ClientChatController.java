package com.unknown.platform.modules.clientchat.controller.client;

import com.unknown.platform.common.api.ApiResponse;
import com.unknown.platform.common.security.ClientRequestContext;
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
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 客户端独立聊天接口，暂不绑定现有页面入口。 */
@RestController
@RequestMapping("/client/chat")
public class ClientChatController {
  private final ClientChatAppService clientChatAppService;

  public ClientChatController(ClientChatAppService clientChatAppService) {
    this.clientChatAppService = clientChatAppService;
  }

  /** 查询当前账号聊天会话。 */
  @GetMapping("/conversations")
  public ApiResponse<List<ChatConversationResponse>> conversations(ClientRequestContext context) {
    return ApiResponse.ok(clientChatAppService.conversations(context.authorization()));
  }

  /** 创建或复用聊天会话。 */
  @PostMapping("/conversations")
  public ApiResponse<ChatConversationResponse> createConversation(
      @Valid @RequestBody CreateChatConversationRequest request,
      ClientRequestContext context
  ) {
    return ApiResponse.ok(clientChatAppService.createConversation(request, context.authorization()));
  }

  /** 查询会话内消息。 */
  @GetMapping("/conversations/{conversationId}/messages")
  public ApiResponse<List<ChatMessageResponse>> messages(
      @PathVariable String conversationId,
      ClientRequestContext context
  ) {
    return ApiResponse.ok(clientChatAppService.messages(conversationId, context.authorization()));
  }

  /** 发送会话消息。 */
  @PostMapping("/conversations/{conversationId}/messages")
  public ApiResponse<ChatMessageResponse> sendMessage(
      @PathVariable String conversationId,
      @Valid @RequestBody SendChatMessageRequest request,
      ClientRequestContext context
  ) {
    return ApiResponse.ok(clientChatAppService.sendMessage(conversationId, request, context.authorization()));
  }

  /** 查询当前账号快捷按钮。 */
  @GetMapping("/quick-actions")
  public ApiResponse<List<ChatQuickActionResponse>> quickActions(ClientRequestContext context) {
    return ApiResponse.ok(clientChatAppService.quickActions(context.authorization()));
  }

  /** 新增聊天快捷按钮。 */
  @PostMapping("/quick-actions")
  public ApiResponse<ChatQuickActionResponse> createQuickAction(
      @Valid @RequestBody ChatQuickActionRequest request,
      ClientRequestContext context
  ) {
    return ApiResponse.ok(clientChatAppService.createQuickAction(request, context.authorization()));
  }
}
