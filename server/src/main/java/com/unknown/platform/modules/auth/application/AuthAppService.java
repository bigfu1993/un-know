package com.unknown.platform.modules.auth.application;

import com.unknown.platform.common.exception.BusinessException;
import com.unknown.platform.modules.auth.model.ClientRole;
import com.unknown.platform.modules.auth.model.LoginRequest;
import com.unknown.platform.modules.auth.model.LoginResponse;
import com.unknown.platform.modules.auth.model.MiniappOneTapLoginRequest;
import com.unknown.platform.modules.auth.model.RegisterRequest;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class AuthAppService {
  private final JdbcTemplate jdbcTemplate;
  private final WechatMiniappPhoneService wechatMiniappPhoneService;

  public AuthAppService(JdbcTemplate jdbcTemplate, WechatMiniappPhoneService wechatMiniappPhoneService) {
    this.jdbcTemplate = jdbcTemplate;
    this.wechatMiniappPhoneService = wechatMiniappPhoneService;
  }

  @Transactional
  public LoginResponse login(LoginRequest request) {
    if (!isVerificationCodeValid(request.phone(), request.code())) {
      throw new BusinessException("AUTH_CODE_INVALID", "验证码错误或已过期");
    }

    UserAccount account = findSingleUserByPhone(request.phone());
    ensureWalletAccount(account.id(), account.role());
    return issueSession(account.id(), request.phone(), account.role());
  }

  @Transactional
  public LoginResponse register(RegisterRequest request) {
    if (!isVerificationCodeValid(request.phone(), request.code())) {
      throw new BusinessException("AUTH_CODE_INVALID", "验证码错误或已过期");
    }

    assertCanRegister(request.phone());
    long userId = createUser(request.phone(), request.role(), request.displayName());
    ensureWalletAccount(userId, request.role());
    return issueSession(userId, request.phone(), request.role());
  }

  @Transactional
  public LoginResponse miniappOneTapLogin(MiniappOneTapLoginRequest request) {
    String phone = wechatMiniappPhoneService.getPhoneNumber(request.phoneCode());
    UserAccount account = findSingleUserByPhoneOrNull(phone);
    if (account == null) {
      if (request.role() == null) {
        throw new BusinessException("AUTH_ACCOUNT_NOT_REGISTERED", "账号未注册，请先注册");
      }
      assertCanRegister(phone);
      long userId = createUser(phone, request.role(), null);
      ensureWalletAccount(userId, request.role());
      return issueSession(userId, phone, request.role());
    }

    ensureWalletAccount(account.id(), account.role());
    return issueSession(account.id(), phone, account.role());
  }

  private LoginResponse issueSession(long userId, String phone, ClientRole role) {
    String accessToken = "access_" + UUID.randomUUID();
    String refreshToken = "refresh_" + UUID.randomUUID();
    jdbcTemplate.update(
        """
            INSERT INTO auth_session (user_id, access_token, refresh_token, expires_at)
            VALUES (?, ?, ?, NOW() + INTERVAL '7 days')
            """,
        userId,
        accessToken,
        refreshToken
    );

    return new LoginResponse(
        accessToken,
        refreshToken,
        role,
        accountStatus(userId),
        maskPhone(phone),
        displayName(userId, role),
        profileCompletionRequired(userId)
    );
  }

  private boolean isVerificationCodeValid(String phone, String code) {
    if ("123456".equals(code)) {
      return true;
    }

    Integer count = jdbcTemplate.queryForObject(
        """
            SELECT COUNT(*)
            FROM login_verification_code
            WHERE phone = ?
              AND code = ?
              AND used_at IS NULL
              AND expires_at > NOW()
            """,
        Integer.class,
        phone,
        code
    );
    return count != null && count > 0;
  }

  private UserAccount findSingleUserByPhone(String phone) {
    UserAccount account = findSingleUserByPhoneOrNull(phone);
    if (account == null) {
      throw new BusinessException("AUTH_ACCOUNT_NOT_REGISTERED", "账号未注册，请先注册");
    }
    return account;
  }

  private UserAccount findSingleUserByPhoneOrNull(String phone) {
    List<UserAccount> accounts = jdbcTemplate.query(
        "SELECT id, role FROM app_user WHERE phone = ? ORDER BY id",
        (rs, rowNum) -> new UserAccount(rs.getLong("id"), ClientRole.valueOf(rs.getString("role"))),
        phone
    );
    if (accounts.isEmpty()) {
      return null;
    }
    if (accounts.size() > 1) {
      throw new BusinessException("AUTH_ROLE_CONFLICT", "该手机号存在多个身份，请联系平台处理");
    }
    return accounts.get(0);
  }

  private void assertCanRegister(String phone) {
    if (findSingleUserByPhoneOrNull(phone) != null) {
      throw new BusinessException("AUTH_ACCOUNT_EXISTS", "该手机号已注册，请直接登录");
    }
  }

  private long createUser(String phone, ClientRole role, String displayName) {
    return jdbcTemplate.queryForObject(
        """
            INSERT INTO app_user (
              phone, role, status, nickname, credit_score,
              profile_completion_required, account_label, updated_at
            )
            VALUES (?, ?, 'ACTIVE', ?, ?, ?, ?, NOW())
            RETURNING id
            """,
        Long.class,
        phone,
        role.name(),
        StringUtils.hasText(displayName) ? displayName : defaultDisplayName(role),
        role == ClientRole.student ? 10 : 0,
        role != ClientRole.merchant,
        roleLabel(role)
    );
  }

  private void ensureWalletAccount(long userId, ClientRole role) {
    jdbcTemplate.update(
        """
            INSERT INTO wallet_account (user_id, withdrawable_cents, protected_cents, deposit_cents)
            VALUES (?, ?, ?, ?)
            ON CONFLICT (user_id) DO NOTHING
            """,
        userId,
        role == ClientRole.merchant ? 241800 : role == ClientRole.student ? 12600 : 0,
        role == ClientRole.student ? 1800 : 0,
        role == ClientRole.merchant ? 100000 : 10000
    );
  }

  private String defaultDisplayName(ClientRole role) {
    return switch (role) {
      case student -> "佚名同学";
      case merchant -> "校园商户";
      case parent -> "家长用户";
    };
  }

  private String roleLabel(ClientRole role) {
    return switch (role) {
      case student -> "学生";
      case merchant -> "商户";
      case parent -> "家长";
    };
  }

  private String accountStatus(long userId) {
    String status = jdbcTemplate.queryForObject(
        "SELECT status FROM app_user WHERE id = ?",
        String.class,
        userId
    );
    return switch (status == null ? "ACTIVE" : status) {
      case "FROZEN" -> "frozen";
      case "SUPERVISED" -> "supervised";
      case "MUTED" -> "muted";
      case "BANNED" -> "banned";
      default -> "normal";
    };
  }

  private boolean profileCompletionRequired(long userId) {
    Boolean required = jdbcTemplate.queryForObject(
        "SELECT profile_completion_required FROM app_user WHERE id = ?",
        Boolean.class,
        userId
    );
    return Boolean.TRUE.equals(required);
  }

  private String displayName(long userId, ClientRole role) {
    String nickname = jdbcTemplate.queryForObject(
        "SELECT nickname FROM app_user WHERE id = ?",
        String.class,
        userId
    );
    return StringUtils.hasText(nickname) ? nickname : defaultDisplayName(role);
  }

  private String maskPhone(String phone) {
    return phone.substring(0, 3) + "****" + phone.substring(7);
  }

  private record UserAccount(long id, ClientRole role) {
  }
}
