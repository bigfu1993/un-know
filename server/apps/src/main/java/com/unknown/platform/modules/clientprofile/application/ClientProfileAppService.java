package com.unknown.platform.modules.clientprofile.application;

import com.unknown.platform.common.api.UserNickname;
import com.unknown.platform.common.exception.BusinessException;
import com.unknown.platform.common.security.ClientSessionService;
import com.unknown.platform.modules.auth.model.ClientRole;
import com.unknown.platform.modules.clientprofile.model.ClientAddressRequest;
import com.unknown.platform.modules.clientprofile.model.ClientAddressResponse;
import com.unknown.platform.modules.clientprofile.model.SubmitHuntingCertificationRequest;
import com.unknown.platform.modules.clientprofile.model.SubmitHuntingCertificationResponse;
import com.unknown.platform.modules.clientprofile.model.SubmitTutorCertificationRequest;
import com.unknown.platform.modules.clientprofile.model.SubmitTutorCertificationResponse;
import com.unknown.platform.modules.clientprofile.model.TutorExposureResponse;
import com.unknown.platform.modules.clientprofile.model.UpdateNicknameRequest;
import com.unknown.platform.modules.clientprofile.model.UpdateTutorExposureRequest;
import com.unknown.platform.modules.clientworkspace.model.TutorSubjects;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 客户端资料服务，承接登录态下的认证资料与地址簿持久化。
 */
@Service
public class ClientProfileAppService {
  private final JdbcTemplate jdbcTemplate;
  private final ClientSessionService clientSessionService;

  public ClientProfileAppService(JdbcTemplate jdbcTemplate, ClientSessionService clientSessionService) {
    this.jdbcTemplate = jdbcTemplate;
    this.clientSessionService = clientSessionService;
  }

  /**
   * 修改当前登录账号昵称，所有用户名称展示均以 app_user.nickname 为唯一来源。
   *
   * @param authorization 客户端登录访问令牌
   * @param request 昵称请求
   * @return 更新后的用户昵称快照
   */
  @Transactional
  public UserNickname updateNickname(String authorization, UpdateNicknameRequest request) {
    long userId = clientSessionService.requireUserId(authorization);
    String nickname = clean(request.nickname());
    if (nickname.isBlank()) {
      throw new BusinessException("NICKNAME_REQUIRED", "昵称不能为空");
    }
    jdbcTemplate.update(
        """
            UPDATE app_user
            SET nickname = ?,
                updated_at = NOW()
            WHERE id = ?
            """,
        nickname,
        userId
    );
    return new UserNickname(nickname, maskPhone(userPhone(userId)));
  }

  /**
   * 查询当前登录账号的地址簿，默认地址始终排在第一位。
   *
   * @param authorization 客户端登录访问令牌
   * @return 当前账号的地址列表
   */
  public List<ClientAddressResponse> listAddresses(String authorization) {
    long userId = clientSessionService.requireUserId(authorization);
    return addresses(userId);
  }

  /**
   * 新增地址。首个地址自动成为当前使用地址，主动设为当前时会清理其他默认标记。
   *
   * @param authorization 客户端登录访问令牌
   * @param request 地址表单
   * @return 新增后的地址
   */
  @Transactional
  public ClientAddressResponse createAddress(String authorization, ClientAddressRequest request) {
    long userId = clientSessionService.requireUserId(authorization);
    boolean shouldUseAsCurrent = Boolean.TRUE.equals(request.isCurrent()) || addressCount(userId) == 0;
    String publicId = nextAddressPublicId();

    if (shouldUseAsCurrent) {
      clearCurrentAddress(userId);
    }

    jdbcTemplate.update(
        """
            INSERT INTO client_address (
              public_id, user_id, contact_name, campus_area, building_floor,
              delivery_address, contact_phone, is_default, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
            """,
        publicId,
        userId,
        clean(request.contactName()),
        clean(request.campusArea()),
        clean(request.buildingFloor()),
        clean(request.deliveryAddress()),
        clean(request.contactPhone()),
        shouldUseAsCurrent
    );
    syncProfileCompletionRequired(userId);
    return address(userId, publicId);
  }

