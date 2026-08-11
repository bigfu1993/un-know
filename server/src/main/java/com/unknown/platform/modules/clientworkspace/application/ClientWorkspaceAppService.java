package com.unknown.platform.modules.clientworkspace.application;

import com.unknown.platform.common.api.UserNickname;
import com.unknown.platform.common.exception.BusinessException;
import com.unknown.platform.common.security.ClientSessionService;
import com.unknown.platform.modules.auth.model.ClientRole;
import com.unknown.platform.modules.clientworkspace.model.ClientWorkspaceResponse;
import com.unknown.platform.modules.clientworkspace.model.ClientWorkspaceResponse.ClientOrder;
import com.unknown.platform.modules.clientworkspace.model.ClientWorkspaceResponse.MerchantDashboard;
import com.unknown.platform.modules.clientworkspace.model.ClientWorkspaceResponse.MerchantProduct;
import com.unknown.platform.modules.clientworkspace.model.ClientWorkspaceResponse.PartTimeJob;
import com.unknown.platform.modules.clientworkspace.model.ClientWorkspaceResponse.WalletRecord;
import com.unknown.platform.modules.clientworkspace.model.ClientWorkspaceResponse.WalletSummary;
import java.util.ArrayList;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/**
 * 客户端工作台聚合服务。
 *
 * <p>负责按角色聚合订单、兼职、商户商品和钱包等移动端首页级数据；委托/狩猎与家教两个复杂领域
 * 已分别拆分至 {@link HuntingTaskAppService} 和 {@link TutorWorkspaceAppService}，
 * 本类只保留跨领域聚合逻辑和体量较小的兼职/商户/钱包查询，不再直接承载复杂业务规则。</p>
 */
@Service
public class ClientWorkspaceAppService {
  private final JdbcTemplate jdbcTemplate;
  private final ClientSessionService clientSessionService;
  private final ClientWorkspaceSupport support;
  private final HuntingTaskAppService huntingTaskAppService;
  private final TutorWorkspaceAppService tutorWorkspaceAppService;

  public ClientWorkspaceAppService(
      JdbcTemplate jdbcTemplate,
      ClientSessionService clientSessionService,
      ClientWorkspaceSupport support,
      HuntingTaskAppService huntingTaskAppService,
      TutorWorkspaceAppService tutorWorkspaceAppService
  ) {
    this.jdbcTemplate = jdbcTemplate;
    this.clientSessionService = clientSessionService;
    this.support = support;
    this.huntingTaskAppService = huntingTaskAppService;
    this.tutorWorkspaceAppService = tutorWorkspaceAppService;
  }

  /**
   * 获取客户端工作台聚合数据。
   *
   * @param role 当前角色
   * @param authorization 登录访问令牌，可为空
   * @return 当前角色工作台数据
   */
  public ClientWorkspaceResponse getWorkspace(ClientRole role, String authorization) {
    Long currentUserId = clientSessionService.userIdOrNull(authorization);

    return new ClientWorkspaceResponse(
        orders(role, currentUserId),
        partTimeJobs(),
        huntingTaskAppService.huntingSummary(),
        huntingTaskAppService.huntingTasks(currentUserId),
        tutorWorkspaceAppService.tutorDemands(role, currentUserId),
        merchantDashboard(),
        merchantProducts(),
        walletSummary(role),
        walletRecords(role)
    );
  }


  /**
   * 获取兼职列表独立数据。
   *
   * @return 兼职卡片列表
   */
  public List<PartTimeJob> listPartTimeJobs() {
    return partTimeJobs();
  }


  private List<ClientOrder> orders(ClientRole role, Long currentUserId) {
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

    List<ClientOrder> orders = role == ClientRole.merchant
        ? new ArrayList<>(jdbcTemplate.query(sql, (rs, rowNum) -> mapOrder(role, rs.getString("order_no"),
            rs.getString("title"), rs.getString("status"), rs.getLong("total_amount_cents"),
            rs.getString("contact_phone"), rs.getString("detail"), rs.getString("risk"))))
        : new ArrayList<>(jdbcTemplate.query(sql, (rs, rowNum) -> mapOrder(role, rs.getString("order_no"),
            rs.getString("title"), rs.getString("status"), rs.getLong("total_amount_cents"),
            rs.getString("contact_phone"), rs.getString("detail"), rs.getString("risk")), role.name()));

    orders.addAll(tutorWorkspaceAppService.tutorOrders(role, currentUserId));
    return orders;
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
    return ClientOrder.builder()
        .id(orderNo)
        .role(role)
        .title(title)
        .status(status)
        .amount(support.toAmount(amountCents))
        .contact(contactPhone)
        .detail(detail == null ? "" : detail)
        .risk(risk)
        .phoneNumber(contactPhone)
        .build();
  }


  private List<PartTimeJob> partTimeJobs() {
    return jdbcTemplate.query(
        """
            SELECT public_id, title, description, hourly_pay_cents,
                   period, location, status, requirement, form_fields,
                   funding_state, sign_rule,
                   COALESCE(
                     (
                       SELECT NULLIF(nickname, '')
                       FROM app_user
                       WHERE role = 'merchant'
                       ORDER BY updated_at DESC, id DESC
                       LIMIT 1
                     ),
                     '未设置昵称'
                   ) AS publisher_nickname,
                   COALESCE(
                     (
                       SELECT phone
                       FROM app_user
                       WHERE role = 'merchant'
                       ORDER BY updated_at DESC, id DESC
                       LIMIT 1
                     ),
                     ''
                   ) AS publisher_phone
            FROM part_time_job
            WHERE enabled = TRUE
            ORDER BY created_at DESC, id DESC
            """,
        (rs, rowNum) -> new PartTimeJob(
            rs.getString("public_id"),
            new UserNickname(rs.getString("publisher_nickname"), support.maskPhone(rs.getString("publisher_phone"))),
            rs.getString("title"),
            rs.getString("description"),
            support.toAmount(rs.getLong("hourly_pay_cents")),
            rs.getString("period"),
            rs.getString("location"),
            rs.getString("status"),
            rs.getString("requirement"),
            support.splitCsv(rs.getString("form_fields")),
            rs.getString("funding_state"),
            rs.getString("sign_rule")
        )
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
            support.toAmount(rs.getLong("sales_amount_cents")),
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
            support.toAmount(rs.getLong("price_cents")),
            rs.getInt("stock"),
            rs.getInt("purchase_limit"),
            "ON_SALE".equals(rs.getString("status")) ? "上架中" : "下架",
            rs.getBoolean("visible") ? "可查看" : "隐藏"
        )
    );
  }


  private WalletSummary walletSummary(ClientRole role) {
    long userId = support.roleUserId(role);
    List<WalletSummary> rows = jdbcTemplate.query(
        """
            SELECT withdrawable_cents, protected_cents, deposit_cents
            FROM wallet_account
            WHERE user_id = ?
            """,
        (rs, rowNum) -> new WalletSummary(
            "¥" + support.toAmount(rs.getLong("withdrawable_cents")),
            "¥" + support.toAmount(rs.getLong("protected_cents")),
            role == ClientRole.merchant ? "店铺信用金 ¥" + support.toAmount(rs.getLong("deposit_cents")) : "¥" + support.toAmount(rs.getLong("deposit_cents")),
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
    long userId = support.roleUserId(role);
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
            ("OUT".equals(rs.getString("direction")) ? "-" : "+") + support.toAmount(rs.getLong("amount_cents")),
            rs.getString("status") == null ? "" : rs.getString("status")
        ),
        userId
    );
  }}
