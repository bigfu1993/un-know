package com.unknown.platform.modules.auth.controller.client;

import com.unknown.platform.common.api.ApiResponse;
import com.unknown.platform.modules.auth.application.AuthAppService;
import com.unknown.platform.modules.auth.model.LoginRequest;
import com.unknown.platform.modules.auth.model.LoginResponse;
import com.unknown.platform.modules.auth.model.MiniappOneTapLoginRequest;
import com.unknown.platform.modules.auth.model.RegisterRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/client/auth")
public class AuthClientController {
  private final AuthAppService authAppService;

  public AuthClientController(AuthAppService authAppService) {
    this.authAppService = authAppService;
  }

  @PostMapping("/login")
  public ApiResponse<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
    return ApiResponse.ok(authAppService.login(request));
  }

  @PostMapping("/register")
  public ApiResponse<LoginResponse> register(@Valid @RequestBody RegisterRequest request) {
    return ApiResponse.ok(authAppService.register(request));
  }

  @PostMapping("/miniapp/one-tap-login")
  public ApiResponse<LoginResponse> miniappOneTapLogin(@Valid @RequestBody MiniappOneTapLoginRequest request) {
    return ApiResponse.ok(authAppService.miniappOneTapLogin(request));
  }
}
