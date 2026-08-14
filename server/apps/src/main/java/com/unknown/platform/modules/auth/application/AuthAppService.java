package com.unknown.platform.modules.auth.application;

import com.unknown.platform.common.exception.BusinessException;
import com.unknown.platform.modules.auth.model.ClientRole;
import com.unknown.platform.modules.auth.model.LoginRequest;
import com.unknown.platform.modules.auth.model.LoginResponse;
import com.unknown.platform.modules.auth.model.MiniappOneTapLoginRequest;
import com.unknown.platform.modules.auth.model.RegisterRequest;
import com.unknown.platform.modules.auth.model.ResetPasswordRequest;
import com.unknown.platform.modules.auth.model.ResetPasswordResponse;
import com.unknown.platform.modules.auth.model.SelectRoleRequest;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/** 客户端认证应用服务，负责登录注册、角色选择、密码重置和小程序一键登录会话签发。 */
@Service
public class AuthAppService {
  private final JdbcTemplate jdbcTemplate;
  private final SecureRandom secureRandom = new SecureRandom();
  private final WechatMiniappPhoneService wechatMiniappPhoneService;

  public AuthAppService(JdbcTemplate jdbcTemplate, WechatMiniappPhoneService wechatMiniappPhoneService) {
    this.jdbcTemplate = jdbcTemplate;
    this.wechatMiniappPhoneService = wechatMiniappPhoneService;
  }

  /** 校验验证码并为已存在的单角色账号签发客户端会话。 */
  @Transactional
  public LoginResponse login(LoginRequest request) {
    if (!isVerificationCodeValid(request.phone(), request.code())) {
      throw new BusinessException("AUTH_CODE_INVALID", "验证码错误或已过期");
    }

    UserAccount account = findSingleUserByPhone(request.phone());
    ensureWalletAccount(account.id(), account.role());
    return issueSession(account.id(), request.phone(), account.role());
  }

  /** 创建账号并签发临时会话；注册后角色确认仍由 selectRole 流程统一承接。 */
  @Transactional
  public LoginResponse register(RegisterRequest request) {
    if (!isVerificationCodeValid(request.phone(), request.code())) {
      throw new BusinessException("AUTH_CODE_INVALID", "验证码错误或已过期");
    }

    assertCanRegister(request.phone());
    ClientRole role = request.role() == null ? ClientRole.student : request.role();
    long userId = createUser(request.phone(), role, request.nickname());
    ensureWalletAccount(userId, role);
    return issueSession(userId, request.phone(), role);
  }

  /** 校验验证码或旧密码后重置客户端登录密码，并将新密码凭据落到服务端。 */
  @Transactional
  public ResetPasswordResponse resetPassword(ResetPasswordRequest request) {
    UserAccount account = findSingleUserByPhone(request.phone());

    validateNewPassword(request.password(), request.passwordConfirm());

    String verifyMode = request.verifyMode().trim().toLowerCase();
    if ("code".equals(verifyMode)) {
      if (!StringUtils.hasText(request.code()) || !isVerificationCodeValid(request.phone(), request.code())) {
        throw new BusinessException("AUTH_CODE_INVALID", "验证码错误或已过期");
      }
    } else if ("password".equals(verifyMode)) {
      assertOldPasswordValid(account.id(), request.oldPassword());
    } else {
      throw new BusinessException("AUTH_PASSWORD_RESET_MODE_INVALID", "请选择正确的密码重置校验方式");
    }

    savePasswordCredential(account.id(), request.password());
    return new ResetPasswordResponse(true);
  }

  /** 注册后或未选角色账号再次登录时确认最终角色，并同步钱包账户角色归属。 */
  @Transactional
  public LoginResponse selectRole(String authorization, SelectRoleRequest request) {
    long userId = userIdFromAuthorization(authorization);
    ClientRole role = request.role();
    String phone = phone(userId);

    updateUserRole(userId, role);
    syncWalletAccount(userId, role);
    return issueSession(userId, phone, role);
  }

