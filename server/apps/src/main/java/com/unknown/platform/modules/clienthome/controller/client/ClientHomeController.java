package com.unknown.platform.modules.clienthome.controller.client;

import com.unknown.platform.common.api.ApiResponse;
import com.unknown.platform.common.security.ClientRequestContext;
import com.unknown.platform.modules.clienthome.application.ClientHomeAppService;
import com.unknown.platform.modules.clienthome.model.ClientHomeResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 客户端首页接口，供 H5、App 壳和小程序共享首页工作台数据。 */
@RestController
@RequestMapping("/client")
public class ClientHomeController {
  private final ClientHomeAppService clientHomeAppService;

  public ClientHomeController(ClientHomeAppService clientHomeAppService) {
    this.clientHomeAppService = clientHomeAppService;
  }

  /**
   * 获取当前角色首页聚合数据。
   *
   * @param context 客户端请求上下文（角色 + 登录令牌）
   * @return 首页聚合数据
   */
  @GetMapping("/home")
  public ApiResponse<ClientHomeResponse> home(ClientRequestContext context) {
    return ApiResponse.ok(clientHomeAppService.getHome(context.role(), context.authorization()));
  }
}
