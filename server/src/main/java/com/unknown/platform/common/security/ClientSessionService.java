package com.unknown.platform.common.security;

import com.unknown.platform.common.exception.BusinessException;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/**
 * 客户端登录态解析服务，用于根据 Authorization 头定位当前登录用户。
 */
@Service
public class ClientSessionService {
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

  private String bearerToken(String authorization) {
    if (!StringUtils.hasText(authorization)) {
      return "";
    }
    if (authorization.startsWith("Bearer ")) {
      return authorization.substring("Bearer ".length()).trim();
    }
    return authorization.trim();
  }
}
