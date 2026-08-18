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
import java.math.BigDecimal;
import java.math.RoundingMode;
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
        partTimeJobs(),
        huntingTaskAppService.huntingSummary(),
        huntingTaskAppService.huntingTasks(currentUserId),
        // 家教需求列表已改由独立接口提供：学生角色的招募中需求并入 /workspace/jobs，家长角色的
        // 认证学生列表改由 /workspace/tutors 提供，前端已消费这两个独立接口，这里不再重复查询。
        List.of(),
        merchantDashboard(),
        merchantProducts(),
        walletSummary(role),
        walletRecords(role)
    );
  }


  /**
   * 获取当前账号"进行中"列表，取代原来嵌在工作台聚合响应里的 orders 字段，不管什么角色
   * 都查这同一个接口，按角色聚合不同业务域：学生角色含优选/委托/狩猎/家教，家长角色含
   * 优选/家教，商户角色只有优选（店铺全部购买订单）。
   *
   * @param role 当前角色
   * @param authorization 登录访问令牌，可为空
   * @return 当前角色进行中订单列表
   */
  public List<ClientOrder> ongoingOrders(ClientRole role, String authorization) {
    Long currentUserId = clientSessionService.userIdOrNull(authorization);
    List<ClientOrder> orders = new ArrayList<>(purchaseOrders(role));
    orders.addAll(tutorWorkspaceAppService.tutorOrders(role, currentUserId));

    if (role == ClientRole.student) {
      orders.addAll(huntingOngoingOrders(role, authorization));
    }

    return orders;
  }


  /**
   * 获取兼职列表独立数据：聚合兼职岗位（part_time_job 表）和招募中的家教需求（tutor_demand 表，
   * 家教是兼职的一种类型，仅学生角色可见），两类数据字段结构完全不同，各自维护在不同表，
   * 统一以 Object 承载后由前端按结构判断类型。
   *
   * @param role 当前角色
   * @return 兼职列表（含家教兼职）
   */
  public List<Object> listPartTimeJobs(ClientRole role) {
    List<Object> jobs = new ArrayList<>(partTimeJobs());
    jobs.addAll(tutorWorkspaceAppService.recruitingTutorDemandsForJobs(role));
    return jobs;
  }


  /** 商城购买订单，按角色返回：商户看店铺全部订单，其余角色只看自己角色下单的订单。 */
  private List<ClientOrder> purchaseOrders(ClientRole role) {
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

    return role == ClientRole.merchant
        ? new ArrayList<>(jdbcTemplate.query(sql, (rs, rowNum) -> mapOrder(role, rs.getString("order_no"),
            rs.getString("title"), rs.getString("status"), rs.getLong("total_amount_cents"),
            rs.getString("contact_phone"), rs.getString("detail"), rs.getString("risk"))))
        : new ArrayList<>(jdbcTemplate.query(sql, (rs, rowNum) -> mapOrder(role, rs.getString("order_no"),
            rs.getString("title"), rs.getString("status"), rs.getLong("total_amount_cents"),
            rs.getString("contact_phone"), rs.getString("detail"), rs.getString("risk")), role.name()));
  }


  /**
   * 把委托/狩猎任务里跟当前账号相关的发布方委托或服务方报价/履约任务转换成进行中订单，
   * 逻辑对齐前端历史实现 {@code pages/home/commission/model.ts} 的 getHuntingOngoingOrders，
   * 只服务学生角色（家长不做委托/狩猎）。
   */
  private List<ClientOrder> huntingOngoingOrders(ClientRole role, String authorization) {
    List<ClientWorkspaceResponse.HuntingTask> tasks = huntingTaskAppService.listHuntingTasks(authorization);
    List<ClientOrder> orders = new ArrayList<>();

    for (ClientWorkspaceResponse.HuntingTask task : tasks) {
      boolean isPublished = isHuntingPublishedStatus(task.status());
      boolean isQuote = isHuntingQuoteStatus(task.status());
      boolean isFulfilling = isHuntingFulfillingStatus(task.status());
      boolean isCommissionInProgress = Boolean.TRUE.equals(task.isMine()) && (isPublished || isQuote || isFulfilling);
      boolean isQuotedHunting = Boolean.TRUE.equals(task.isQuotedByMe()) && isQuote;
      boolean isHuntingInProgress = Boolean.TRUE.equals(task.isAcceptedByMe()) && isFulfilling;

      if (!isCommissionInProgress && !isQuotedHunting && !isHuntingInProgress) {
        continue;
      }

      boolean isPublisher = Boolean.TRUE.equals(task.isMine());
      boolean isHunter = Boolean.TRUE.equals(task.isAcceptedByMe()) && !isPublisher;
      boolean isCancelPending = "取消待确认".equals(task.fulfillmentAction());
      boolean isCompletePending = "完成待确认".equals(task.fulfillmentAction());

      orders.add(ClientOrder.builder()
          .id(task.id())
          .role(role)
          .title(task.title())
          .status(huntingOngoingStatus(task))
          .amount(task.pendingAmount() != null ? task.pendingAmount() : task.fee())
          .contact(isPublisher
              ? huntingFulfillmentContact(task)
              : isQuote ? "我报价的委托" : "我履约的委托")
          .detail(task.mode() + " · " + support.defaultText(task.fulfillmentAction(), task.latestTime())
              + " · " + support.defaultText(task.destination(), task.location()))
          .amountLabel(huntingOngoingAmountLabel(task))
          .category(isPublisher ? "delegation" : "hunting")
          .phoneNumber(isPublisher ? (task.acceptedUser() == null ? null : task.acceptedUser().phone()) : task.publisher().phone())
          .quoteAmount(task.pendingAmount())
          .quoteActionLabel(huntingQuoteActionLabel(task))
          .quoteCount(isPublisher ? task.quoteCount() : null)
          .quoteId(task.pendingQuoteId())
          .canCall(isPublisher && isFulfilling)
          .canMessage(isFulfilling)
          .canRequestCancel((isPublisher || isHunter) && isFulfilling && task.fulfillmentAction() == null)
          .canRequestComplete(isHunter && isFulfilling && task.fulfillmentAction() == null)
          .canConfirmCancel((isPublisher || isHunter) && isCancelPending)
          .canConfirmComplete(isPublisher && isCompletePending && !Boolean.TRUE.equals(task.fulfillmentActionByMe()))
          .canRepublish(isPublisher && isCancelPending)
          .build());
    }

    return orders;
  }


  /** 判断委托是否处在报价阶段，兼容迁移前旧状态文案。 */
  private boolean isHuntingQuoteStatus(String status) {
    return status != null && status.contains("报价");
  }


  /** 判断委托是否处在发布等待阶段，兼容迁移前旧状态文案。 */
  private boolean isHuntingPublishedStatus(String status) {
    return status != null && (status.contains("发布") || status.contains("待领取"));
  }


  /** 判断委托是否处在履约阶段，兼容迁移前旧状态文案。 */
  private boolean isHuntingFulfillingStatus(String status) {
    return status != null && (status.contains("履约中") || status.contains("进行中") || status.contains("已领取"));
  }


  /** 判断报价是否等待服务方确认。 */
  private boolean isHuntingQuoteWaitingHunter(String status) {
    return status != null && status.contains("待服务方确认");
  }


  /** 获取进行中列表内委托/狩猎卡片展示状态。 */
  private String huntingOngoingStatus(ClientWorkspaceResponse.HuntingTask task) {
    boolean hasPendingQuote = isHuntingQuoteStatus(task.status())
        && (Boolean.TRUE.equals(task.isQuotedByMe()) || task.quoteCount() > 0);

    if (task.fulfillmentAction() != null) {
      return "待确认";
    }
    if (hasPendingQuote) {
      return "报价确认中";
    }
    if (isHuntingFulfillingStatus(task.status())) {
      return "履约中";
    }
    if (isHuntingPublishedStatus(task.status()) || isHuntingQuoteStatus(task.status())) {
      return "发布";
    }
    return task.status();
  }


  /** 获取进行中列表内委托/狩猎卡片金额展示文案。 */
  private String huntingOngoingAmountLabel(ClientWorkspaceResponse.HuntingTask task) {
    if (Boolean.TRUE.equals(task.isQuotedByMe()) && task.pendingAmount() != null) {
      return "报价：" + formatCurrencyLabel(task.pendingAmount());
    }
    if (Boolean.TRUE.equals(task.isMine()) && isHuntingQuoteStatus(task.status()) && task.quoteCount() > 0) {
      return task.quoteCount() + " 个报价";
    }
    if (Boolean.TRUE.equals(task.amountNegotiable()) || task.fee().compareTo(BigDecimal.ZERO) <= 0) {
      return "协商";
    }
    return formatCurrencyLabel(task.fee());
  }


  /** 获取履约中委托的对接方展示文案。 */
  private String huntingFulfillmentContact(ClientWorkspaceResponse.HuntingTask task) {
    if (Boolean.TRUE.equals(task.isMine())) {
      String acceptedNickname = task.acceptedUser() == null ? "" : support.defaultText(task.acceptedUser().nickname(), "");
      return acceptedNickname.isEmpty() ? "履约方待确认" : "履约方：" + acceptedNickname;
    }

    return "发布方：" + support.defaultText(task.publisher().nickname(), "平台用户");
  }


  /** 获取服务方在进行中列表内可见的报价协商操作文案。 */
  private String huntingQuoteActionLabel(ClientWorkspaceResponse.HuntingTask task) {
    if (!Boolean.TRUE.equals(task.isMine()) && Boolean.TRUE.equals(task.isQuotedByMe())
        && isHuntingQuoteWaitingHunter(task.pendingQuoteStatus())) {
      return "协商报价";
    }

    return null;
  }


  /** 跟前端 formatCurrency 对齐的金额展示文案。 */
  private String formatCurrencyLabel(BigDecimal amount) {
    return "¥" + amount.setScale(2, RoundingMode.HALF_UP);
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