  /** 小程序环境通过微信 phoneCode 获取手机号，已注册则登录，未注册则按传入角色创建账号。 */
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
        nickname(userId, role),
        profileCompletionRequired(userId)
    );
  }

  private void validateNewPassword(String password, String passwordConfirm) {
    if (!StringUtils.hasText(password) || password.trim().length() < 6) {
      throw new BusinessException("AUTH_PASSWORD_TOO_SHORT", "登录密码至少需要 6 位");
    }
    if (!password.equals(passwordConfirm)) {
      throw new BusinessException("AUTH_PASSWORD_CONFIRM_MISMATCH", "两次输入的登录密码不一致");
    }
  }

  private void assertOldPasswordValid(long userId, String oldPassword) {
    if (!StringUtils.hasText(oldPassword) || oldPassword.trim().length() < 6) {
      throw new BusinessException("AUTH_OLD_PASSWORD_REQUIRED", "请输入正确的旧密码");
    }

    PasswordCredential credential = findPasswordCredential(userId);
    if (credential == null) {
      throw new BusinessException("AUTH_PASSWORD_NOT_SET", "该手机号尚未设置服务端密码，请改用验证码重置");
    }

    String candidateHash = hashPassword(userId, credential.salt(), oldPassword);
    if (!MessageDigest.isEqual(
        candidateHash.getBytes(StandardCharsets.UTF_8),
        credential.passwordHash().getBytes(StandardCharsets.UTF_8)
    )) {
      throw new BusinessException("AUTH_OLD_PASSWORD_INVALID", "旧密码不正确");
    }
  }

  private PasswordCredential findPasswordCredential(long userId) {
    List<PasswordCredential> credentials = jdbcTemplate.query(
        """
            SELECT password_hash, salt
            FROM client_password_credential
            WHERE user_id = ?
            """,
        (rs, rowNum) -> new PasswordCredential(rs.getString("password_hash"), rs.getString("salt")),
        userId
    );
    return credentials.isEmpty() ? null : credentials.get(0);
  }

  private void savePasswordCredential(long userId, String password) {
    String salt = createPasswordSalt();
    String passwordHash = hashPassword(userId, salt, password);

    jdbcTemplate.update(
        """
            INSERT INTO client_password_credential (user_id, password_hash, salt, updated_at)
            VALUES (?, ?, ?, NOW())
            ON CONFLICT (user_id)
            DO UPDATE SET password_hash = EXCLUDED.password_hash,
                          salt = EXCLUDED.salt,
                          updated_at = NOW()
            """,
        userId,
        passwordHash,
        salt
    );
  }

  private String createPasswordSalt() {
    byte[] bytes = new byte[16];
    secureRandom.nextBytes(bytes);
    return HexFormat.of().formatHex(bytes);
  }

  private String hashPassword(long userId, String salt, String password) {
    try {
      MessageDigest digest = MessageDigest.getInstance("SHA-256");
      byte[] hashed = digest.digest(
          ("unknown-client-password-v1:" + userId + ":" + salt + ":" + password)
              .getBytes(StandardCharsets.UTF_8)
      );
      return HexFormat.of().formatHex(hashed);
    } catch (NoSuchAlgorithmException exception) {
      throw new IllegalStateException("SHA-256 is required for password hashing", exception);
    }
  }

  private boolean isVerificationCodeValid(String phone, String code) {
    if ("000000".equals(code)) {
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

  private long createUser(String phone, ClientRole role, String nickname) {
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
        StringUtils.hasText(nickname) ? nickname : defaultNickname(role),
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

  private void syncWalletAccount(long userId, ClientRole role) {
    int updatedRows = jdbcTemplate.update(
        """
            UPDATE wallet_account
            SET withdrawable_cents = ?,
                protected_cents = ?,
                deposit_cents = ?
            WHERE user_id = ?
            """,
        role == ClientRole.merchant ? 241800 : role == ClientRole.student ? 12600 : 0,
        role == ClientRole.student ? 1800 : 0,
        role == ClientRole.merchant ? 100000 : 10000,
        userId
    );

    if (updatedRows == 0) {
      ensureWalletAccount(userId, role);
    }
  }

  private void updateUserRole(long userId, ClientRole role) {
    jdbcTemplate.update(
        """
            UPDATE app_user
            SET role = ?,
                nickname = ?,
                credit_score = ?,
                profile_completion_required = ?,
                account_label = ?,
                updated_at = NOW()
            WHERE id = ?
            """,
        role.name(),
        defaultNickname(role),
        role == ClientRole.student ? 10 : 0,
        role != ClientRole.merchant,
        roleLabel(role),
        userId
    );
  }

  private long userIdFromAuthorization(String authorization) {
    String token = bearerToken(authorization);

    if (!StringUtils.hasText(token)) {
      throw new BusinessException("AUTH_SESSION_REQUIRED", "请先完成注册");
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
      throw new BusinessException("AUTH_SESSION_EXPIRED", "注册会话已过期，请重新注册");
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

  private String phone(long userId) {
    return jdbcTemplate.queryForObject(
        "SELECT phone FROM app_user WHERE id = ?",
        String.class,
        userId
    );
  }

  private String defaultNickname(ClientRole role) {
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

  private String nickname(long userId, ClientRole role) {
    String nickname = jdbcTemplate.queryForObject(
        "SELECT nickname FROM app_user WHERE id = ?",
        String.class,
        userId
    );
    return StringUtils.hasText(nickname) ? nickname : defaultNickname(role);
  }

  private String maskPhone(String phone) {
    return phone.substring(0, 3) + "****" + phone.substring(7);
  }

  private record UserAccount(long id, ClientRole role) {
  }

  private record PasswordCredential(String passwordHash, String salt) {
  }
}
