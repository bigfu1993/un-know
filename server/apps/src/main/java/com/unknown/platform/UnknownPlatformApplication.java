package com.unknown.platform;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/** 佚名平台后端服务启动入口，统一加载 Spring Boot 自动配置和业务模块。 */
@SpringBootApplication
public class UnknownPlatformApplication {

  /**
   * 启动后端应用。
   *
   * @param args Spring Boot 启动参数
   */
  public static void main(String[] args) {
    SpringApplication.run(UnknownPlatformApplication.class, args);
  }
}
