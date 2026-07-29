package com.unknown.platform.modules.clientworkspace.controller.client;

import com.unknown.platform.common.api.ApiResponse;
import com.unknown.platform.common.realtime.ClientRealtimeService;
import com.unknown.platform.common.security.ClientSessionService;
import com.unknown.platform.modules.auth.model.ClientRole;
import com.unknown.platform.modules.clientworkspace.application.ClientWorkspaceAppService;
import com.unknown.platform.modules.clientworkspace.model.ClientWorkspaceResponse;
import com.unknown.platform.modules.clientworkspace.model.ClientWorkspaceResponse.HuntingTask;
import com.unknown.platform.modules.clientworkspace.model.ClientWorkspaceResponse.PartTimeJob;
import com.unknown.platform.modules.clientworkspace.model.ClientWorkspaceResponse.TutorDemand;
import com.unknown.platform.modules.clientworkspace.model.ApplyTutorTrialRequest;
import com.unknown.platform.modules.clientworkspace.model.CompleteTutorTrialEndRequest;
import com.unknown.platform.modules.clientworkspace.model.ConfirmTutorTrialRequest;
import com.unknown.platform.modules.clientworkspace.model.CreateHuntingProjectRequest;
import com.unknown.platform.modules.clientworkspace.model.HuntingProjectResponse;
import com.unknown.platform.modules.clientworkspace.model.HuntingQuoteDecisionRequest;
import com.unknown.platform.modules.clientworkspace.model.HuntingTaskFulfillmentActionRequest;
import com.unknown.platform.modules.clientworkspace.model.PublishHuntingTaskRequest;
import com.unknown.platform.modules.clientworkspace.model.PublishTutorDemandRequest;
import com.unknown.platform.modules.clientworkspace.model.QuoteHuntingTaskRequest;
import com.unknown.platform.modules.clientworkspace.model.TutorWorkflowActionRequest;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 客户端工作台接口，聚合订单、兼职、委托/狩猎、家教、商户商品和钱包数据。 */
@RestController
@RequestMapping("/api/client")
public class ClientWorkspaceController {
  private final ClientWorkspaceAppService clientWorkspaceAppService;
  private final ClientSessionService clientSessionService;
  private final ClientRealtimeService clientRealtimeService;

  public ClientWorkspaceController(
      ClientWorkspaceAppService clientWorkspaceAppService,
      ClientSessionService clientSessionService,
      ClientRealtimeService clientRealtimeService
  ) {
    this.clientWorkspaceAppService = clientWorkspaceAppService;
    this.clientSessionService = clientSessionService;
    this.clientRealtimeService = clientRealtimeService;
  }

  /**
   * 获取客户端工作台聚合数据。
   *
   * @param authorization 登录访问令牌，可为空
   * @param clientRoleHeader 登录用户角色请求头
   * @return 工作台聚合数据
   */
  @GetMapping("/workspace")
  public ApiResponse<ClientWorkspaceResponse> workspace(
      @RequestHeader(value = "Authorization", required = false) String authorization,
      @RequestHeader(value = ClientSessionService.CLIENT_USER_ROLE_HEADER, required = false) String clientRoleHeader
  ) {
    ClientRole role = clientSessionService.resolveClientRole(authorization, clientRoleHeader);
    return ApiResponse.ok(clientWorkspaceAppService.getWorkspace(role, authorization));
  }

  /** 获取兼职列表独立接口，避免兼职页依赖完整工作台聚合响应。 */
  @GetMapping("/workspace/part-time-jobs")
  public ApiResponse<List<PartTimeJob>> partTimeJobs() {
    return ApiResponse.ok(clientWorkspaceAppService.listPartTimeJobs());
  }

  /** 获取委托/狩猎任务列表独立接口，保留登录用户视角下的报价和履约状态。 */
  @GetMapping("/workspace/hunting-tasks")
  public ApiResponse<List<HuntingTask>> huntingTasks(
      @RequestHeader(value = "Authorization", required = false) String authorization
  ) {
    return ApiResponse.ok(clientWorkspaceAppService.listHuntingTasks(authorization));
  }

  /** 获取家教列表独立接口，按当前角色返回家长或学生视角数据。 */
  @GetMapping("/workspace/tutor-demands")
  public ApiResponse<List<TutorDemand>> tutorDemands(
      @RequestHeader(value = "Authorization", required = false) String authorization,
      @RequestHeader(value = ClientSessionService.CLIENT_USER_ROLE_HEADER, required = false) String clientRoleHeader
  ) {
    ClientRole role = clientSessionService.resolveClientRole(authorization, clientRoleHeader);
    return ApiResponse.ok(clientWorkspaceAppService.listTutorDemands(role, authorization));
  }

