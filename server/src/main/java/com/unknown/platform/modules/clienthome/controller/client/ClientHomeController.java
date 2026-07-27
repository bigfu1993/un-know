package com.unknown.platform.modules.clienthome.controller.client;

import com.unknown.platform.common.api.ApiResponse;
import com.unknown.platform.common.security.ClientSessionService;
import com.unknown.platform.modules.auth.model.ClientRole;
import com.unknown.platform.modules.clienthome.application.ClientHomeAppService;
import com.unknown.platform.modules.clienthome.model.ClientHomeResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 客户端首页接口，供 H5、App 壳和小程序共享首页工作台数据。 */
@RestController
@RequestMapping("/api/client")
public class ClientHomeController {
  private final ClientHomeAppService clientHomeAppService;
  private final ClientSessionService clientSessionService;

  public ClientHomeController(ClientHomeAppService clientHomeAppService, ClientSessionService clientSessionService) {
    this.clientHomeAppService = clientHomeAppService;
    this.clientSessionService = clientSessionService;
  }

  /**
   * 获取当前角色首页聚合数据。
   *
   * @param authorization 登录访问令牌，可为空
   * @param clientRoleHeader 登录用户角色请求头
   * @return 首页聚合数据
   */
  @GetMapping("/home")
  public ApiResponse<ClientHomeResponse> home(
      @RequestHeader(value = "Authorization", required = false) String authorization,
      @RequestHeader(value = ClientSessionService.CLIENT_USER_ROLE_HEADER, required = false) String clientRoleHeader
  ) {
    ClientRole role = clientSessionService.resolveClientRole(authorization, clientRoleHeader);
    return ApiResponse.ok(clientHomeAppService.getHome(role, authorization));
  }
}
