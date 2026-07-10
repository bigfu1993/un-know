package com.unknown.platform.modules.clientworkspace.controller.client;

import com.unknown.platform.common.api.ApiResponse;
import com.unknown.platform.modules.auth.model.ClientRole;
import com.unknown.platform.modules.clientworkspace.application.ClientWorkspaceAppService;
import com.unknown.platform.modules.clientworkspace.model.ClientWorkspaceResponse;
import org.springframework.web.bind.annotation.GetMapping;
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
}