  /** 发布委托或回收任务，返回列表可直接展示的任务卡片数据。 */
  @PostMapping("/workspace/hunting-tasks")
  public ApiResponse<HuntingTask> publishHuntingTask(
      @Valid @RequestBody PublishHuntingTaskRequest request,
      @RequestHeader(value = "Authorization", required = false) String authorization
  ) {
    HuntingTask response = clientWorkspaceAppService.publishHuntingTask(request, authorization);
    publishOngoingOrdersChanged("hunting", response.id(), "hunting_task_published");
    return ApiResponse.ok(response);
  }

  /** 创建狩猎项目，系统据此匹配推荐委托。 */
  @PostMapping("/workspace/hunting-projects")
  public ApiResponse<HuntingProjectResponse> createHuntingProject(
      @Valid @RequestBody CreateHuntingProjectRequest request,
      @RequestHeader(value = "Authorization", required = false) String authorization
  ) {
    return ApiResponse.ok(clientWorkspaceAppService.createHuntingProject(request, authorization));
  }

  /** 家长发布家教需求，发布后进入进行中列表。 */
  @PostMapping("/workspace/tutor-demands")
  public ApiResponse<TutorDemand> publishTutorDemand(
      @Valid @RequestBody PublishTutorDemandRequest request,
      @RequestHeader(value = "Authorization", required = false) String authorization
  ) {
    TutorDemand response = clientWorkspaceAppService.publishTutorDemand(request, authorization);
    publishOngoingOrdersChanged("tutor", response.id(), "tutor_demand_published");
    return ApiResponse.ok(response);
  }

  /** 学生申请家教试课。 */
  @PostMapping("/workspace/tutor-demands/{demandId}/applications")
  public ApiResponse<TutorDemand> applyTutorTrial(
      @PathVariable String demandId,
      @RequestBody(required = false) ApplyTutorTrialRequest request,
      @RequestHeader(value = "Authorization", required = false) String authorization
  ) {
    TutorDemand response = clientWorkspaceAppService.applyTutorTrial(demandId, request, authorization);
    publishOngoingOrdersChanged("tutor", response.id(), "tutor_trial_applied");
    return ApiResponse.ok(response);
  }

  /** 学生取消自己的试课申请，取消后申请退出家长处理链路。 */
  @PostMapping("/workspace/tutor-applications/{applicationId}/cancel")
  public ApiResponse<TutorDemand> cancelTutorApplication(
      @PathVariable String applicationId,
      @RequestHeader(value = "Authorization", required = false) String authorization
  ) {
    TutorDemand response = clientWorkspaceAppService.cancelTutorApplication(applicationId, authorization);
    publishOngoingOrdersChanged("tutor", response.id(), "tutor_application_cancelled");
    return ApiResponse.ok(response);
  }

  /** 家长确认学生家教试课安排。 */
  @PostMapping("/workspace/tutor-demands/{demandId}/applications/{applicationId}/trial")
  public ApiResponse<TutorDemand> confirmTutorTrial(
      @PathVariable String demandId,
      @PathVariable String applicationId,
      @Valid @RequestBody ConfirmTutorTrialRequest request,
      @RequestHeader(value = "Authorization", required = false) String authorization
  ) {
    TutorDemand response = clientWorkspaceAppService.confirmTutorTrial(demandId, applicationId, request, authorization);
    publishOngoingOrdersChanged("tutor", response.id(), "tutor_trial_schedule_confirmed");
    return ApiResponse.ok(response);
  }

  /** 学生确认家长试课安排并进入试课中。 */
  @PostMapping("/workspace/tutor-applications/{applicationId}/trial/confirm")
  public ApiResponse<TutorDemand> confirmTutorTrialStart(
      @PathVariable String applicationId,
      @RequestHeader(value = "Authorization", required = false) String authorization
  ) {
    TutorDemand response = clientWorkspaceAppService.confirmTutorTrialStart(applicationId, authorization);
    publishOngoingOrdersChanged("tutor", response.id(), "tutor_trial_started");
    return ApiResponse.ok(response);
  }

  /** 学生发起结束试课确认。 */
  @PostMapping("/workspace/tutor-applications/{applicationId}/trial/end-request")
  public ApiResponse<TutorDemand> requestTutorTrialEnd(
      @PathVariable String applicationId,
      @RequestHeader(value = "Authorization", required = false) String authorization
  ) {
    TutorDemand response = clientWorkspaceAppService.requestTutorTrialEnd(applicationId, authorization);
    publishOngoingOrdersChanged("tutor", response.id(), "tutor_trial_end_requested");
    return ApiResponse.ok(response);
  }

  /** 家长同意结束试课，并决定是否进入正式家教。 */
  @PostMapping("/workspace/tutor-demands/{demandId}/applications/{applicationId}/trial/end")
  public ApiResponse<TutorDemand> completeTutorTrialEnd(
      @PathVariable String demandId,
      @PathVariable String applicationId,
      @RequestBody(required = false) CompleteTutorTrialEndRequest request,
      @RequestHeader(value = "Authorization", required = false) String authorization
  ) {
    TutorDemand response = clientWorkspaceAppService.completeTutorTrialEnd(demandId, applicationId, request, authorization);
    publishOngoingOrdersChanged("tutor", response.id(), "tutor_trial_end_completed");
    return ApiResponse.ok(response);
  }

