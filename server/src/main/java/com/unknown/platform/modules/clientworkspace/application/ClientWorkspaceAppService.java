package com.unknown.platform.modules.clientworkspace.application;

import com.unknown.platform.common.exception.BusinessException;
import com.unknown.platform.modules.auth.model.ClientRole;
import com.unknown.platform.modules.clientworkspace.model.ClientWorkspaceResponse;
import com.unknown.platform.modules.clientworkspace.model.ClientWorkspaceResponse.ClientOrder;
import com.unknown.platform.modules.clientworkspace.model.ClientWorkspaceResponse.HuntingSummary;
import com.unknown.platform.modules.clientworkspace.model.ClientWorkspaceResponse.HuntingTask;
import com.unknown.platform.modules.clientworkspace.model.ClientWorkspaceResponse.MerchantDashboard;
import com.unknown.platform.modules.clientworkspace.model.ClientWorkspaceResponse.MerchantProduct;
import com.unknown.platform.modules.clientworkspace.model.ClientWorkspaceResponse.PartTimeJob;
import com.unknown.platform.modules.clientworkspace.model.ClientWorkspaceResponse.TutorApplicant;
import com.unknown.platform.modules.clientworkspace.model.ClientWorkspaceResponse.TutorDemand;
import com.unknown.platform.modules.clientworkspace.model.ClientWorkspaceResponse.WalletRecord;
import com.unknown.platform.modules.clientworkspace.model.ClientWorkspaceResponse.WalletSummary;
import com.unknown.platform.modules.clientworkspace.model.PublishHuntingTaskRequest;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class ClientWorkspaceAppService {
  private static final DateTimeFormatter HUNTING_PUBLISH_TIME_FORMATTER = DateTimeFormatter.ofPattern("MM-dd HH:mm");

  private final JdbcTemplate jdbcTemplate;

  public ClientWorkspaceAppService(JdbcTemplate jdbcTemplate) {
    this.jdbcTemplate = jdbcTemplate;
  }

  public ClientWorkspaceResponse getWorkspace(ClientRole role) {
    return new ClientWorkspaceResponse(
        orders(role),
        partTimeJobs(),
        huntingSummary(),
        huntingTasks(),
        tutorDemands(),
        merchantDashboard(),
        merchantProducts(),
        walletSummary(role),
        walletRecords(role)
    );
  }

  /** 发布委托或回收任务，并返回委托列表可直接展示的任务数据。 */
  public HuntingTask publishHuntingTask(PublishHuntingTaskRequest request) {
    String mode = huntingTaskMode(request.type());
    String publicId = nextHuntingTaskPublicId();
    String title = request.title().strip();
    boolean amountNegotiable = Boolean.TRUE.equals(request.amountNegotiable());
    long feeCents = amountNegotiable ? 0 : toCents(request.amount());
    String description = defaultText(request.description(), "暂无描述");
    String latestTime = request.latestTime().strip();
    String location = defaultText(defaultText(request.destination(), request.location()), "目的地待补充");
    String requirement = getHuntingRequirement(request.requirementTags(), request.requirement());
    String status = amountNegotiable ? "待协商" : "已发布";

    jdbcTemplate.update(
        """
            INSERT INTO hunting_task (public_id, title, description, mode, fee_cents, latest_time, location, urgency, status, enabled)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)
            """,
        publicId,
        title,
        description,
        mode,
        feeCents,
        latestTime,
        location,
        truncate(requirement, 40),
        status
    );

    return new HuntingTask(
        publicId,
        title,
        description,
        mode,
        toAmount(feeCents),
        latestTime,
        location,
        truncate(requirement, 40),
        status,
        HUNTING_PUBLISH_TIME_FORMATTER.format(LocalDateTime.now()),
        location,
        requirement,
        normalizedRequirementTags(request.requirementTags()),
        amountNegotiable
    );
  }

  private List<ClientOrder> orders(ClientRole role) {
    String sql = role == ClientRole.merchant
        ? """
            SELECT po.order_no, p.title, po.status, po.total_amount_cents,
                   po.contact_phone, po.detail, po.risk
            FROM purchase_order po
            JOIN product p ON p.id = po.product_id
            ORDER BY po.created_at DESC
            LIMIT 20
            """
        : """
            SELECT po.order_no, p.title, po.status, po.total_amount_cents,
                   po.contact_phone, po.detail, po.risk
            FROM purchase_order po
            JOIN product p ON p.id = po.product_id
            JOIN app_user u ON u.id = po.buyer_user_id
            WHERE u.role = ?
            ORDER BY po.created_at DESC
            LIMIT 20
            """;

    if (role == ClientRole.merchant) {
      return jdbcTemplate.query(sql, (rs, rowNum) -> mapOrder(role, rs.getString("order_no"),
          rs.getString("title"), rs.getString("status"), rs.getLong("total_amount_cents"),
          rs.getString("contact_phone"), rs.getString("detail"), rs.getString("risk")));
    }

    return jdbcTemplate.query(sql, (rs, rowNum) -> mapOrder(role, rs.getString("order_no"),
        rs.getString("title"), rs.getString("status"), rs.getLong("total_amount_cents"),
        rs.getString("contact_phone"), rs.getString("detail"), rs.getString("risk")), role.name());
  }

  private ClientOrder mapOrder(
      ClientRole role,
      String orderNo,
      String title,
      String status,
      long amountCents,
      String contactPhone,
      String detail,
      String risk
  ) {
    return new ClientOrder(
        orderNo,
        role,
        title,
        status,
        toAmount(amountCents),
        contactPhone,
        detail == null ? "" : detail,
        risk
    );
  }

  private List<PartTimeJob> partTimeJobs() {
    return jdbcTemplate.query(
        """
            SELECT public_id, publisher, title, description, hourly_pay_cents,
                   period, location, status, requirement, form_fields,
                   funding_state, sign_rule
            FROM part_time_job
            WHERE enabled = TRUE
            ORDER BY created_at DESC, id DESC
            """,
        (rs, rowNum) -> new PartTimeJob(
            rs.getString("public_id"),
            rs.getString("publisher"),
            rs.getString("title"),
            rs.getString("description"),
            toAmount(rs.getLong("hourly_pay_cents")),
            rs.getString("period"),
            rs.getString("location"),
            rs.getString("status"),
            rs.getString("requirement"),
            splitCsv(rs.getString("form_fields")),
            rs.getString("funding_state"),
            rs.getString("sign_rule")
        )
    );
  }

  private HuntingSummary huntingSummary() {
    List<HuntingSummary> rows = jdbcTemplate.query(
        """
            SELECT student_certification, second_verification, deposit_text,
                   credit_text, online_status
            FROM hunting_profile
            WHERE role = 'student'
            LIMIT 1
            """,
        (rs, rowNum) -> new HuntingSummary(
            rs.getString("student_certification"),
            rs.getString("second_verification"),
            rs.getString("deposit_text"),
            rs.getString("credit_text"),
            rs.getString("online_status")
        )
    );
    if (rows.isEmpty()) {
      throw new BusinessException("HUNTING_PROFILE_NOT_FOUND", "狩猎认证数据不存在");
    }
    return rows.get(0);
  }

  private List<HuntingTask> huntingTasks() {
    return jdbcTemplate.query(
        """
            SELECT public_id, title, description, mode, fee_cents, latest_time, location, urgency, status,
                   TO_CHAR(created_at AT TIME ZONE 'Asia/Shanghai', 'MM-DD HH24:MI') AS publish_time
            FROM hunting_task
            WHERE enabled = TRUE
            ORDER BY created_at DESC, id DESC
            """,
        (rs, rowNum) -> new HuntingTask(
            rs.getString("public_id"),
            rs.getString("title"),
            rs.getString("description"),
            rs.getString("mode"),
            toAmount(rs.getLong("fee_cents")),
            rs.getString("latest_time"),
            rs.getString("location"),
            rs.getString("urgency"),
            rs.getString("status"),
            rs.getString("publish_time"),
            rs.getString("location"),
            rs.getString("urgency"),
            Arrays.stream(rs.getString("urgency").split("、"))
                .map(String::strip)
                .filter((item) -> !item.isBlank())
                .toList(),
            rs.getLong("fee_cents") == 0
        )
    );
  }

  private List<TutorDemand> tutorDemands() {
    return jdbcTemplate.query(
        """
            SELECT id, public_id, child, subject, school, budget, status
            FROM tutor_demand
            WHERE enabled = TRUE
            ORDER BY created_at DESC, id DESC
            """,
        (rs, rowNum) -> new TutorDemand(
            rs.getString("public_id"),
            rs.getString("child"),
            rs.getString("subject"),
            rs.getString("school"),
            rs.getString("budget"),
            rs.getString("status"),
            tutorApplicants(rs.getLong("id"))
        )
    );
  }

  private List<TutorApplicant> tutorApplicants(long tutorDemandId) {
    return jdbcTemplate.query(
        """
            SELECT public_id, name, school, major, gpa, hired_times, availability, status
            FROM tutor_applicant
            WHERE tutor_demand_id = ?
              AND enabled = TRUE
            ORDER BY hired_times DESC, id
            """,
        (rs, rowNum) -> new TutorApplicant(
            rs.getString("public_id"),
            rs.getString("name"),
            rs.getString("school"),
            rs.getString("major"),
            rs.getString("gpa"),
            rs.getInt("hired_times"),
            rs.getString("availability"),
            rs.getString("status")
        ),
        tutorDemandId
    );
  }

  private MerchantDashboard merchantDashboard() {
    List<MerchantDashboard> rows = jdbcTemplate.query(
        """
            SELECT sales_count, sales_amount_cents, pending_delivery, delivering,
                   after_sale_messages, chat_messages, views, favorites,
                   orders, deals, after_sale_rate, part_time_conversion, deposit_status
            FROM merchant_dashboard
            WHERE dashboard_key = 'default'
            LIMIT 1
            """,
        (rs, rowNum) -> new MerchantDashboard(
            rs.getInt("sales_count"),
            toAmount(rs.getLong("sales_amount_cents")),
            rs.getInt("pending_delivery"),
            rs.getInt("delivering"),
            rs.getInt("after_sale_messages"),
            rs.getInt("chat_messages"),
            rs.getInt("views"),
            rs.getInt("favorites"),
            rs.getInt("orders"),
            rs.getInt("deals"),
            rs.getString("after_sale_rate"),
            rs.getString("part_time_conversion"),
            rs.getString("deposit_status")
        )
    );
    if (rows.isEmpty()) {
      throw new BusinessException("MERCHANT_DASHBOARD_NOT_FOUND", "商户看板数据不存在");
    }
    return rows.get(0);
  }

  private List<MerchantProduct> merchantProducts() {
    return jdbcTemplate.query(
        """
            SELECT public_id, title, model, category, price_cents, stock,
                   purchase_limit, status, visible
            FROM product
            WHERE source_type = 'MERCHANT'
            ORDER BY updated_at DESC, id DESC
            """,
        (rs, rowNum) -> new MerchantProduct(
            rs.getString("public_id"),
            rs.getString("title"),
            rs.getString("public_id"),
            rs.getString("model"),
            rs.getString("category"),
            toAmount(rs.getLong("price_cents")),
            rs.getInt("stock"),
            rs.getInt("purchase_limit"),
            "ON_SALE".equals(rs.getString("status")) ? "上架中" : "下架",
            rs.getBoolean("visible") ? "可查看" : "隐藏"
        )
    );
  }

  private WalletSummary walletSummary(ClientRole role) {
    long userId = roleUserId(role);
    List<WalletSummary> rows = jdbcTemplate.query(
        """
            SELECT withdrawable_cents, protected_cents, deposit_cents
            FROM wallet_account
            WHERE user_id = ?
            """,
        (rs, rowNum) -> new WalletSummary(
            "¥" + toAmount(rs.getLong("withdrawable_cents")),
            "¥" + toAmount(rs.getLong("protected_cents")),
            role == ClientRole.merchant ? "店铺信用金 ¥" + toAmount(rs.getLong("deposit_cents")) : "¥" + toAmount(rs.getLong("deposit_cents")),
            "支付宝 / 银行卡"
        ),
        userId
    );
    if (rows.isEmpty()) {
      throw new BusinessException("WALLET_NOT_FOUND", "钱包账户不存在");
    }
    return rows.get(0);
  }

  private List<WalletRecord> walletRecords(ClientRole role) {
    long userId = roleUserId(role);
    return jdbcTemplate.query(
        """
            SELECT id, record_type, direction, amount_cents, title, status
            FROM wallet_record
            WHERE user_id = ?
            ORDER BY created_at DESC, id DESC
            LIMIT 20
            """,
        (rs, rowNum) -> new WalletRecord(
            "W" + rs.getLong("id"),
            rs.getString("record_type"),
            rs.getString("title") == null ? "" : rs.getString("title"),
            ("OUT".equals(rs.getString("direction")) ? "-" : "+") + toAmount(rs.getLong("amount_cents")),
            rs.getString("status") == null ? "" : rs.getString("status")
        ),
        userId
    );
  }

  private long roleUserId(ClientRole role) {
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

  private List<String> splitCsv(String raw) {
    if (raw == null || raw.isBlank()) {
      return List.of();
    }
    return Arrays.stream(raw.split(","))
        .map(String::trim)
        .filter(value -> !value.isEmpty())
        .toList();
  }

  private BigDecimal toAmount(long cents) {
    return BigDecimal.valueOf(cents, 2);
  }

  /** 将元转换为分，统一保留两位小数。 */
  private long toCents(BigDecimal amount) {
    if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
      throw new BusinessException("INVALID_HUNTING_TASK_AMOUNT", "发布金额必须大于 0");
    }

    return amount.setScale(2, RoundingMode.HALF_UP).movePointRight(2).longValueExact();
  }

  /** 生成委托任务对外编号。 */
  private String nextHuntingTaskPublicId() {
    String randomSuffix = UUID.randomUUID().toString().replace("-", "").substring(0, 6).toUpperCase();
    return "H" + System.currentTimeMillis() + randomSuffix;
  }

  /** 根据发布类型获取委托任务模式。 */
  private String huntingTaskMode(String type) {
    if ("delegation".equals(type)) {
      return "委托发布";
    }
    if ("recycle".equals(type)) {
      return "回收发布";
    }

    throw new BusinessException("UNSUPPORTED_HUNTING_TASK_TYPE", "当前仅支持发布委托和回收");
  }

  /** 规范化委托要求标签。 */
  private List<String> normalizedRequirementTags(List<String> requirementTags) {
    if (requirementTags == null) {
      return List.of();
    }

    return requirementTags.stream()
        .map(String::strip)
        .filter((tag) -> !tag.isBlank())
        .limit(4)
        .toList();
  }

  /** 获取委托要求展示文案。 */
  private String getHuntingRequirement(List<String> requirementTags, String fallbackRequirement) {
    List<String> normalizedTags = normalizedRequirementTags(requirementTags);
    String customRequirement = fallbackRequirement == null ? "" : fallbackRequirement.strip();
    List<String> requirementItems = new java.util.ArrayList<>(normalizedTags);
    if (!customRequirement.isBlank()) {
      Arrays.stream(customRequirement.split("、|,|，|\\s+"))
          .map(String::strip)
          .filter((item) -> !item.isBlank())
          .filter((item) -> !requirementItems.contains(item))
          .forEach(requirementItems::add);
    }

    return requirementItems.isEmpty() ? "无特殊要求" : String.join("、", requirementItems);
  }

  /** 清理用户输入文本，为空时使用默认展示值。 */
  private String defaultText(String value, String fallback) {
    if (value == null || value.isBlank()) {
      return fallback;
    }

    return value.strip();
  }

  /** 按表字段长度裁剪展示文本。 */
  private String truncate(String value, int maxLength) {
    if (value.length() <= maxLength) {
      return value;
    }

    return value.substring(0, maxLength);
  }
}
