package com.unknown.platform.modules.clientworkspace.controller.client;

import com.unknown.platform.common.api.ApiResponse;
import com.unknown.platform.modules.auth.model.ClientRole;
import com.unknown.platform.modules.clientworkspace.application.ClientWorkspaceAppService;
import com.unknown.platform.modules.clientworkspace.model.ClientWorkspaceResponse;
import com.unknown.platform.modules.clientworkspace.model.ClientWorkspaceResponse.HuntingTask;
import com.unknown.platform.modules.clientworkspace.model.HuntingQuoteDecisionRequest;
import com.unknown.platform.modules.clientworkspace.model.PublishHuntingTaskRequest;
import com.unknown.platform.modules.clientworkspace.model.QuoteHuntingTaskRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** 客户端工作台接口，聚合订单、兼职、委托/狩猎、家教、商户商品和钱包数据。 */
@RestController
@RequestMapping("/api/client")
public class ClientWorkspaceController {
  private final ClientWorkspaceAppService clientWorkspaceAppService;

  public ClientWorkspaceController(ClientWorkspaceAppService clientWorkspaceAppService) {
    this.clientWorkspaceAppService = clientWorkspaceAppService;
  }

  /**
   * 获取客户端工作台聚合数据。
   *
   * @param role 当前角色
   * @param authorization 登录访问令牌，可为空
   * @return 工作台聚合数据
   */
  @GetMapping("/workspace")
  public ApiResponse<ClientWorkspaceResponse> workspace(
      @RequestParam(defaultValue = "student") ClientRole role,
      @RequestHeader(value = "Authorization", required = false) String authorization
  ) {
    return ApiResponse.ok(clientWorkspaceAppService.getWorkspace(role, authorization));
  }

  /** 发布委托或回收任务，返回列表可直接展示的任务卡片数据。 */
  @PostMapping("/workspace/hunting-tasks")
  public ApiResponse<HuntingTask> publishHuntingTask(
      @Valid @RequestBody PublishHuntingTaskRequest request,
      @RequestHeader(value = "Authorization", required = false) String authorization
  ) {
    return ApiResponse.ok(clientWorkspaceAppService.publishHuntingTask(request, authorization));
  }

  /** 服务方接受固定金额委托，后端完成锁单和押金冻结校验。 */
  @PostMapping("/workspace/hunting-tasks/{taskId}/accept")
  public ApiResponse<HuntingTask> acceptHuntingTask(
      @PathVariable String taskId,
      @RequestHeader(value = "Authorization", required = false) String authorization
  ) {
    return ApiResponse.ok(clientWorkspaceAppService.acceptHuntingTask(taskId, authorization));
  }

  /** 服务方提交报价，报价等待发布方确认后才进入履约。 */
  @PostMapping("/workspace/hunting-tasks/{taskId}/quotes")
  public ApiResponse<HuntingTask> quoteHuntingTask(
      @PathVariable String taskId,
      @Valid @RequestBody QuoteHuntingTaskRequest request,
      @RequestHeader(value = "Authorization", required = false) String authorization
  ) {
    return ApiResponse.ok(clientWorkspaceAppService.quoteHuntingTask(taskId, request, authorization));
  }

  /** 发布方确认报价，确认后任务进入履约并冻结服务方押金。 */
  @PostMapping("/workspace/hunting-tasks/{taskId}/quotes/{quoteId}/confirm")
  public ApiResponse<HuntingTask> confirmHuntingQuote(
      @PathVariable String taskId,
      @PathVariable String quoteId,
      @RequestHeader(value = "Authorization", required = false) String authorization
  ) {
    return ApiResponse.ok(clientWorkspaceAppService.confirmHuntingQuote(taskId, quoteId, authorization));
  }

  /** 发布方或服务方处理报价协商，可确认、拒绝或改价后推送给对方。 */
  @PostMapping("/workspace/hunting-tasks/{taskId}/quotes/{quoteId}/decision")
  public ApiResponse<HuntingTask> decideHuntingQuote(
      @PathVariable String taskId,
      @PathVariable String quoteId,
      @RequestBody HuntingQuoteDecisionRequest request,
      @RequestHeader(value = "Authorization", required = false) String authorization
  ) {
    return ApiResponse.ok(clientWorkspaceAppService.decideHuntingQuote(taskId, quoteId, request, authorization));
  }
}
