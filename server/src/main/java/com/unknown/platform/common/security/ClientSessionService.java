package com.unknown.platform.common.security;

import com.unknown.platform.common.exception.BusinessException;
import com.unknown.platform.modules.auth.model.ClientRole;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/**
 * 客户端登录态解析服务，用于根据 Authorization 头定位当前登录用户。
 */
@Service
public class ClientSessionService {
  /** 前端统一写入的当前登录用户角色请求头。 */
  public static final String CLIENT_USER_ROLE_HEADER = "X-Client-User-Role";

  private final JdbcTemplate jdbcTemplate;

  public ClientSessionService(JdbcTemplate jdbcTemplate) {
    this.jdbcTemplate = jdbcTemplate;
  }

  /**
   * 登录态必填的场景使用，未登录或过期时直接抛出业务异常。
   *
   * @param authorization HTTP Authorization 头
   * @return 当前登录用户 ID
   */
  public long requireUserId(String authorization) {
    Long userId = userIdOrNull(authorization);
    if (userId == null) {
      throw new BusinessException("AUTH_SESSION_REQUIRED", "请先登录后再继续操作");
    }
    return userId;
  }

  /**
   * 登录态可选的场景使用；未传 token 返回 null，传入过期 token 时抛出业务异常。
   *
   * @param authorization HTTP Authorization 头
   * @return 当前登录用户 ID，未登录时为 null
   */
  public Long userIdOrNull(String authorization) {
    String token = bearerToken(authorization);
    if (!StringUtils.hasText(token)) {
      return null;
    }

    try {
      return jdbcTemplate.queryForObject(
          """
              SELECT user_id
              FROM auth_session
              WHERE access_token = ?
                AND expires_at > NOW()
              ORDER BY id DESC
              LIMIT 1
              """,
          Long.class,
          token
      );
    } catch (EmptyResultDataAccessException exception) {
      throw new BusinessException("AUTH_SESSION_EXPIRED", "登录状态已过期，请重新登录");
    }
  }

  /**
   * 解析当前请求角色；已登录时以 token 对应用户角色为准，并校验前端上下文头未串号。
   *
   * @param authorization HTTP Authorization 头
   * @param clientRoleHeader 前端请求拦截器写入的角色头
   * @return 当前请求角色
   */
  public ClientRole resolveClientRole(String authorization, String clientRoleHeader) {
    ClientRole headerRole = parseClientRoleOrDefault(clientRoleHeader);
    Long userId = userIdOrNull(authorization);
    if (userId == null) {
      return headerRole;
    }

    ClientRole sessionRole = userRole(userId);
    if (StringUtils.hasText(clientRoleHeader) && sessionRole != headerRole) {
      throw new BusinessException("CLIENT_ROLE_MISMATCH", "登录用户角色与请求上下文不一致，请重新登录");
    }
    return sessionRole;
  }

  private String bearerToken(String authorization) {
    if (!StringUtils.hasText(authorization)) {
      return "";
    }
    if (authorization.startsWith("Bearer ")) {
      return authorization.substring("Bearer ".length()).trim();
    }
    return authorization.trim();
  }

  private ClientRole parseClientRoleOrDefault(String clientRoleHeader) {
    if (!StringUtils.hasText(clientRoleHeader)) {
      return ClientRole.student;
    }

    try {
      return ClientRole.valueOf(clientRoleHeader.trim());
    } catch (IllegalArgumentException exception) {
      throw new BusinessException("INVALID_CLIENT_ROLE", "客户端角色无效，请重新登录");
    }
  }

  private ClientRole userRole(long userId) {
    try {
      String role = jdbcTemplate.queryForObject(
          "SELECT role FROM app_user WHERE id = ? LIMIT 1",
          String.class,
          userId
      );
      return ClientRole.valueOf(role);
    } catch (EmptyResultDataAccessException exception) {
      throw new BusinessException("AUTH_USER_NOT_FOUND", "登录用户不存在，请重新登录");
    } catch (IllegalArgumentException exception) {
      throw new BusinessException("INVALID_CLIENT_ROLE", "用户角色数据异常，请联系平台处理");
    }
  }
}
