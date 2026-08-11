package com.unknown.platform.modules.clientworkspace.application;

import com.unknown.platform.common.api.UserNickname;
import com.unknown.platform.common.exception.BusinessException;
import com.unknown.platform.modules.auth.model.ClientRole;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Arrays;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * 客户端工作台跨领域共享的基础能力：用户身份/角色解析、金额换算、文本清理和展示格式化。
 *
 * <p>由 {@link ClientWorkspaceAppService}、{@link HuntingTaskAppService}、
 * {@link TutorWorkspaceAppService} 共同依赖，避免同类逻辑在各领域服务中重复实现。</p>
 */
@Component
public class ClientWorkspaceSupport {
  private final JdbcTemplate jdbcTemplate;

  public ClientWorkspaceSupport(JdbcTemplate jdbcTemplate) {
    this.jdbcTemplate = jdbcTemplate;
  }

  public void ensureUserRole(long userId, ClientRole expectedRole, String errorCode, String errorMessage) {
    if (userRole(userId) != expectedRole) {
      throw new BusinessException(errorCode, errorMessage);
    }
  }


  public ClientRole userRole(long userId) {
    String role = jdbcTemplate.queryForObject("SELECT role FROM app_user WHERE id = ?", String.class, userId);
    return ClientRole.valueOf(role);
  }


  public String joinTags(List<String> tags) {
    if (tags == null || tags.isEmpty()) {
      return "";
    }
    return String.join("、", tags.stream().map(String::strip).filter((tag) -> !tag.isBlank()).toList());
  }


  public long roleUserId(ClientRole role) {
    List<Long> ids = jdbcTemplate.query(
        "SELECT id FROM app_user WHERE role = ? ORDER BY updated_at DESC, id DESC LIMIT 1",
        (rs, rowNum) -> rs.getLong("id"),
        role.name()
    );
    if (ids.isEmpty()) {
      throw new BusinessException("ROLE_USER_NOT_FOUND", "角色账户不存在，请先登录");
    }
    return ids.get(0);
  }


  public long publisherUserIdOrFallback(Long publisherUserId) {
    return publisherUserId == null ? roleUserId(ClientRole.student) : publisherUserId;
  }


  public UserNickname userNickname(long userId) {
    UserContact contact = userContact(userId);
    return new UserNickname(contact.nickname(), maskPhone(contact.phone()));
  }


  public UserContact userContact(long userId) {
    List<UserContact> rows = jdbcTemplate.query(
        """
            SELECT COALESCE(NULLIF(nickname, ''), '未设置昵称') AS nickname,
                   COALESCE(phone, '') AS phone
            FROM app_user
            WHERE id = ?
            LIMIT 1
            """,
        (rs, rowNum) -> new UserContact(rs.getString("nickname"), rs.getString("phone")),
        userId
    );

    return rows.isEmpty() ? new UserContact("未设置昵称", "") : rows.get(0);
  }


  public String maskPhone(String phone) {
    String normalizedPhone = phone == null ? "" : phone.strip();
    if (normalizedPhone.isBlank()) {
      return "暂无手机号";
    }
    if (normalizedPhone.length() < 7) {
      return normalizedPhone;
    }

    return normalizedPhone.substring(0, 3) + "****" + normalizedPhone.substring(7);
  }


  public List<String> splitCsv(String raw) {
    if (raw == null || raw.isBlank()) {
      return List.of();
    }
    return Arrays.stream(raw.split(","))
        .map(String::trim)
        .filter(value -> !value.isEmpty())
        .toList();
  }


  public record UserContact(String nickname, String phone) {
  }


  public BigDecimal toAmount(long cents) {
    return BigDecimal.valueOf(cents, 2);
  }


  /** 将元转换为分，统一保留两位小数。 */
  public long toCents(BigDecimal amount) {
    return toPositiveCents(amount, "INVALID_HUNTING_TASK_AMOUNT", "发布金额必须大于 0");
  }


  /** 将正数金额转换为分，并使用调用方传入的错误码和文案区分业务场景。 */
  public long toPositiveCents(BigDecimal amount, String errorCode, String errorMessage) {
    if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
      throw new BusinessException(errorCode, errorMessage);
    }

    return amount.setScale(2, RoundingMode.HALF_UP).movePointRight(2).longValueExact();
  }


  /** 将家教结算金额转换为分，允许 0 元但不允许空值或负数。 */
  public long toTrialFeeCents(BigDecimal trialFee) {
    if (trialFee == null) {
      throw new BusinessException("TUTOR_TRIAL_FEE_REQUIRED", "请先确认结算金额");
    }
    if (trialFee.compareTo(BigDecimal.ZERO) < 0) {
      throw new BusinessException("TUTOR_TRIAL_FEE_INVALID", "结算金额不能小于 0");
    }

    return trialFee.setScale(2, RoundingMode.HALF_UP).movePointRight(2).longValueExact();
  }


  /** 清理用户输入文本，为空时返回空字符串。 */
  public String clean(String value) {
    return value == null ? "" : value.strip();
  }


  /** 清理用户输入文本，为空时使用默认展示值。 */
  public String defaultText(String value, String fallback) {
    if (value == null || value.isBlank()) {
      return fallback;
    }

    return value.strip();
  }


  /** 按表字段长度裁剪展示文本。 */
  public String truncate(String value, int maxLength) {
    if (value.length() <= maxLength) {
      return value;
    }

    return value.substring(0, maxLength);
  }}
