package com.unknown.platform.modules.clienthome.controller.client;

import com.unknown.platform.common.api.ApiResponse;
import com.unknown.platform.modules.auth.model.ClientRole;
import com.unknown.platform.modules.clienthome.application.ClientHomeAppService;
import com.unknown.platform.modules.clienthome.model.ClientHomeResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/client")
public class ClientHomeController {
  private final ClientHomeAppService clientHomeAppService;

  public ClientHomeController(ClientHomeAppService clientHomeAppService) {
    this.clientHomeAppService = clientHomeAppService;
  }

  @GetMapping("/home")
  public ApiResponse<ClientHomeResponse> home(
      @RequestHeader(value = "Authorization", required = false) String authorization,
      @RequestParam(defaultValue = "student") ClientRole role
  ) {
    return ApiResponse.ok(clientHomeAppService.getHome(role, authorization));
  }
}
