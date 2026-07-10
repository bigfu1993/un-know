package com.unknown.platform.modules.admin.controller;

import com.unknown.platform.common.api.ApiResponse;
import java.time.OffsetDateTime;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
public class AdminHealthController {

  @GetMapping("/health")
  public ApiResponse<Map<String, Object>> health() {
    return ApiResponse.ok(Map.of(
        "status", "UP",
        "service", "unknown-platform-server",
        "time", OffsetDateTime.now().toString()
    ));
  }
}