  /** 按流程图推进家教申请、试课、正式雇佣、兼职日程和结算动作。 */
  @PostMapping("/workspace/tutor-applications/{applicationId}/workflow-action")
  public ApiResponse<TutorDemand> handleTutorWorkflowAction(
      @PathVariable String applicationId,
      @RequestBody(required = false) TutorWorkflowActionRequest request,
      @RequestHeader(value = "Authorization", required = false) String authorization
  ) {
    TutorDemand response = clientWorkspaceAppService.handleTutorWorkflowAction(applicationId, request, authorization);
    publishOngoingOrdersChanged("tutor", response.id(), "tutor_workflow_changed");
    return ApiResponse.ok(response);
  }

  /** 家长取消发布尚未安排试课的家教兼职，主任务回到待发布状态。 */
  @PostMapping("/workspace/tutor-demands/{demandId}/cancel")
  public ApiResponse<TutorDemand> cancelTutorDemand(
      @PathVariable String demandId,
      @RequestHeader(value = "Authorization", required = false) String authorization
  ) {
    TutorDemand response = clientWorkspaceAppService.cancelTutorDemand(demandId, authorization);
    publishOngoingOrdersChanged("tutor", response.id(), "tutor_demand_cancelled");
    return ApiResponse.ok(response);
  }

  /** 服务方接受固定金额委托，后端完成锁单和押金冻结校验。 */
  @PostMapping("/workspace/hunting-tasks/{taskId}/accept")
  public ApiResponse<HuntingTask> acceptHuntingTask(
      @PathVariable String taskId,
      @RequestHeader(value = "Authorization", required = false) String authorization
  ) {
    HuntingTask response = clientWorkspaceAppService.acceptHuntingTask(taskId, authorization);
    publishOngoingOrdersChanged("hunting", response.id(), "hunting_task_accepted");
    return ApiResponse.ok(response);
  }

  /** 服务方提交报价，报价等待发布方确认后才进入履约。 */
  @PostMapping("/workspace/hunting-tasks/{taskId}/quotes")
  public ApiResponse<HuntingTask> quoteHuntingTask(
      @PathVariable String taskId,
      @Valid @RequestBody QuoteHuntingTaskRequest request,
      @RequestHeader(value = "Authorization", required = false) String authorization
  ) {
    HuntingTask response = clientWorkspaceAppService.quoteHuntingTask(taskId, request, authorization);
    publishOngoingOrdersChanged("hunting", response.id(), "hunting_task_quoted");
    return ApiResponse.ok(response);
  }

  /** 发布方确认报价，确认后任务进入履约并冻结服务方押金。 */
  @PostMapping("/workspace/hunting-tasks/{taskId}/quotes/{quoteId}/confirm")
  public ApiResponse<HuntingTask> confirmHuntingQuote(
      @PathVariable String taskId,
      @PathVariable String quoteId,
      @RequestHeader(value = "Authorization", required = false) String authorization
  ) {
    HuntingTask response = clientWorkspaceAppService.confirmHuntingQuote(taskId, quoteId, authorization);
    publishOngoingOrdersChanged("hunting", response.id(), "hunting_quote_confirmed");
    return ApiResponse.ok(response);
  }

  /** 发布方或服务方处理报价协商，可确认、拒绝或改价后推送给对方。 */
  @PostMapping("/workspace/hunting-tasks/{taskId}/quotes/{quoteId}/decision")
  public ApiResponse<HuntingTask> decideHuntingQuote(
      @PathVariable String taskId,
      @PathVariable String quoteId,
      @RequestBody HuntingQuoteDecisionRequest request,
      @RequestHeader(value = "Authorization", required = false) String authorization
  ) {
    HuntingTask response = clientWorkspaceAppService.decideHuntingQuote(taskId, quoteId, request, authorization);
    publishOngoingOrdersChanged("hunting", response.id(), "hunting_quote_decided");
    return ApiResponse.ok(response);
  }

  /** 履约阶段处理服务方取消/完成申请、发布方确认以及取消后的再次发布。 */
  @PostMapping("/workspace/hunting-tasks/{taskId}/fulfillment-action")
  public ApiResponse<HuntingTask> handleHuntingTaskFulfillmentAction(
      @PathVariable String taskId,
      @RequestBody HuntingTaskFulfillmentActionRequest request,
      @RequestHeader(value = "Authorization", required = false) String authorization
  ) {
    HuntingTask response = clientWorkspaceAppService.handleHuntingTaskFulfillmentAction(taskId, request, authorization);
    publishOngoingOrdersChanged("hunting", response.id(), "hunting_fulfillment_changed");
    return ApiResponse.ok(response);
  }

  private void publishOngoingOrdersChanged(String bizType, String bizId, String reason) {
    clientRealtimeService.publishOngoingOrdersChanged(bizType, bizId, reason);
  }
}
