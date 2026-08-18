package com.unknown.platform.common.security;

import com.unknown.platform.modules.auth.model.ClientRole;
import org.springframework.core.MethodParameter;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

/**
 * 解析 Controller 方法上声明的 {@link ClientRequestContext} 参数：从请求头取出 Authorization 和
 * {@link ClientSessionService#CLIENT_USER_ROLE_HEADER}，统一调用
 * {@link ClientSessionService#resolveClientRole} 解析出角色后一次性注入，方法体内不再需要
 * 重复的 {@code @RequestHeader} 声明和手动解析调用。
 */
@Component
public class ClientRequestContextArgumentResolver implements HandlerMethodArgumentResolver {
  private final ClientSessionService clientSessionService;

  public ClientRequestContextArgumentResolver(ClientSessionService clientSessionService) {
    this.clientSessionService = clientSessionService;
  }

  @Override
  public boolean supportsParameter(MethodParameter parameter) {
    return parameter.getParameterType() == ClientRequestContext.class;
  }

  @Override
  public Object resolveArgument(
      MethodParameter parameter,
      ModelAndViewContainer mavContainer,
      NativeWebRequest webRequest,
      WebDataBinderFactory binderFactory
  ) {
    String authorization = webRequest.getHeader("Authorization");
    String clientRoleHeader = webRequest.getHeader(ClientSessionService.CLIENT_USER_ROLE_HEADER);
    ClientRole role = clientSessionService.resolveClientRole(authorization, clientRoleHeader);
    return new ClientRequestContext(role, authorization);
  }
}
