package com.unknown.platform.modules.clienthome.application;

import com.unknown.platform.common.exception.BusinessException;
import com.unknown.platform.common.security.ClientSessionService;
import com.unknown.platform.modules.auth.model.ClientRole;
import com.unknown.platform.modules.clienthome.model.ClientHomeResponse;
import com.unknown.platform.modules.clienthome.model.ModuleCard;
import com.unknown.platform.modules.clienthome.model.RoleProfile;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/** 客户端首页聚合服务，按角色组装头像账户卡、主模块入口和需要提示的风险/补充信息。 */
@Service
public class ClientHomeAppService {
  private final JdbcTemplate jdbcTemplate;
  private final ClientSessionService clientSessionService;

  public ClientHomeAppService(JdbcTemplate jdbcTemplate, ClientSessionService clientSessionService) {
    this.jdbcTemplate = jdbcTemplate;
    this.clientSessionService = clientSessionService;
  }

  /** 获取当前角色首页数据；已登录时优先读取当前账号，未登录仅用于本地兜底预览。 */
  public ClientHomeResponse getHome(ClientRole role, String authorization) {
    RoleProfile profile = profile(role, authorization);
    List<ModuleCard> modules = modules(role);
    List<String> alerts = alerts(role);
    return new ClientHomeResponse(profile, modules, alerts);
  }

  private RoleProfile profile(ClientRole role, String authorization) {
    Long currentUserId = clientSessionService.userIdOrNull(authorization);
    List<RoleProfile> profiles = currentUserId == null ? latestRoleProfiles(role) : currentUserProfiles(role, currentUserId);
    if (profiles.isEmpty()) {
      throw new BusinessException("ROLE_PROFILE_NOT_FOUND", "角色账户数据不存在，请先登录创建真实账号");
    }
    return profiles.get(0);
  }

  private List<RoleProfile> latestRoleProfiles(ClientRole role) {
    return jdbcTemplate.query(
        profileSql("u.role = ?", "ORDER BY u.updated_at DESC, u.id DESC"),
        (rs, rowNum) -> mapRoleProfile(role, rs.getString("nickname"), rs.getString("account_label"),
            rs.getInt("credit_score"), rs.getLong("withdrawable_cents"), rs.getString("status"),
            rs.getString("tutor_certification_status"), rs.getString("hunting_certification_status")),
        role.name()
    );
  }

  private List<RoleProfile> currentUserProfiles(ClientRole role, long userId) {
    return jdbcTemplate.query(
        profileSql("u.id = ? AND u.role = ?", ""),
        (rs, rowNum) -> mapRoleProfile(role, rs.getString("nickname"), rs.getString("account_label"),
            rs.getInt("credit_score"), rs.getLong("withdrawable_cents"), rs.getString("status"),
            rs.getString("tutor_certification_status"), rs.getString("hunting_certification_status")),
        userId,
        role.name()
    );
  }

  private String profileSql(String whereClause, String orderClause) {
    return """
            SELECT u.nickname, u.account_label, u.credit_score, u.status,
                   COALESCE(u.tutor_certification_status, 'pending') AS tutor_certification_status,
                   COALESCE(u.hunting_certification_status, 'pending') AS hunting_certification_status,
                   COALESCE(w.withdrawable_cents, 0) AS withdrawable_cents
            FROM app_user u
            LEFT JOIN wallet_account w ON w.user_id = u.id
            WHERE %s
            %s
            LIMIT 1
            """.formatted(whereClause, orderClause);
  }

  private RoleProfile mapRoleProfile(
      ClientRole role,
      String nickname,
      String accountLabel,
      int creditScore,
      long withdrawableCents,
      String status,
      String tutorCertificationStatus,
      String huntingCertificationStatus
  ) {
    return new RoleProfile(
        role,
        nickname,
        accountLabel,
        creditScore,
        balanceText(role, withdrawableCents),
        accountStatus(status),
        certificationStatus(tutorCertificationStatus),
        certificationStatus(huntingCertificationStatus)
    );
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

  private String certificationStatus(String status) {
    return switch (status == null ? "pending" : status) {
      case "reviewing" -> "reviewing";
      case "normal" -> "normal";
      case "frozen" -> "frozen";
      default -> "pending";
    };
  }
}
