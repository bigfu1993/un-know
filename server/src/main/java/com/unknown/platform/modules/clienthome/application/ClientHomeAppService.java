package com.unknown.platform.modules.clienthome.application;

import com.unknown.platform.common.exception.BusinessException;
import com.unknown.platform.modules.auth.model.ClientRole;
import com.unknown.platform.modules.clienthome.model.ClientHomeResponse;
import com.unknown.platform.modules.clienthome.model.ModuleCard;
import com.unknown.platform.modules.clienthome.model.RoleProfile;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class ClientHomeAppService {
  private final JdbcTemplate jdbcTemplate;

  public ClientHomeAppService(JdbcTemplate jdbcTemplate) {
    this.jdbcTemplate = jdbcTemplate;
  }

  public ClientHomeResponse getHome(ClientRole role) {
    RoleProfile profile = profile(role);
    List<ModuleCard> modules = modules(role);
    List<String> alerts = alerts(role);
    return new ClientHomeResponse(profile, modules, alerts);
  }

  private RoleProfile profile(ClientRole role) {
    List<RoleProfile> profiles = jdbcTemplate.query(
        """
            SELECT u.nickname, u.account_label, u.credit_score, u.status,
                   COALESCE(u.tutor_certification_status, 'pending') AS tutor_certification_status,
                   COALESCE(w.withdrawable_cents, 0) AS withdrawable_cents
            FROM app_user u
            LEFT JOIN wallet_account w ON w.user_id = u.id
            WHERE u.role = ?
            ORDER BY u.updated_at DESC, u.id DESC
            LIMIT 1
            """,
        (rs, rowNum) -> new RoleProfile(
            role,
            rs.getString("nickname"),
            rs.getString("account_label"),
            rs.getInt("credit_score"),
            balanceText(role, rs.getLong("withdrawable_cents")),
            accountStatus(rs.getString("status")),
            tutorCertificationStatus(rs.getString("tutor_certification_status"))
        ),
        role.name()
    );
    if (profiles.isEmpty()) {
      throw new BusinessException("ROLE_PROFILE_NOT_FOUND", "角色账户数据不存在，请先登录创建真实账号");
    }
    return profiles.get(0);
  }

  private List<ModuleCard> modules(ClientRole role) {
    return jdbcTemplate.query(
        """
            SELECT module_key, title, description, action, priority
            FROM client_home_module
            WHERE role = ?
              AND enabled = TRUE
            ORDER BY sort_order, id
            """,
        (rs, rowNum) -> new ModuleCard(
            rs.getString("module_key"),
            rs.getString("title"),
            rs.getString("description"),
            rs.getString("action"),
            rs.getString("priority")
        ),
        role.name()
    );
  }

  private List<String> alerts(ClientRole role) {
    return jdbcTemplate.query(
        """
            SELECT content
            FROM client_home_alert
            WHERE role = ?
              AND enabled = TRUE
            ORDER BY sort_order, id
            """,
        (rs, rowNum) -> rs.getString("content"),
        role.name()
    );
  }

  private String balanceText(ClientRole role, long cents) {
    String prefix = role == ClientRole.merchant ? "商户余额 " : "钱包 ";
    return prefix + "¥" + BigDecimal.valueOf(cents, 2);
  }

  private String accountStatus(String status) {
    return switch (status == null ? "ACTIVE" : status) {
      case "FROZEN" -> "frozen";
      case "SUPERVISED" -> "supervised";
      case "MUTED" -> "muted";
      case "BANNED" -> "banned";
      default -> "normal";
    };
  }

  private String tutorCertificationStatus(String status) {
    return switch (status == null ? "pending" : status) {
      case "reviewing" -> "reviewing";
      case "normal" -> "normal";
      case "frozen" -> "frozen";
      default -> "pending";
    };
  }
}