  /**
   * 编辑已有地址。传入 isCurrent=true 时同步切换为当前使用地址，否则保留原默认状态。
   *
   * @param authorization 客户端登录访问令牌
   * @param addressId 地址对外 ID
   * @param request 地址表单
   * @return 编辑后的地址
   */
  @Transactional
  public ClientAddressResponse updateAddress(String authorization, String addressId, ClientAddressRequest request) {
    long userId = clientSessionService.requireUserId(authorization);
    requireAddress(userId, addressId);
    boolean shouldUseAsCurrent = Boolean.TRUE.equals(request.isCurrent());

    if (shouldUseAsCurrent) {
      clearCurrentAddress(userId);
    }

    jdbcTemplate.update(
        """
            UPDATE client_address
            SET contact_name = ?,
                campus_area = ?,
                building_floor = ?,
                delivery_address = ?,
                contact_phone = ?,
                is_default = CASE WHEN ? THEN TRUE ELSE is_default END,
                updated_at = NOW()
            WHERE user_id = ?
              AND public_id = ?
            """,
        clean(request.contactName()),
        clean(request.campusArea()),
        clean(request.buildingFloor()),
        clean(request.deliveryAddress()),
        clean(request.contactPhone()),
        shouldUseAsCurrent,
        userId,
        addressId
    );
    syncProfileCompletionRequired(userId);
    return address(userId, addressId);
  }

  /**
   * 将指定地址切换为当前使用地址，返回切换后的完整地址簿。
   *
   * @param authorization 客户端登录访问令牌
   * @param addressId 地址对外 ID
   * @return 当前账号的地址列表
   */
  @Transactional
  public List<ClientAddressResponse> useAddress(String authorization, String addressId) {
    long userId = clientSessionService.requireUserId(authorization);
    requireAddress(userId, addressId);
    clearCurrentAddress(userId);
    jdbcTemplate.update(
        """
            UPDATE client_address
            SET is_default = TRUE,
                updated_at = NOW()
            WHERE user_id = ?
              AND public_id = ?
            """,
        userId,
        addressId
    );
    syncProfileCompletionRequired(userId);
    return addresses(userId);
  }

  /**
   * 删除地址。删除当前地址后，会自动把最近维护过的地址设为当前地址。
   *
   * @param authorization 客户端登录访问令牌
   * @param addressId 地址对外 ID
   * @return 删除后的地址列表
   */
  @Transactional
  public List<ClientAddressResponse> deleteAddress(String authorization, String addressId) {
    long userId = clientSessionService.requireUserId(authorization);
    boolean wasCurrent = isCurrentAddress(userId, addressId);

    jdbcTemplate.update(
        "DELETE FROM client_address WHERE user_id = ? AND public_id = ?",
        userId,
        addressId
    );

    if (wasCurrent) {
      useLatestAddressAsCurrent(userId);
    }
    syncProfileCompletionRequired(userId);
    return addresses(userId);
  }

  /**
   * 提交学生狩猎认证资料，并将认证状态持久化为审核中。
   *
   * @param authorization 客户端登录访问令牌
   * @param request 狩猎认证表单资料
   * @return 可同步到客户端资料的认证状态
   */
  @Transactional
  public SubmitHuntingCertificationResponse submitHuntingCertification(
      String authorization,
      SubmitHuntingCertificationRequest request
  ) {
    long userId = clientSessionService.requireUserId(authorization);
    ClientRole role = userRole(userId);
    if (role != ClientRole.student) {
      throw new BusinessException("HUNTING_CERTIFICATION_STUDENT_ONLY", "仅学生账号可以提交狩猎认证");
    }

    jdbcTemplate.update(
        """
            UPDATE app_user
            SET hunting_certification_status = 'reviewing',
                updated_at = NOW()
            WHERE id = ?
            """,
        userId
    );
    return new SubmitHuntingCertificationResponse("reviewing");
  }

