package com.unknown.platform.modules.admin.controller;

import com.unknown.platform.common.api.ApiResponse;
import java.time.OffsetDateTime;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 管理端健康检查接口，供部署、反向代理和前端后台项目确认服务可用。 */
@RestController
@RequestMapping("/api/admin")
public class AdminHealthController {

  /**
   * 返回管理端服务健康状态。
   *
   * @return 服务状态、服务名和当前时间
   */
  @GetMapping("/health")
  public ApiResponse<Map<String, Object>> health() {
    return ApiResponse.ok(Map.of(
        "status", "UP",
        "service", "unknown-platform-server",
        "time", OffsetDateTime.now().toString()
    ));
  }
}
