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

/** 客户端首页接口，供 H5、App 壳和小程序共享首页工作台数据。 */
@RestController
@RequestMapping("/api/client")
public class ClientHomeController {
  private final ClientHomeAppService clientHomeAppService;

  public ClientHomeController(ClientHomeAppService clientHomeAppService) {
    this.clientHomeAppService = clientHomeAppService;
  }

  /**
   * 获取当前角色首页聚合数据。
   *
   * @param authorization 登录访问令牌，可为空
   * @param role 当前客户端角色
   * @return 首页聚合数据
   */
  @GetMapping("/home")
  public ApiResponse<ClientHomeResponse> home(
      @RequestHeader(value = "Authorization", required = false) String authorization,
      @RequestParam(defaultValue = "student") ClientRole role
  ) {
    return ApiResponse.ok(clientHomeAppService.getHome(role, authorization));
  }
}