  /**
   * 提交家教认证资料，真实持久化到 {@code tutor_certification} 表（支持重复提交覆盖），
   * 供 {@code tutorExposedStudents} 查询家长端"认证学生"列表时联表读取真实字段。
   *
   * @param authorization 客户端登录访问令牌
   * @param request 家教认证表单资料
   * @return 可同步到客户端资料的认证状态
   */
  @Transactional
  public SubmitTutorCertificationResponse submitTutorCertification(
      String authorization,
      SubmitTutorCertificationRequest request
  ) {
    long userId = clientSessionService.requireUserId(authorization);
    ClientRole role = userRole(userId);
    if (role != ClientRole.student) {
      throw new BusinessException("TUTOR_CERTIFICATION_STUDENT_ONLY", "仅学生账号可以提交家教认证");
    }
    TutorSubjects.requireValidKeys(request.subject());

    jdbcTemplate.update(
        """
            INSERT INTO tutor_certification (
                user_id, real_name, gender, age, native_place, id_card, school, major, subject,
                xuexin_screenshot, gpa, certificate, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            ON CONFLICT (user_id) DO UPDATE SET
                real_name = EXCLUDED.real_name,
                gender = EXCLUDED.gender,
                age = EXCLUDED.age,
                native_place = EXCLUDED.native_place,
                id_card = EXCLUDED.id_card,
                school = EXCLUDED.school,
                major = EXCLUDED.major,
                subject = EXCLUDED.subject,
                xuexin_screenshot = EXCLUDED.xuexin_screenshot,
                gpa = EXCLUDED.gpa,
                certificate = EXCLUDED.certificate,
                updated_at = NOW()
            """,
        userId, request.realName(), request.gender(), request.age(), request.nativePlace(), request.idCard(),
        request.school(), request.major(), request.subject(), request.xuexinScreenshot(), request.gpa(),
        request.certificate()
    );
    jdbcTemplate.update(
        """
            UPDATE app_user
            SET tutor_certification_status = 'reviewing',
                updated_at = NOW()
            WHERE id = ?
            """,
        userId
    );
    return new SubmitTutorCertificationResponse("reviewing");
  }

  /**
   * 切换学生家教资料公开状态，未通过家教认证时不允许开启。
   *
   * @param authorization 客户端登录访问令牌
   * @param request 开关请求
   * @return 最新开关状态
   */
  @Transactional
  public TutorExposureResponse updateTutorExposure(String authorization, UpdateTutorExposureRequest request) {
    long userId = clientSessionService.requireUserId(authorization);
    ClientRole role = userRole(userId);
    if (role != ClientRole.student) {
      throw new BusinessException("TUTOR_EXPOSURE_STUDENT_ONLY", "仅学生账号可以开启家教资料公开");
    }
    if (request.enabled() && !hasNormalTutorCertification(userId)) {
      throw new BusinessException("TUTOR_EXPOSURE_CERTIFICATION_REQUIRED", "家教认证通过后才能开启公开");
    }

    jdbcTemplate.update(
        """
            UPDATE app_user
            SET tutor_exposure_enabled = ?,
                updated_at = NOW()
            WHERE id = ?
            """,
        request.enabled(),
        userId
    );
    return new TutorExposureResponse(request.enabled());
  }

  private boolean hasNormalTutorCertification(long userId) {
    List<Boolean> rows = jdbcTemplate.query(
        "SELECT tutor_certification_status = 'normal' FROM app_user WHERE id = ?",
        (rs, rowNum) -> rs.getBoolean(1),
        userId
    );
    return !rows.isEmpty() && rows.get(0);
  }

  private String userPhone(long userId) {
    List<String> rows = jdbcTemplate.query(
        "SELECT COALESCE(phone, '') FROM app_user WHERE id = ? LIMIT 1",
        (rs, rowNum) -> rs.getString(1),
        userId
    );
    return rows.isEmpty() ? "" : rows.get(0);
  }

  private List<ClientAddressResponse> addresses(long userId) {
    return jdbcTemplate.query(
        """
            SELECT public_id, contact_name, campus_area, building_floor,
                   delivery_address, contact_phone, is_default, created_at, updated_at
            FROM client_address
            WHERE user_id = ?
            ORDER BY is_default DESC, updated_at DESC, id DESC
            """,
        this::mapAddress,
        userId
    );
  }

