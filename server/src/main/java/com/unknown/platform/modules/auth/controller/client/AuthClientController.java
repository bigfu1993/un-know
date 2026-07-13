package com.unknown.platform.modules.auth.controller.client;

import com.unknown.platform.common.api.ApiResponse;
import com.unknown.platform.modules.auth.application.AuthAppService;
import com.unknown.platform.modules.auth.model.LoginRequest;
import com.unknown.platform.modules.auth.model.LoginResponse;
import com.unknown.platform.modules.auth.model.MiniappOneTapLoginRequest;
import com.unknown.platform.modules.auth.model.RegisterRequest;
import com.unknown.platform.modules.auth.model.SelectRoleRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 客户端认证接口，承接 H5、App 壳和 Taro 小程序共用的登录注册协议。 */
@RestController
@RequestMapping("/api/client/auth")
public class AuthClientController {
  private final AuthAppService authAppService;

  public AuthClientController(AuthAppService authAppService) {
    this.authAppService = authAppService;
  }

  /**
   * 手机号验证码登录。
   *
   * @param request 登录请求
   * @return 登录会话
   */
  @PostMapping("/login")
  public ApiResponse<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
    return ApiResponse.ok(authAppService.login(request));
  }

  /**
   * 手机号验证码注册。
   *
   * @param request 注册请求
   * @return 注册后的客户端会话
   */
  @PostMapping("/register")
  public ApiResponse<LoginResponse> register(@Valid @RequestBody RegisterRequest request) {
    return ApiResponse.ok(authAppService.register(request));
  }

  /**
   * 注册后确认最终角色。
   *
   * @param authorization 登录访问令牌
   * @param request 角色确认请求
   * @return 更新角色后的客户端会话
   */
  @PostMapping("/select-role")
  public ApiResponse<LoginResponse> selectRole(
      @RequestHeader(value = "Authorization", required = false) String authorization,
      @Valid @RequestBody SelectRoleRequest request
  ) {
    return ApiResponse.ok(authAppService.selectRole(authorization, request));
  }

  /**
   * 小程序一键登录。
   *
   * @param request 微信手机号授权请求
   * @return 登录或自动注册后的客户端会话
   */
  @PostMapping("/miniapp/one-tap-login")
  public ApiResponse<LoginResponse> miniappOneTapLogin(@Valid @RequestBody MiniappOneTapLoginRequest request) {
    return ApiResponse.ok(authAppService.miniappOneTapLogin(request));
  }
}
