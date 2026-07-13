package com.unknown.platform.modules.clientworkspace.controller.client;

import com.unknown.platform.common.api.ApiResponse;
import com.unknown.platform.modules.auth.model.ClientRole;
import com.unknown.platform.modules.clientworkspace.application.ClientWorkspaceAppService;
import com.unknown.platform.modules.clientworkspace.model.ClientWorkspaceResponse;
import com.unknown.platform.modules.clientworkspace.model.ClientWorkspaceResponse.HuntingTask;
import com.unknown.platform.modules.clientworkspace.model.PublishHuntingTaskRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/client")
public class ClientWorkspaceController {
  private final ClientWorkspaceAppService clientWorkspaceAppService;

  public ClientWorkspaceController(ClientWorkspaceAppService clientWorkspaceAppService) {
    this.clientWorkspaceAppService = clientWorkspaceAppService;
  }

  @GetMapping("/workspace")
  public ApiResponse<ClientWorkspaceResponse> workspace(@RequestParam(defaultValue = "student") ClientRole role) {
    return ApiResponse.ok(clientWorkspaceAppService.getWorkspace(role));
  }

  /** 发布委托或回收任务，返回列表可直接展示的任务卡片数据。 */
  @PostMapping("/workspace/hunting-tasks")
  public ApiResponse<HuntingTask> publishHuntingTask(@Valid @RequestBody PublishHuntingTaskRequest request) {
    return ApiResponse.ok(clientWorkspaceAppService.publishHuntingTask(request));
  }
}