  private ClientAddressResponse address(long userId, String publicId) {
    List<ClientAddressResponse> rows = jdbcTemplate.query(
        """
            SELECT public_id, contact_name, campus_area, building_floor,
                   delivery_address, contact_phone, is_default, created_at, updated_at
            FROM client_address
            WHERE user_id = ?
              AND public_id = ?
            LIMIT 1
            """,
        this::mapAddress,
        userId,
        publicId
    );
    if (rows.isEmpty()) {
      throw new BusinessException("CLIENT_ADDRESS_NOT_FOUND", "地址不存在或无权操作");
    }
    return rows.get(0);
  }

  private ClientAddressResponse mapAddress(ResultSet rs, int rowNum) throws SQLException {
    return new ClientAddressResponse(
        rs.getString("public_id"),
        rs.getString("contact_name"),
        rs.getString("campus_area"),
        rs.getString("building_floor"),
        rs.getString("delivery_address"),
        rs.getString("contact_phone"),
        rs.getBoolean("is_default"),
        dateTime(rs, "created_at"),
        dateTime(rs, "updated_at")
    );
  }

  private void requireAddress(long userId, String publicId) {
    Integer count = jdbcTemplate.queryForObject(
        "SELECT COUNT(*) FROM client_address WHERE user_id = ? AND public_id = ?",
        Integer.class,
        userId,
        publicId
    );
    if (count == null || count == 0) {
      throw new BusinessException("CLIENT_ADDRESS_NOT_FOUND", "地址不存在或无权操作");
    }
  }

  private boolean isCurrentAddress(long userId, String publicId) {
    List<Boolean> rows = jdbcTemplate.query(
        "SELECT is_default FROM client_address WHERE user_id = ? AND public_id = ? LIMIT 1",
        (rs, rowNum) -> rs.getBoolean("is_default"),
        userId,
        publicId
    );
    if (rows.isEmpty()) {
      throw new BusinessException("CLIENT_ADDRESS_NOT_FOUND", "地址不存在或无权操作");
    }
    return rows.get(0);
  }

  private int addressCount(long userId) {
    Integer count = jdbcTemplate.queryForObject(
        "SELECT COUNT(*) FROM client_address WHERE user_id = ?",
        Integer.class,
        userId
    );
    return count == null ? 0 : count;
  }

  private void clearCurrentAddress(long userId) {
    jdbcTemplate.update(
        """
            UPDATE client_address
            SET is_default = FALSE,
                updated_at = NOW()
            WHERE user_id = ?
            """,
        userId
    );
  }

  private void useLatestAddressAsCurrent(long userId) {
    jdbcTemplate.update(
        """
            UPDATE client_address
            SET is_default = TRUE,
                updated_at = NOW()
            WHERE id = (
              SELECT id
              FROM client_address
              WHERE user_id = ?
              ORDER BY updated_at DESC, id DESC
              LIMIT 1
            )
            """,
        userId
    );
  }

  private void syncProfileCompletionRequired(long userId) {
    jdbcTemplate.update(
        """
            UPDATE app_user
            SET profile_completion_required = NOT EXISTS (
                  SELECT 1 FROM client_address WHERE user_id = ?
                ),
                updated_at = NOW()
            WHERE id = ?
            """,
        userId,
        userId
    );
  }

  private ClientRole userRole(long userId) {
    String role = jdbcTemplate.queryForObject(
        "SELECT role FROM app_user WHERE id = ?",
        String.class,
        userId
    );
    return ClientRole.valueOf(role);
  }

  private String nextAddressPublicId() {
    return "A" + UUID.randomUUID().toString().replace("-", "").substring(0, 18).toUpperCase();
  }

  private String clean(String value) {
    return value == null ? "" : value.strip();
  }

  /** 将手机号脱敏后返回给前端展示。 */
  private String maskPhone(String phone) {
    String normalizedPhone = clean(phone);
    if (normalizedPhone.isBlank()) {
      return "暂无手机号";
    }
    if (normalizedPhone.length() < 7) {
      return normalizedPhone;
    }

    return normalizedPhone.substring(0, 3) + "****" + normalizedPhone.substring(7);
  }

  private String dateTime(ResultSet rs, String column) throws SQLException {
    OffsetDateTime value = rs.getObject(column, OffsetDateTime.class);
    return value == null ? "" : value.toString();
  }
}
