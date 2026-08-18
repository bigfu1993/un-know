package com.unknown.platform.config;

import com.unknown.platform.common.security.ClientRequestContextArgumentResolver;
import java.util.List;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/** 注册 {@link ClientRequestContextArgumentResolver}，使 Controller 方法可以直接声明 ClientRequestContext 参数。 */
@Configuration
public class ClientRequestContextWebMvcConfig implements WebMvcConfigurer {
  private final ClientRequestContextArgumentResolver clientRequestContextArgumentResolver;

  public ClientRequestContextWebMvcConfig(ClientRequestContextArgumentResolver clientRequestContextArgumentResolver) {
    this.clientRequestContextArgumentResolver = clientRequestContextArgumentResolver;
  }

  @Override
  public void addArgumentResolvers(List<HandlerMethodArgumentResolver> resolvers) {
    resolvers.add(clientRequestContextArgumentResolver);
  }
}
