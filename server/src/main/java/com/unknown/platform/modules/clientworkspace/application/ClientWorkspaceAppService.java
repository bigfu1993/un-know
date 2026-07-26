package com.unknown.platform.modules.clientworkspace.application;

import static com.unknown.platform.modules.clientworkspace.model.HuntingWorkflowStatus.QUOTE_CONFIRMED;
import static com.unknown.platform.modules.clientworkspace.model.HuntingWorkflowStatus.QUOTE_LEGACY_WAITING;
import static com.unknown.platform.modules.clientworkspace.model.HuntingWorkflowStatus.QUOTE_NOT_SELECTED;
import static com.unknown.platform.modules.clientworkspace.model.HuntingWorkflowStatus.QUOTE_REJECTED;
import static com.unknown.platform.modules.clientworkspace.model.HuntingWorkflowStatus.QUOTE_WAITING_HUNTER;
import static com.unknown.platform.modules.clientworkspace.model.HuntingWorkflowStatus.QUOTE_WAITING_PUBLISHER;
import static com.unknown.platform.modules.clientworkspace.model.HuntingWorkflowStatus.FULFILLMENT_CANCEL_REQUESTED;
import static com.unknown.platform.modules.clientworkspace.model.HuntingWorkflowStatus.FULFILLMENT_COMPLETE_REQUESTED;
import static com.unknown.platform.modules.clientworkspace.model.HuntingWorkflowStatus.TASK_CANCELLED;
import static com.unknown.platform.modules.clientworkspace.model.HuntingWorkflowStatus.TASK_COMPLETED;
import static com.unknown.platform.modules.clientworkspace.model.HuntingWorkflowStatus.TASK_EXCEPTION;
import static com.unknown.platform.modules.clientworkspace.model.HuntingWorkflowStatus.TASK_FULFILLING;
import static com.unknown.platform.modules.clientworkspace.model.HuntingWorkflowStatus.TASK_PUBLISHED;
import static com.unknown.platform.modules.clientworkspace.model.HuntingWorkflowStatus.TASK_QUOTE;

import com.unknown.platform.common.api.UserNickname;
import com.unknown.platform.common.exception.BusinessException;
import com.unknown.platform.common.security.ClientSessionService;
import com.unknown.platform.modules.auth.model.ClientRole;
import com.unknown.platform.modules.clientworkspace.model.ClientWorkspaceResponse;
import com.unknown.platform.modules.clientworkspace.model.ClientWorkspaceResponse.ClientOrder;
import com.unknown.platform.modules.clientworkspace.model.ClientWorkspaceResponse.HuntingQuote;
import com.unknown.platform.modules.clientworkspace.model.ClientWorkspaceResponse.HuntingSummary;
import com.unknown.platform.modules.clientworkspace.model.ClientWorkspaceResponse.HuntingTask;
import com.unknown.platform.modules.clientworkspace.model.ClientWorkspaceResponse.MerchantDashboard;
import com.unknown.platform.modules.clientworkspace.model.ClientWorkspaceResponse.MerchantProduct;
import com.unknown.platform.modules.clientworkspace.model.ClientWorkspaceResponse.PartTimeJob;
import com.unknown.platform.modules.clientworkspace.model.ClientWorkspaceResponse.TutorApplicant;
import com.unknown.platform.modules.clientworkspace.model.ClientWorkspaceResponse.TutorDemand;
import com.unknown.platform.modules.clientworkspace.model.ClientWorkspaceResponse.WalletRecord;
import com.unknown.platform.modules.clientworkspace.model.ClientWorkspaceResponse.WalletSummary;
import com.unknown.platform.modules.clientworkspace.model.ApplyTutorTrialRequest;
import com.unknown.platform.modules.clientworkspace.model.CompleteTutorTrialEndRequest;
import com.unknown.platform.modules.clientworkspace.model.ConfirmTutorTrialRequest;
import com.unknown.platform.modules.clientworkspace.model.CreateHuntingProjectRequest;
import com.unknown.platform.modules.clientworkspace.model.HuntingProjectResponse;
import com.unknown.platform.modules.clientworkspace.model.HuntingProjectStopResponse;
import com.unknown.platform.modules.clientworkspace.model.HuntingQuoteDecisionRequest;
import com.unknown.platform.modules.clientworkspace.model.HuntingTaskFulfillmentActionRequest;
import com.unknown.platform.modules.clientworkspace.model.PublishHuntingTaskRequest;
import com.unknown.platform.modules.clientworkspace.model.PublishTutorDemandRequest;
import com.unknown.platform.modules.clientworkspace.model.QuoteHuntingTaskRequest;
import com.unknown.platform.modules.clientworkspace.model.TutorWorkflowActionRequest;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 客户端工作台聚合服务。
 *
 * <p>当前阶段承接订单、兼职、委托/狩猎、家教、商户商品和钱包等移动端首页数据聚合，并直接通过
 * {@link JdbcTemplate} 访问 PostgreSQL。新增复杂领域时优先拆出独立 AppService 或领域辅助类，避免继续扩大本类职责。</p>
 */
@Service
public class ClientWorkspaceAppService {
  private static final DateTimeFormatter HUNTING_PUBLISH_TIME_FORMATTER = DateTimeFormatter.ofPattern("MM-dd HH:mm");
  private static final DateTimeFormatter TUTOR_TRIAL_TIME_FORMATTER = DateTimeFormatter.ofPattern("H:mm");
  private static final Pattern TUTOR_TRIAL_DATE_PATTERN = Pattern.compile("(\\d{4})年(\\d{1,2})月(\\d{1,2})日");
  private static final Pattern TUTOR_TRIAL_TIME_RANGE_PATTERN = Pattern.compile("(\\d{1,2}:\\d{2})-(\\d{1,2}:\\d{2})");
  private static final int TUTOR_TRIAL_PARENT_MAX_DAYS = 3;
  private static final String TUTOR_APPLICANT_STATUS_APPLICATION_PENDING = "申请试课中";
  private static final String TUTOR_APPLICANT_STATUS_APPLICATION_PENDING_LEGACY = "等待家长确认试课";
  private static final String TUTOR_APPLICANT_STATUS_CANCELLED = "已取消";
  private static final String TUTOR_APPLICANT_STATUS_ENDED = "已结束";
  private static final String TUTOR_APPLICANT_STATUS_FORMAL_SERVICE = "正式雇佣";
  private static final String TUTOR_APPLICANT_STATUS_FORMAL_SERVICE_LEGACY = "正式家教服务";
  private static final String TUTOR_APPLICANT_STATUS_FORMAL_SERVICE_INVALID = "正式雇佣失效";
  private static final String TUTOR_APPLICANT_STATUS_REJECTED = "已失效";
  private static final String TUTOR_APPLICANT_STATUS_REJECTED_LEGACY = "已拒绝";
  private static final String TUTOR_APPLICANT_STATUS_SERVICE_CONFIRMING = "正式雇佣确认中";
  private static final String TUTOR_APPLICANT_STATUS_SERVICE_CONFIRMING_LEGACY = "家教服务确认中";
  private static final String TUTOR_APPLICANT_STATUS_SERVICE_SCHEDULE_CONFIRMING_LEGACY = "兼职日程确认中";
  private static final String TUTOR_APPLICANT_STATUS_SERVICE_SCHEDULE_PENDING = "正式雇佣日程确认中";
  private static final String TUTOR_APPLICANT_STATUS_SERVICE_SCHEDULE_PENDING_LEGACY = "兼职日程待提交";
  private static final String TUTOR_APPLICANT_STATUS_SETTLEMENT_CONFIRMING = "结算确认中";
  private static final String TUTOR_APPLICANT_STATUS_SETTLEMENT_REVISING = "结算修改中";
  private static final String TUTOR_APPLICANT_STATUS_SYSTEM_SETTLING = "系统结算中";
  private static final String TUTOR_APPLICANT_STATUS_TRIAL_SETTLED_SERVICE_PENDING = "试课已结算";
  private static final String TUTOR_APPLICANT_STATUS_TRIAL_SETTLED_SERVICE_PENDING_LEGACY = "试课已结算+雇佣确认中";
  private static final String TUTOR_APPLICANT_STATUS_TRIAL_ENDED = "试课已结束";
  private static final String TUTOR_APPLICANT_STATUS_TRIAL_END_CONFIRMING = "结束试课确认中";
  private static final String TUTOR_APPLICANT_STATUS_TRIAL_CONFIRMED = "试课日程确认中";
  private static final String TUTOR_APPLICANT_STATUS_TRIAL_CONFIRMED_LEGACY = "试课确认中";
  private static final String TUTOR_APPLICANT_STATUS_TRIAL_RESULT_PROCESSING = "试课结果处理";
  private static final String TUTOR_APPLICANT_STATUS_TRIALING = "试课中";
  private static final String TUTOR_APPLICANT_STATUS_TUTORING_LEGACY = "家教进行中";
  private static final String TUTOR_DEMAND_STATUS_CANCELLED = "已取消";
  private static final String TUTOR_DEMAND_STATUS_ENDED = "已结束";
  private static final String TUTOR_DEMAND_STATUS_IN_PROGRESS = "进行中";
  private static final String TUTOR_DEMAND_STATUS_FORMAL_SERVICE_LEGACY = "正式雇佣";
  private static final String TUTOR_DEMAND_STATUS_FORMAL_TUTOR_SERVICE_LEGACY = "正式家教服务";
  private static final String TUTOR_DEMAND_STATUS_RECRUITING = "发布中";
  private static final String TUTOR_DEMAND_STATUS_RECRUITING_LEGACY = "家教招募中";
  private static final String TUTOR_DEMAND_STATUS_TUTORING_LEGACY = "家教进行中";
  private static final String TUTOR_TRIAL_HIRE_DECISION_HIRE = "hire";
  private static final String TUTOR_TRIAL_HIRE_DECISION_NOT_HIRE = "not_hire";
  private static final String TUTOR_SERVICE_CONFIRMATION_CANCELLED_BY_PARENT = "parent";
  private static final String TUTOR_SERVICE_CONFIRMATION_CANCELLED_BY_STUDENT = "student";

  private final JdbcTemplate jdbcTemplate;
  private final ClientSessionService clientSessionService;

  public ClientWorkspaceAppService(JdbcTemplate jdbcTemplate, ClientSessionService clientSessionService) {
    this.jdbcTemplate = jdbcTemplate;
    this.clientSessionService = clientSessionService;
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
        huntingSummary(),
        huntingTasks(currentUserId),
        tutorDemands(role, currentUserId),
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

  /**
   * 获取当前登录用户视角下的委托/狩猎任务列表。
   *
   * @param authorization 登录访问令牌，可为空
   * @return 委托/狩猎任务列表
   */
  public List<HuntingTask> listHuntingTasks(String authorization) {
    Long currentUserId = clientSessionService.userIdOrNull(authorization);
    return huntingTasks(currentUserId);
  }

  /**
   * 获取当前角色视角下的家教列表。
   *
   * @param role 当前角色
   * @param authorization 登录访问令牌，可为空
   * @return 家教需求或可公开家教学生列表
   */
  public List<TutorDemand> listTutorDemands(ClientRole role, String authorization) {
    Long currentUserId = clientSessionService.userIdOrNull(authorization);
    return tutorDemands(role, currentUserId);
  }

  /** 发布委托或回收任务，并返回委托列表可直接展示的任务数据。 */
  @Transactional
  public HuntingTask publishHuntingTask(PublishHuntingTaskRequest request, String authorization) {
    Long currentUserId = clientSessionService.userIdOrNull(authorization);
    long publisherUserId = currentUserId == null ? roleUserId(ClientRole.student) : currentUserId;
    UserContact publisher = userContact(publisherUserId);
    String mode = huntingTaskMode(request.type());
    String publicId = nextHuntingTaskPublicId();
    String title = request.title().strip();
    boolean amountNegotiable = Boolean.TRUE.equals(request.amountNegotiable());
    String taskMode = amountNegotiable && "delegation".equals(request.type()) ? "报价发布" : mode;
    long feeCents = amountNegotiable ? 0 : toCents(request.amount());
    boolean depositRequired = Boolean.TRUE.equals(request.depositRequired());
    long depositCents = depositRequired
        ? toPositiveCents(request.depositAmount(), "INVALID_HUNTING_TASK_DEPOSIT", "委托押金金额必须大于 0")
        : 0;
    String description = defaultText(request.description(), "暂无描述");
    String latestTime = request.latestTime().strip();
    String location = defaultText(defaultText(request.destination(), request.location()), "目的地待补充");
    String requirement = getHuntingRequirement(request.requirementTags(), request.requirement());
    String status = amountNegotiable ? TASK_QUOTE : TASK_PUBLISHED;

    jdbcTemplate.update(
        """
            INSERT INTO hunting_task (
              public_id, publisher_user_id, title, description, mode, fee_cents,
              latest_time, location, urgency, status, deposit_required, deposit_cents,
              enabled, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, NOW())
            """,
        publicId,
        publisherUserId,
        title,
        description,
        taskMode,
        feeCents,
        latestTime,
        location,
        truncate(requirement, 40),
        status,
        depositRequired,
        depositCents
    );

    return new HuntingTask(
        publicId,
        title,
        description,
        taskMode,
        toAmount(feeCents),
        latestTime,
        location,
        truncate(requirement, 40),
        status,
        HUNTING_PUBLISH_TIME_FORMATTER.format(LocalDateTime.now()),
        location,
        requirement,
        normalizedRequirementTags(request.requirementTags()),
        new UserNickname(publisher.nickname(), maskPhone(publisher.phone())),
        null,
        currentUserId != null && currentUserId == publisherUserId,
        false,
        false,
        null,
        null,
        null,
        null,
        false,
        amountNegotiable,
        depositRequired,
        toAmount(depositCents),
        0,
        List.of()
    );
  }

  /** 服务方接受固定金额委托，成功后任务进入履约中并按需冻结押金。 */
  @Transactional
  public HuntingTask acceptHuntingTask(String taskId, String authorization) {
    long currentUserId = clientSessionService.requireUserId(authorization);
    HuntingTaskRow task = requireHuntingTaskForUpdate(taskId);

    ensureTaskCanBeOperatedByHunter(task, currentUserId);
    if (task.feeCents() <= 0 || isHuntingQuoteStatus(task.status())) {
      throw new BusinessException("HUNTING_TASK_QUOTE_REQUIRED", "该委托需要先报价，不能直接接受");
    }

    freezeHuntingDepositIfNeeded(currentUserId, task);
    jdbcTemplate.update(
        """
            UPDATE hunting_task
            SET accepted_user_id = ?,
                accepted_at = NOW(),
                status = ?,
                updated_at = NOW()
            WHERE id = ?
            """,
        currentUserId,
        TASK_FULFILLING,
        task.id()
    );

    return findHuntingTask(task.publicId(), currentUserId);
  }

  /** 服务方对协商金额委托提交报价，报价不锁定任务，等待发布方选择。 */
  @Transactional
  public HuntingTask quoteHuntingTask(String taskId, QuoteHuntingTaskRequest request, String authorization) {
    long currentUserId = clientSessionService.requireUserId(authorization);
    HuntingTaskRow task = requireHuntingTaskForUpdate(taskId);

    ensureTaskCanBeOperatedByHunter(task, currentUserId);
    if (!isHuntingQuoteStatus(task.status()) && task.feeCents() > 0) {
      throw new BusinessException("HUNTING_TASK_NOT_NEGOTIABLE", "该委托不是报价发布，不能提交报价");
    }

    long amountCents = toPositiveCents(request.amount(), "INVALID_HUNTING_QUOTE_AMOUNT", "报价金额必须大于 0");
    jdbcTemplate.update(
        """
            INSERT INTO hunting_task_quote (
              public_id, hunting_task_id, quote_user_id, amount_cents, original_amount_cents, status, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, NOW())
            ON CONFLICT (hunting_task_id, quote_user_id)
            DO UPDATE SET amount_cents = EXCLUDED.amount_cents,
                          status = EXCLUDED.status,
                          updated_at = NOW(),
                          confirmed_at = NULL
            """,
        nextHuntingQuotePublicId(),
        task.id(),
        currentUserId,
        amountCents,
        amountCents,
        QUOTE_WAITING_PUBLISHER
    );

    jdbcTemplate.update(
        "UPDATE hunting_task SET status = ?, updated_at = NOW() WHERE id = ?",
        TASK_QUOTE,
        task.id()
    );
    return findHuntingTask(task.publicId(), currentUserId);
  }

  /** 发布方确认某一条报价，确认后冻结服务方押金并让委托进入履约中。 */
  @Transactional
  public HuntingTask confirmHuntingQuote(String taskId, String quoteId, String authorization) {
    return decideHuntingQuote(taskId, quoteId, new HuntingQuoteDecisionRequest("confirm", null), authorization);
  }

  /** 处理委托报价协商动作，支持确认、拒绝和改价后推送给对方。 */
  @Transactional
  public HuntingTask decideHuntingQuote(
      String taskId,
      String quoteId,
      HuntingQuoteDecisionRequest request,
      String authorization
  ) {
    long currentUserId = clientSessionService.requireUserId(authorization);
    HuntingTaskRow task = requireHuntingTaskForUpdate(taskId);
    if (task.acceptedUserId() != null || isHuntingFulfillingStatus(task.status())) {
      throw new BusinessException("HUNTING_TASK_ALREADY_ACCEPTED", "该委托已进入履约中");
    }

    HuntingQuoteRow quote = requireHuntingQuote(task.id(), quoteId);
    String action = request.action() == null ? "" : request.action().strip().toLowerCase();
    boolean isPublisher = task.publisherUserId() != null && task.publisherUserId().equals(currentUserId);
    boolean isQuoteUser = quote.quoteUserId() == currentUserId;

    return switch (action) {
      case "confirm" -> confirmHuntingQuoteSelection(task, quote, currentUserId, isPublisher, isQuoteUser);
      case "reject" -> rejectHuntingQuote(task, quote, currentUserId, isPublisher, isQuoteUser);
      case "counter" -> counterHuntingQuote(task, quote, request.amount(), currentUserId, isPublisher, isQuoteUser);
      default -> throw new BusinessException("INVALID_HUNTING_QUOTE_ACTION", "报价处理动作不正确");
    };
  }

  private HuntingTask confirmHuntingQuoteSelection(
      HuntingTaskRow task,
      HuntingQuoteRow quote,
      long currentUserId,
      boolean isPublisher,
      boolean isQuoteUser
  ) {
    ensureQuoteActionAllowed(quote, isPublisher, isQuoteUser, "confirm");
    freezeHuntingDepositIfNeeded(quote.quoteUserId(), task);
    jdbcTemplate.update(
        """
            UPDATE hunting_task_quote
            SET status = CASE WHEN id = ? THEN ? ELSE ? END,
                confirmed_at = CASE WHEN id = ? THEN NOW() ELSE confirmed_at END,
                updated_at = NOW()
            WHERE hunting_task_id = ?
            """,
        quote.id(),
        QUOTE_CONFIRMED,
        QUOTE_NOT_SELECTED,
        quote.id(),
        task.id()
    );
    jdbcTemplate.update(
        """
            UPDATE hunting_task
            SET accepted_user_id = ?,
                accepted_at = NOW(),
                selected_quote_id = ?,
                fee_cents = ?,
                status = ?,
                updated_at = NOW()
            WHERE id = ?
            """,
        quote.quoteUserId(),
        quote.id(),
        quote.amountCents(),
        TASK_FULFILLING,
        task.id()
    );

    return findHuntingTask(task.publicId(), currentUserId);
  }

  private HuntingTask rejectHuntingQuote(
      HuntingTaskRow task,
      HuntingQuoteRow quote,
      long currentUserId,
      boolean isPublisher,
      boolean isQuoteUser
  ) {
    ensureQuoteActionAllowed(quote, isPublisher, isQuoteUser, "reject");
    jdbcTemplate.update(
        """
            UPDATE hunting_task_quote
            SET status = ?,
                updated_at = NOW()
            WHERE id = ?
            """,
        QUOTE_REJECTED,
        quote.id()
    );
    jdbcTemplate.update("UPDATE hunting_task SET status = ?, updated_at = NOW() WHERE id = ?", TASK_QUOTE, task.id());
    return findHuntingTask(task.publicId(), currentUserId);
  }

  private HuntingTask counterHuntingQuote(
      HuntingTaskRow task,
      HuntingQuoteRow quote,
      BigDecimal amount,
      long currentUserId,
      boolean isPublisher,
      boolean isQuoteUser
  ) {
    ensureQuoteActionAllowed(quote, isPublisher, isQuoteUser, "counter");
    long amountCents = toPositiveCents(amount, "INVALID_HUNTING_QUOTE_AMOUNT", "报价金额必须大于 0");
    String nextStatus = isPublisher ? QUOTE_WAITING_HUNTER : QUOTE_WAITING_PUBLISHER;
    jdbcTemplate.update(
        """
            UPDATE hunting_task_quote
            SET amount_cents = ?,
                status = ?,
                confirmed_at = NULL,
                updated_at = NOW()
            WHERE id = ?
            """,
        amountCents,
        nextStatus,
        quote.id()
    );
    jdbcTemplate.update("UPDATE hunting_task SET status = ?, updated_at = NOW() WHERE id = ?", TASK_QUOTE, task.id());
    return findHuntingTask(task.publicId(), currentUserId);
  }

  /** 处理履约阶段取消、完成确认和再次发布动作。 */
  @Transactional
  public HuntingTask handleHuntingTaskFulfillmentAction(
      String taskId,
      HuntingTaskFulfillmentActionRequest request,
      String authorization
  ) {
    long currentUserId = clientSessionService.requireUserId(authorization);
    HuntingTaskRow task = requireHuntingTaskForUpdate(taskId);
    String action = request == null || request.action() == null ? "" : request.action().strip().toLowerCase();

    return switch (action) {
      case "request_cancel" -> requestHuntingFulfillmentAction(
          task, currentUserId, FULFILLMENT_CANCEL_REQUESTED
      );
      case "request_complete" -> requestHuntingFulfillmentAction(
          task, currentUserId, FULFILLMENT_COMPLETE_REQUESTED
      );
      case "confirm_cancel" -> confirmHuntingFulfillmentAction(task, currentUserId, FULFILLMENT_CANCEL_REQUESTED);
      case "confirm_complete" -> confirmHuntingFulfillmentAction(task, currentUserId, FULFILLMENT_COMPLETE_REQUESTED);
      case "republish" -> republishHuntingTask(task, currentUserId);
      default -> throw new BusinessException("INVALID_HUNTING_FULFILLMENT_ACTION", "履约动作不正确");
    };
  }

  private HuntingTask requestHuntingFulfillmentAction(
      HuntingTaskRow task,
      long currentUserId,
      String fulfillmentAction
  ) {
    if (FULFILLMENT_CANCEL_REQUESTED.equals(fulfillmentAction)) {
      ensureHuntingCancellationActor(task, currentUserId);
    } else {
      ensureAcceptedHunter(task, currentUserId);
    }
    ensureNoPendingFulfillmentAction(task);
    jdbcTemplate.update(
        """
            UPDATE hunting_task
            SET fulfillment_action = ?,
                fulfillment_action_user_id = ?,
                updated_at = NOW()
            WHERE id = ?
            """,
        fulfillmentAction,
        currentUserId,
        task.id()
    );

    return findHuntingTask(task.publicId(), currentUserId);
  }

  private HuntingTask confirmHuntingFulfillmentAction(
      HuntingTaskRow task,
      long currentUserId,
      String expectedFulfillmentAction
  ) {
    if (FULFILLMENT_CANCEL_REQUESTED.equals(expectedFulfillmentAction)) {
      ensureHuntingCancellationActor(task, currentUserId);
    } else {
      ensurePublisher(task, currentUserId);
    }
    if (!expectedFulfillmentAction.equals(task.fulfillmentAction())) {
      throw new BusinessException("HUNTING_FULFILLMENT_ACTION_NOT_FOUND", "当前没有可确认的履约申请");
    }
    String nextStatus = FULFILLMENT_CANCEL_REQUESTED.equals(expectedFulfillmentAction)
        ? TASK_CANCELLED
        : TASK_COMPLETED;

    jdbcTemplate.update(
        """
            UPDATE hunting_task
            SET status = ?,
                fulfillment_action = NULL,
                fulfillment_action_user_id = NULL,
                updated_at = NOW()
            WHERE id = ?
            """,
        nextStatus,
        task.id()
    );

    return findHuntingTask(task.publicId(), currentUserId);
  }

  private HuntingTask republishHuntingTask(HuntingTaskRow task, long currentUserId) {
    ensurePublisher(task, currentUserId);
    if (!TASK_CANCELLED.equals(normalizeHuntingTaskStatus(task.status()))) {
      throw new BusinessException("HUNTING_TASK_REPUBLISH_FORBIDDEN", "仅已取消的委托可再次发布");
    }

    boolean quoteMode = task.mode().contains("报价");
    long nextFeeCents = quoteMode ? 0 : task.feeCents();
    String nextStatus = quoteMode ? TASK_QUOTE : TASK_PUBLISHED;
    String publicId = nextHuntingTaskPublicId();
    jdbcTemplate.update(
        """
            INSERT INTO hunting_task (
              public_id, publisher_user_id, title, description, mode, fee_cents,
              latest_time, location, urgency, status, deposit_required, deposit_cents,
              enabled, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, NOW())
            """,
        publicId,
        currentUserId,
        task.title(),
        defaultText(task.description(), "暂无描述"),
        task.mode(),
        nextFeeCents,
        task.latestTime(),
        task.location(),
        task.urgency(),
        nextStatus,
        task.depositRequired(),
        task.depositCents()
    );
    jdbcTemplate.update("UPDATE hunting_task SET enabled = FALSE, updated_at = NOW() WHERE id = ?", task.id());

    return findHuntingTask(publicId, currentUserId);
  }

  /** 家长发布家教需求，发布后进入自己的进行中家教列表。 */
  @Transactional
  public TutorDemand publishTutorDemand(PublishTutorDemandRequest request, String authorization) {
    long currentUserId = clientSessionService.requireUserId(authorization);
    ensureUserRole(currentUserId, ClientRole.parent, "TUTOR_DEMAND_PARENT_ONLY", "仅家长账号可以发布家教需求");
    String publicId = nextTutorDemandPublicId();
    String childName = defaultText(request.childName(), "孩子");
    String subject = defaultText(request.subject(), "待沟通");
    String title = defaultText(request.title(), childName + subject + "家教");
    String addressLabel = defaultText(request.addressLabel(), "地址待补充");
    String periodStart = defaultText(request.periodStart(), "待定");
    String periodEnd = defaultText(request.periodEnd(), "待定");
    String budget = Boolean.TRUE.equals(request.trialEnabled()) ? "需要试课" : "待议价";
    String school = addressLabel;

    jdbcTemplate.update(
        """
            INSERT INTO tutor_demand (
              public_id, parent_user_id, child, subject, school, budget, status,
              title, description, requirement, address_id, address_label, child_id,
              period_start, period_end, trial_enabled, trial_duration, wage_mode, school_tags,
              enabled, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, NOW())
            """,
        publicId,
        currentUserId,
        childName,
        subject,
        school,
        budget,
        TUTOR_DEMAND_STATUS_RECRUITING,
        title,
        defaultText(request.description(), "暂无描述"),
        defaultText(request.requirement(), "暂无要求"),
        clean(request.addressId()),
        addressLabel,
        clean(request.childId()),
        periodStart,
        periodEnd,
        Boolean.TRUE.equals(request.trialEnabled()),
        defaultText(request.trialDuration(), ""),
        defaultText(request.wageMode(), "按课时结算"),
        joinTags(request.schoolTags())
    );
    return findTutorDemand(publicId);
  }

  /** 学生申请家教试课，申请记录进入双方进行中列表。 */
  @Transactional
  public TutorDemand applyTutorTrial(String demandId, ApplyTutorTrialRequest request, String authorization) {
    long currentUserId = clientSessionService.requireUserId(authorization);
    ensureUserRole(currentUserId, ClientRole.student, "TUTOR_TRIAL_STUDENT_ONLY", "仅学生账号可以申请家教试课");
    TutorDemandRow demand = requireTutorDemandForUpdate(demandId);
    if (!isRecruitingTutorDemandStatus(demand.status())) {
      throw new BusinessException("TUTOR_DEMAND_CLOSED", "该家教兼职已不可申请");
    }
    String availability = request == null ? "" : clean(request.availability());
    if (availability.isBlank()) {
      throw new BusinessException("TUTOR_TRIAL_AVAILABILITY_REQUIRED", "请先提交可试课时间");
    }
    TutorApplicationRow existingApplication = findLatestTutorApplicationForStudent(demand, currentUserId);
    if (existingApplication != null && !isTutorApplicationTerminalStatus(existingApplication.status())) {
      if (!isTutorApplicationPendingStatus(existingApplication.status())) {
        throw new BusinessException("TUTOR_TRIAL_ALREADY_APPLIED", "你已申请该家教试课");
      }

      jdbcTemplate.update(
          """
              UPDATE tutor_applicant
              SET availability = ?,
                  status = ?,
                  message = ?,
                  updated_at = NOW()
              WHERE id = ?
              """,
          availability,
          TUTOR_APPLICANT_STATUS_APPLICATION_PENDING,
          request == null ? "" : clean(request.message()),
          existingApplication.id()
      );
      return findTutorDemand(demand.publicId());
    }

    jdbcTemplate.update(
        """
            INSERT INTO tutor_applicant (
              public_id, tutor_demand_id, applicant_user_id, school, major, gpa,
              hired_times, availability, status, message, updated_at
            )
            VALUES (?, ?, ?, '学校待补充', '专业待补充', '待补充', 0, ?, ?, ?, NOW())
            """,
        nextTutorApplicantPublicId(),
        demand.id(),
        currentUserId,
        availability,
        TUTOR_APPLICANT_STATUS_APPLICATION_PENDING,
        request == null ? "" : clean(request.message())
    );
    return findTutorDemand(demand.publicId());
  }

  /**
   * 学生取消自己的试课申请，服务端负责校验角色、归属和当前流程节点。
   *
   * @param applicationId 试课申请对外 ID
   * @param authorization 客户端登录访问令牌
   * @return 取消申请后的家教需求
   */
  @Transactional
  public TutorDemand cancelTutorApplication(String applicationId, String authorization) {
    long currentUserId = clientSessionService.requireUserId(authorization);
    ensureUserRole(currentUserId, ClientRole.student, "TUTOR_TRIAL_STUDENT_ONLY", "仅学生账号可以取消试课申请");
    TutorApplicationRow application = requireTutorApplicationForStudent(applicationId, currentUserId);
    if (!isTutorApplicationCancellableStatus(application.status())) {
      throw new BusinessException("TUTOR_APPLICATION_CANCEL_STATUS_INVALID", "当前状态不可取消试课申请");
    }

    jdbcTemplate.update(
        """
            UPDATE tutor_applicant
            SET status = ?,
                updated_at = NOW()
            WHERE public_id = ?
              AND applicant_user_id = ?
              AND enabled = TRUE
            """,
        TUTOR_APPLICANT_STATUS_CANCELLED,
        applicationId,
        currentUserId
    );
    return findTutorDemand(application.demandPublicId());
  }

  /** 家长确认学生试课安排，后续由聊天或进行中流程继续承接。 */
  @Transactional
  public TutorDemand confirmTutorTrial(
      String demandId,
      String applicationId,
      ConfirmTutorTrialRequest request,
      String authorization
  ) {
    long currentUserId = clientSessionService.requireUserId(authorization);
    TutorDemandRow demand = requireTutorDemandForUpdate(demandId);
    if (demand.parentUserId() == null || !demand.parentUserId().equals(currentUserId)) {
      throw new BusinessException("TUTOR_TRIAL_PARENT_FORBIDDEN", "仅发布该家教需求的家长可以确认试课");
    }
    if (isClosedTutorDemandStatus(demand.status())) {
      throw new BusinessException("TUTOR_DEMAND_CLOSED", "该家教兼职已结束或已取消");
    }

    String trialScheduleText = tutorTrialScheduleText(request.trialStart(), request.trialEnd(), request.trialHalfDay());
    String studentAvailability = tutorApplicationAvailability(demand.id(), applicationId);
    assertTutorTrialScheduleWithinAvailability(trialScheduleText, studentAvailability);

    int updatedRows = jdbcTemplate.update(
        """
            UPDATE tutor_applicant
            SET trial_start = ?,
                trial_end = ?,
                trial_half_day = ?,
                status = ?,
                updated_at = NOW()
            WHERE tutor_demand_id = ?
              AND public_id = ?
              AND status IN (?, ?, ?, ?)
              AND enabled = TRUE
            """,
        request.trialStart(),
        request.trialEnd(),
        request.trialHalfDay(),
        TUTOR_APPLICANT_STATUS_TRIAL_CONFIRMED,
        demand.id(),
        applicationId,
        TUTOR_APPLICANT_STATUS_APPLICATION_PENDING,
        TUTOR_APPLICANT_STATUS_APPLICATION_PENDING_LEGACY,
        TUTOR_APPLICANT_STATUS_TRIAL_CONFIRMED,
        TUTOR_APPLICANT_STATUS_TRIAL_CONFIRMED_LEGACY
    );
    if (updatedRows == 0) {
      throw new BusinessException("TUTOR_APPLICATION_NOT_FOUND", "试课申请不存在或无权操作");
    }
    return findTutorDemand(demand.publicId());
  }

  /** 学生确认家长提交的试课安排，申请状态进入试课中。 */
  @Transactional
  public TutorDemand confirmTutorTrialStart(String applicationId, String authorization) {
    long currentUserId = clientSessionService.requireUserId(authorization);
    ensureUserRole(currentUserId, ClientRole.student, "TUTOR_TRIAL_STUDENT_ONLY", "仅学生账号可以确认试课");
    TutorApplicationRow application = requireTutorApplicationForStudent(applicationId, currentUserId);
    if (!isTutorTrialScheduleConfirmingStatus(application.status())) {
      throw new BusinessException("TUTOR_TRIAL_STATUS_INVALID", "当前试课状态不可确认");
    }
    if (application.trialStart().isBlank() || application.trialEnd().isBlank() || application.trialHalfDay().isBlank()) {
      throw new BusinessException("TUTOR_TRIAL_SCHEDULE_REQUIRED", "家长尚未提交试课安排");
    }

    jdbcTemplate.update(
        """
            UPDATE tutor_applicant
            SET status = ?,
                updated_at = NOW()
            WHERE public_id = ?
              AND applicant_user_id = ?
              AND enabled = TRUE
            """,
        TUTOR_APPLICANT_STATUS_TRIALING,
        applicationId,
        currentUserId
    );
    return findTutorDemand(application.demandPublicId());
  }

  /** 学生发起结束试课确认，等待家长处理。 */
  @Transactional
  public TutorDemand requestTutorTrialEnd(String applicationId, String authorization) {
    long currentUserId = clientSessionService.requireUserId(authorization);
    ensureUserRole(currentUserId, ClientRole.student, "TUTOR_TRIAL_STUDENT_ONLY", "仅学生账号可以发起结束试课");
    TutorApplicationRow application = requireTutorApplicationForStudent(applicationId, currentUserId);
    if (!TUTOR_APPLICANT_STATUS_TRIALING.equals(application.status())) {
      throw new BusinessException("TUTOR_TRIAL_STATUS_INVALID", "只有试课中的家教可以发起结束试课");
    }

    jdbcTemplate.update(
        """
            UPDATE tutor_applicant
            SET status = ?,
                updated_at = NOW()
            WHERE public_id = ?
              AND applicant_user_id = ?
              AND enabled = TRUE
            """,
        TUTOR_APPLICANT_STATUS_TRIAL_END_CONFIRMING,
        applicationId,
        currentUserId
    );
    return findTutorDemand(application.demandPublicId());
  }

  /** 家长同意结束试课，旧入口也必须先进入学生费用确认，避免跳过试课结算闭环。 */
  @Transactional
  public TutorDemand completeTutorTrialEnd(
      String demandId,
      String applicationId,
      CompleteTutorTrialEndRequest request,
      String authorization
  ) {
    long currentUserId = clientSessionService.requireUserId(authorization);
    TutorWorkflowRow application = requireTutorApplicationForWorkflow(applicationId);
    ensureTutorParent(application, currentUserId);
    requireTutorApplicationStatus(
        application.status(),
        "TUTOR_TRIAL_END_STATUS_INVALID",
        "当前状态不可处理结束试课",
        TUTOR_APPLICANT_STATUS_TRIALING,
        TUTOR_APPLICANT_STATUS_TRIAL_END_CONFIRMING,
        TUTOR_APPLICANT_STATUS_TRIAL_RESULT_PROCESSING
    );

    if (TUTOR_APPLICANT_STATUS_TRIAL_RESULT_PROCESSING.equals(application.status()) && (request == null || request.trialFee() == null)) {
      updateTutorTrialSettlementDecision(application.id(), request == null ? null : request.hireTutor());
    } else {
      updateTutorTrialResult(application.id(), request == null ? null : request.trialFee(), request == null ? null : request.hireTutor());
    }
    return findTutorDemand(application.demandPublicId());
  }

  /** 按流程图推进家教申请、试课、正式雇佣、兼职日程和结算状态。 */
  @Transactional
  public TutorDemand handleTutorWorkflowAction(
      String applicationId,
      TutorWorkflowActionRequest request,
      String authorization
  ) {
    long currentUserId = clientSessionService.requireUserId(authorization);
    TutorWorkflowRow application = requireTutorApplicationForWorkflow(applicationId);
    String action = request == null ? "" : clean(request.action());
    if (action.isBlank()) {
      throw new BusinessException("TUTOR_WORKFLOW_ACTION_REQUIRED", "家教流程动作不能为空");
    }

    switch (action) {
      case "reject_trial" -> {
        ensureTutorParent(application, currentUserId);
        requireTutorApplicationStatus(
            application.status(),
            "TUTOR_TRIAL_REJECT_STATUS_INVALID",
            "只有申请试课中的记录可以拒绝",
            TUTOR_APPLICANT_STATUS_APPLICATION_PENDING,
            TUTOR_APPLICANT_STATUS_APPLICATION_PENDING_LEGACY
        );
        updateTutorApplicationStatus(application.id(), TUTOR_APPLICANT_STATUS_REJECTED);
      }
      case "cancel_trial" -> {
        ensureTutorParent(application, currentUserId);
        requireTutorApplicationStatus(
            application.status(),
            "TUTOR_TRIAL_CANCEL_STATUS_INVALID",
            "只有待处理或待学生确认的试课可以取消",
            TUTOR_APPLICANT_STATUS_APPLICATION_PENDING,
            TUTOR_APPLICANT_STATUS_APPLICATION_PENDING_LEGACY,
            TUTOR_APPLICANT_STATUS_TRIAL_CONFIRMED,
            TUTOR_APPLICANT_STATUS_TRIAL_CONFIRMED_LEGACY
        );
        updateTutorApplicationStatus(application.id(), TUTOR_APPLICANT_STATUS_CANCELLED);
      }
      case "request_trial_result" -> {
        ensureTutorParent(application, currentUserId);
        requireTutorApplicationStatus(application.status(), "TUTOR_TRIAL_STATUS_INVALID", "只有试课中的家教可以结束试课", TUTOR_APPLICANT_STATUS_TRIALING);
        updateTutorTrialResult(application.id(), request == null ? null : request.trialFee(), request == null ? null : request.hireTutor());
      }
      case "confirm_trial_end" -> {
        ensureTutorParent(application, currentUserId);
        requireTutorApplicationStatus(application.status(), "TUTOR_TRIAL_END_STATUS_INVALID", "只有结束试课确认中的记录可以确认", TUTOR_APPLICANT_STATUS_TRIAL_END_CONFIRMING);
        updateTutorTrialResult(application.id(), request == null ? null : request.trialFee(), request == null ? null : request.hireTutor());
      }
      case "offer_service" -> {
        ensureTutorParent(application, currentUserId);
        requireTutorApplicationStatus(
            application.status(),
            "TUTOR_TRIAL_RESULT_STATUS_INVALID",
            "只有试课已结算、旧结果处理或已拒绝正式委托的记录可以发起正式雇佣",
            TUTOR_APPLICANT_STATUS_TRIAL_RESULT_PROCESSING,
            TUTOR_APPLICANT_STATUS_TRIAL_SETTLED_SERVICE_PENDING,
            TUTOR_APPLICANT_STATUS_FORMAL_SERVICE_INVALID
        );
        updateTutorApplicationStatusForServiceConfirmation(application.id(), TUTOR_APPLICANT_STATUS_SERVICE_CONFIRMING);
      }
      case "remove_rejected_service_offer" -> {
        ensureTutorParent(application, currentUserId);
        requireTutorApplicationStatus(
            application.status(),
            "TUTOR_REJECTED_SERVICE_REMOVE_STATUS_INVALID",
            "只有已拒绝正式委托的记录可以移除",
            TUTOR_APPLICANT_STATUS_FORMAL_SERVICE_INVALID
        );
        updateTutorApplicationStatus(application.id(), TUTOR_APPLICANT_STATUS_TRIAL_ENDED);
      }
      case "cancel_service_confirmation" -> {
        ensureTutorWorkflowOwner(application, currentUserId);
        requireTutorApplicationStatus(
            application.status(),
            "TUTOR_SERVICE_CONFIRMATION_CANCEL_STATUS_INVALID",
            "只有正式雇佣确认中或正式雇佣日程确认中的记录可以取消兼职确认",
            TUTOR_APPLICANT_STATUS_SERVICE_CONFIRMING,
            TUTOR_APPLICANT_STATUS_SERVICE_SCHEDULE_PENDING,
            TUTOR_APPLICANT_STATUS_SERVICE_SCHEDULE_PENDING_LEGACY,
            TUTOR_APPLICANT_STATUS_SERVICE_SCHEDULE_CONFIRMING_LEGACY
        );
        cancelTutorServiceConfirmation(application, currentUserId);
      }
      case "close_trial_continue_recruiting" -> {
        ensureTutorParent(application, currentUserId);
        requireTutorApplicationStatus(
            application.status(),
            "TUTOR_TRIAL_RESULT_STATUS_INVALID",
            "只有试课已结算且等待正式雇佣的记录可以结束本次试课",
            TUTOR_APPLICANT_STATUS_TRIAL_RESULT_PROCESSING,
            TUTOR_APPLICANT_STATUS_TRIAL_SETTLED_SERVICE_PENDING
        );
        updateTutorApplicationStatus(application.id(), TUTOR_APPLICANT_STATUS_TRIAL_ENDED);
      }
      case "close_trial_end_demand" -> {
        ensureTutorParent(application, currentUserId);
        requireTutorApplicationStatus(
            application.status(),
            "TUTOR_TRIAL_RESULT_STATUS_INVALID",
            "只有试课结果处理或已结束本次试课的记录可以结束家教兼职",
            TUTOR_APPLICANT_STATUS_TRIAL_RESULT_PROCESSING,
            TUTOR_APPLICANT_STATUS_TRIAL_ENDED
        );
        closeTutorDemandAfterTrialResult(application);
      }
      case "request_trial_settlement" -> {
        ensureTutorParent(application, currentUserId);
        requireTutorApplicationStatus(application.status(), "TUTOR_TRIAL_SETTLEMENT_STATUS_INVALID", "只有试课结果处理中的记录可以发起结算确认", TUTOR_APPLICANT_STATUS_TRIAL_RESULT_PROCESSING);
        updateTutorApplicationStatus(application.id(), TUTOR_APPLICANT_STATUS_SETTLEMENT_CONFIRMING);
      }
      case "update_trial_availability" -> {
        ensureTutorStudent(application, currentUserId);
        requireTutorApplicationStatus(
            application.status(),
            "TUTOR_TRIAL_AVAILABILITY_STATUS_INVALID",
            "只有试课日程确认中的记录可以修改可试课时间",
            TUTOR_APPLICANT_STATUS_TRIAL_CONFIRMED,
            TUTOR_APPLICANT_STATUS_TRIAL_CONFIRMED_LEGACY
        );
        updateTutorApplicationAvailabilityAndStatus(application.id(), request == null ? "" : clean(request.availability()), TUTOR_APPLICANT_STATUS_APPLICATION_PENDING);
      }
      case "submit_service_schedule" -> {
        ensureTutorParent(application, currentUserId);
        requireTutorApplicationStatus(
            application.status(),
            "TUTOR_SERVICE_SCHEDULE_STATUS_INVALID",
            "当前状态不可提交兼职日程",
            TUTOR_APPLICANT_STATUS_SERVICE_SCHEDULE_PENDING,
            TUTOR_APPLICANT_STATUS_SERVICE_SCHEDULE_PENDING_LEGACY,
            TUTOR_APPLICANT_STATUS_SERVICE_SCHEDULE_CONFIRMING_LEGACY
        );
        String tutorSchedule = request == null ? "" : clean(request.tutorSchedule());
        assertTutorServiceScheduleWithinAvailability(tutorSchedule, tutorApplicationAvailability(application.demandId(), application.publicId()));
        updateTutorApplicationSchedule(application.id(), tutorSchedule, TUTOR_APPLICANT_STATUS_FORMAL_SERVICE);
        updateTutorDemandStatus(application.demandId(), TUTOR_DEMAND_STATUS_IN_PROGRESS);
        endOtherActiveTutorApplicationsAfterFormalHire(application.demandId(), application.publicId());
      }
      case "resubmit_settlement" -> {
        ensureTutorParent(application, currentUserId);
        requireTutorApplicationStatus(application.status(), "TUTOR_SETTLEMENT_STATUS_INVALID", "只有结算修改中的记录可以重新提交", TUTOR_APPLICANT_STATUS_SETTLEMENT_REVISING);
        updateTutorApplicationStatus(application.id(), TUTOR_APPLICANT_STATUS_SETTLEMENT_CONFIRMING);
      }
      case "request_service_end" -> {
        ensureTutorWorkflowOwner(application, currentUserId);
        requireTutorApplicationStatus(
            application.status(),
            "TUTOR_SERVICE_END_STATUS_INVALID",
            "只有进行中的家教兼职可以发起结束",
            TUTOR_APPLICANT_STATUS_SERVICE_SCHEDULE_PENDING,
            TUTOR_APPLICANT_STATUS_SERVICE_SCHEDULE_PENDING_LEGACY,
            TUTOR_APPLICANT_STATUS_FORMAL_SERVICE,
            TUTOR_APPLICANT_STATUS_TUTORING_LEGACY
        );
        updateTutorApplicationStatus(application.id(), TUTOR_APPLICANT_STATUS_SETTLEMENT_CONFIRMING);
      }
      case "accept_service_offer" -> {
        ensureTutorStudent(application, currentUserId);
        requireTutorApplicationStatus(application.status(), "TUTOR_SERVICE_OFFER_STATUS_INVALID", "只有正式雇佣确认中的记录可以同意", TUTOR_APPLICANT_STATUS_SERVICE_CONFIRMING);
        updateTutorApplicationAvailabilityAndStatus(application.id(), requireTutorServiceAvailability(request), TUTOR_APPLICANT_STATUS_SERVICE_SCHEDULE_PENDING);
        updateTutorDemandStatus(application.demandId(), TUTOR_DEMAND_STATUS_IN_PROGRESS);
      }
      case "reject_service_offer_salary" -> {
        ensureTutorStudent(application, currentUserId);
        requireTutorApplicationStatus(application.status(), "TUTOR_SERVICE_OFFER_STATUS_INVALID", "只有正式雇佣确认中的记录可以反馈薪资原因", TUTOR_APPLICANT_STATUS_SERVICE_CONFIRMING);
        updateTutorApplicationStatus(application.id(), TUTOR_APPLICANT_STATUS_SERVICE_CONFIRMING);
      }
      case "reject_service_offer" -> {
        ensureTutorStudent(application, currentUserId);
        requireTutorApplicationStatus(application.status(), "TUTOR_SERVICE_OFFER_STATUS_INVALID", "只有正式雇佣确认中的记录可以拒绝", TUTOR_APPLICANT_STATUS_SERVICE_CONFIRMING);
        updateTutorApplicationStatus(application.id(), TUTOR_APPLICANT_STATUS_FORMAL_SERVICE_INVALID);
      }
      case "confirm_service_schedule" -> {
        ensureTutorStudent(application, currentUserId);
        requireTutorApplicationStatus(application.status(), "TUTOR_SERVICE_SCHEDULE_STATUS_INVALID", "当前正式雇佣日程不需要学生再次确认", TUTOR_APPLICANT_STATUS_SERVICE_SCHEDULE_CONFIRMING_LEGACY);
        updateTutorApplicationStatus(application.id(), TUTOR_APPLICANT_STATUS_FORMAL_SERVICE);
        updateTutorDemandStatus(application.demandId(), TUTOR_DEMAND_STATUS_IN_PROGRESS);
        endOtherActiveTutorApplicationsAfterFormalHire(application.demandId(), application.publicId());
      }
      case "request_service_schedule_change" -> {
        ensureTutorStudent(application, currentUserId);
        requireTutorApplicationStatus(application.status(), "TUTOR_SERVICE_SCHEDULE_STATUS_INVALID", "只有旧版兼职日程确认中的记录可以要求修改", TUTOR_APPLICANT_STATUS_SERVICE_SCHEDULE_CONFIRMING_LEGACY);
        updateTutorApplicationAvailabilityAndStatus(application.id(), requireTutorServiceAvailability(request), TUTOR_APPLICANT_STATUS_SERVICE_SCHEDULE_PENDING);
      }
      case "confirm_settlement" -> {
        ensureTutorStudent(application, currentUserId);
        requireTutorApplicationStatus(application.status(), "TUTOR_SETTLEMENT_STATUS_INVALID", "只有结算确认中的记录可以确认结算", TUTOR_APPLICANT_STATUS_SETTLEMENT_CONFIRMING);
        if (isFormalTutorDemandStatus(application.demandStatus())) {
          updateTutorApplicationStatus(application.id(), TUTOR_APPLICANT_STATUS_ENDED);
          updateTutorDemandStatus(application.demandId(), TUTOR_DEMAND_STATUS_ENDED);
        } else if (TUTOR_TRIAL_HIRE_DECISION_HIRE.equals(application.trialHireDecision())) {
          updateTutorApplicationStatus(application.id(), TUTOR_APPLICANT_STATUS_SERVICE_CONFIRMING);
        } else if (TUTOR_TRIAL_HIRE_DECISION_NOT_HIRE.equals(application.trialHireDecision())) {
          updateTutorApplicationStatus(application.id(), TUTOR_APPLICANT_STATUS_TRIAL_ENDED);
        } else {
          updateTutorApplicationStatus(application.id(), TUTOR_APPLICANT_STATUS_TRIAL_SETTLED_SERVICE_PENDING);
        }
      }
      case "request_settlement_revision" -> {
        ensureTutorStudent(application, currentUserId);
        requireTutorApplicationStatus(application.status(), "TUTOR_SETTLEMENT_STATUS_INVALID", "只有结算确认中的记录可以要求修改", TUTOR_APPLICANT_STATUS_SETTLEMENT_CONFIRMING);
        updateTutorApplicationStatus(application.id(), TUTOR_APPLICANT_STATUS_SETTLEMENT_REVISING);
      }
      default -> throw new BusinessException("TUTOR_WORKFLOW_ACTION_INVALID", "不支持的家教流程动作");
    }

    return findTutorDemand(application.demandPublicId());
  }

  /**
   * 家长取消尚未进入试课安排的家教兼职，取消后保留为兼职订单历史。
   *
   * @param demandId 家教需求对外 ID
   * @param authorization 客户端登录访问令牌
   * @return 已取消的家教需求
   */
  @Transactional
  public TutorDemand cancelTutorDemand(String demandId, String authorization) {
    long currentUserId = clientSessionService.requireUserId(authorization);
    TutorDemandRow demand = requireTutorDemandForUpdate(demandId);
    if (demand.parentUserId() == null || !demand.parentUserId().equals(currentUserId)) {
      throw new BusinessException("TUTOR_DEMAND_CANCEL_PARENT_FORBIDDEN", "仅发布该家教兼职的家长可以取消");
    }
    if (isClosedTutorDemandStatus(demand.status())) {
      throw new BusinessException("TUTOR_DEMAND_ALREADY_CLOSED", "该家教兼职已结束或已取消");
    }
    if (hasTutorTrialSchedule(demand.id())) {
      throw new BusinessException("TUTOR_DEMAND_TRIAL_SCHEDULED", "已有试课安排的家教兼职不能直接取消");
    }

    jdbcTemplate.update(
        """
            UPDATE tutor_demand
            SET status = ?,
                updated_at = NOW()
            WHERE id = ?
            """,
        TUTOR_DEMAND_STATUS_CANCELLED,
        demand.id()
    );
    jdbcTemplate.update(
        """
            UPDATE tutor_applicant
            SET status = ?,
                updated_at = NOW()
            WHERE tutor_demand_id = ?
              AND enabled = TRUE
            """,
        TUTOR_APPLICANT_STATUS_CANCELLED,
        demand.id()
    );
    return findTutorDemand(demand.publicId());
  }

  /** 创建狩猎项目并根据动线粗略计算系统推荐委托数量。 */
  @Transactional
  public HuntingProjectResponse createHuntingProject(CreateHuntingProjectRequest request, String authorization) {
    long currentUserId = clientSessionService.requireUserId(authorization);
    ensureUserRole(currentUserId, ClientRole.student, "HUNTING_PROJECT_STUDENT_ONLY", "仅学生账号可以创建狩猎项目");
    String publicId = nextHuntingProjectPublicId();
    List<HuntingProjectStopResponse> stops = normalizedHuntingProjectStops(request.nextStops());
    int matchedCount = matchedHuntingTaskCount(request.currentArea(), stops);
    Long projectId = jdbcTemplate.queryForObject(
        """
            INSERT INTO hunting_project (public_id, user_id, current_area, matched_count, updated_at)
            VALUES (?, ?, ?, ?, NOW())
            RETURNING id
            """,
        Long.class,
        publicId,
        currentUserId,
        request.currentArea().strip(),
        matchedCount
    );

    for (int index = 0; index < stops.size(); index += 1) {
      HuntingProjectStopResponse stop = stops.get(index);
      jdbcTemplate.update(
          """
              INSERT INTO hunting_project_stop (
                project_id, sort_order, input_mode, area, custom_area, eta_start, eta_end
              )
              VALUES (?, ?, ?, ?, ?, ?, ?)
              """,
          projectId,
          index,
          stop.inputMode(),
          stop.area(),
          stop.customArea(),
          stop.etaStart(),
          stop.etaEnd()
      );
    }

    return new HuntingProjectResponse(publicId, request.currentArea().strip(), "matching", matchedCount, stops);
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

    orders.addAll(tutorOrders(role, currentUserId));
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
    return new ClientOrder(
        orderNo,
        role,
        title,
        status,
        toAmount(amountCents),
        contactPhone,
        detail == null ? "" : detail,
        risk,
        null,
        null,
        contactPhone,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null
    );
  }

  /** 将家教需求和试课申请并入进行中列表，避免 H5 只维护本地临时订单。 */
  private List<ClientOrder> tutorOrders(ClientRole role, Long currentUserId) {
    if (currentUserId == null || role == ClientRole.merchant) {
      return List.of();
    }

    if (role == ClientRole.parent) {
      return jdbcTemplate.query(
          """
              SELECT td.public_id, td.title, td.child, td.subject, td.budget, td.status, td.address_label,
                     td.period_start, td.period_end,
                     (
                       SELECT COUNT(*)
                       FROM tutor_applicant ta
                       WHERE ta.tutor_demand_id = td.id
                         AND ta.enabled = TRUE
                         AND ta.status IN ('申请试课中', '等待家长确认试课')
                     ) AS applicant_count,
                     (
                       SELECT COUNT(*)
                       FROM tutor_applicant ta
                       WHERE ta.tutor_demand_id = td.id
                        AND ta.enabled = TRUE
                        AND ta.status IN (
                           '试课日程确认中', '试课确认中', '试课中', '结束试课确认中', '试课结果处理',
                           '结算确认中', '结算修改中', '试课已结算', '试课已结算+雇佣确认中', '正式雇佣确认中', '家教服务确认中', '正式雇佣日程确认中', '兼职日程待提交', '兼职日程确认中', '正式雇佣', '正式家教服务', '家教进行中',
                           '正式雇佣失效'
                         )
                     ) AS trialing_count,
                     EXISTS (
                       SELECT 1
                       FROM tutor_applicant ta
                       WHERE ta.tutor_demand_id = td.id
                         AND ta.enabled = TRUE
                         AND ta.status NOT IN ('已取消', '已结束', '已拒绝')
                         AND COALESCE(NULLIF(ta.trial_start, ''), '') <> ''
                         AND COALESCE(NULLIF(ta.trial_end, ''), '') <> ''
                         AND COALESCE(NULLIF(ta.trial_half_day, ''), '') <> ''
                     ) AS has_trial_schedule,
                     (
                       SELECT ta.public_id
                       FROM tutor_applicant ta
                       WHERE ta.tutor_demand_id = td.id
                         AND ta.enabled = TRUE
                         AND ta.status IN (
                           '正式雇佣日程确认中', '兼职日程待提交', '兼职日程确认中',
                           '正式雇佣', '正式家教服务', '家教进行中'
                         )
                       ORDER BY ta.updated_at DESC, ta.id DESC
                       LIMIT 1
                     ) AS active_application_public_id,
                     (
                       SELECT COALESCE(NULLIF(ta.trial_half_day, ''), '')
                       FROM tutor_applicant ta
                       WHERE ta.tutor_demand_id = td.id
                         AND ta.enabled = TRUE
                         AND ta.status IN (
                           '正式雇佣日程确认中', '兼职日程待提交', '兼职日程确认中',
                           '正式雇佣', '正式家教服务', '家教进行中'
                         )
                       ORDER BY ta.updated_at DESC, ta.id DESC
                       LIMIT 1
                     ) AS active_application_schedule
              FROM tutor_demand td
              WHERE td.parent_user_id = ?
                AND td.enabled = TRUE
              ORDER BY td.created_at DESC, td.id DESC
              """,
          (rs, rowNum) -> {
            String status = rs.getString("status");
            boolean isClosed = isClosedTutorDemandStatus(status);
            boolean hasTrialSchedule = rs.getBoolean("has_trial_schedule");
            int applicantCount = rs.getInt("applicant_count");
            boolean hasTrialingTutor = rs.getInt("trialing_count") > 0;
            String activeApplicationPublicId = defaultText(rs.getString("active_application_public_id"), "");
            String activeApplicationSchedule = defaultText(rs.getString("active_application_schedule"), "");
            boolean isDemandInProgress = isFormalTutorDemandStatus(status) || !activeApplicationPublicId.isBlank();
            String displayStatus = isDemandInProgress ? TUTOR_DEMAND_STATUS_IN_PROGRESS : tutorDemandOrderStatus(status);
            return new ClientOrder(
                rs.getString("public_id"),
                role,
                defaultText(rs.getString("title"), rs.getString("child") + rs.getString("subject") + "家教"),
                displayStatus,
                BigDecimal.ZERO,
                "孩子：" + rs.getString("child"),
                "周期：" + defaultText(rs.getString("period_start"), "待定") + " 至 "
                    + defaultText(rs.getString("period_end"), "待定") + " · 地址："
                    + defaultText(rs.getString("address_label"), "地址待补充") + " · 学科：" + rs.getString("subject")
                    + (activeApplicationSchedule.isBlank() ? "" : " · 课程安排：" + activeApplicationSchedule),
                null,
                rs.getString("budget"),
                "tutor",
                null,
                null,
                rs.getInt("applicant_count"),
                rs.getInt("trialing_count"),
                null,
                activeApplicationPublicId,
                !isClosed && !isDemandInProgress,
                !isClosed && !isDemandInProgress,
                !isClosed && !hasTrialSchedule && !isDemandInProgress,
                isDemandInProgress && !activeApplicationPublicId.isBlank(),
                false,
                false,
                false,
                false,
                false,
                isDemandInProgress && !activeApplicationPublicId.isBlank(),
                !isDemandInProgress && hasTrialingTutor,
                !isDemandInProgress && !isClosed && applicantCount > 0,
                false,
                false
            );
          },
          currentUserId
      );
    }

    return jdbcTemplate.query(
        """
            SELECT ta.public_id, ta.status, ta.availability, ta.trial_fee_cents, ta.trial_start, ta.trial_end, ta.trial_half_day,
                   td.title, td.subject, td.budget, td.address_label, td.period_start, td.period_end,
                   COALESCE(NULLIF(parent.nickname, ''), '未设置昵称') AS parent_nickname,
                   COALESCE(parent.phone, '') AS parent_phone
            FROM tutor_applicant ta
            JOIN tutor_demand td ON td.id = ta.tutor_demand_id
            LEFT JOIN app_user parent ON parent.id = td.parent_user_id
            WHERE ta.applicant_user_id = ?
              AND ta.enabled = TRUE
              AND td.enabled = TRUE
              AND td.status NOT IN (?, ?)
              AND ta.status NOT IN (?, ?, ?, ?, ?)
            ORDER BY ta.updated_at DESC, ta.id DESC
            """,
        (rs, rowNum) -> {
          String status = rs.getString("status");
          boolean hasTrialSchedule = !defaultText(rs.getString("trial_start"), "").isBlank()
              && !defaultText(rs.getString("trial_end"), "").isBlank()
              && !defaultText(rs.getString("trial_half_day"), "").isBlank();
          boolean isTrialConfirmed = isTutorTrialScheduleConfirmingStatus(status);
          boolean isTrialing = TUTOR_APPLICANT_STATUS_TRIALING.equals(status);
          boolean isFormalService = isFormalTutorApplicationStatus(status);
          boolean isSettlementConfirming = TUTOR_APPLICANT_STATUS_SETTLEMENT_CONFIRMING.equals(status);
          boolean isApplicationPending = isTutorApplicationPendingStatus(status);
          boolean canCancelTutorApplication = isApplicationPending || isTrialConfirmed;
          String trialScheduleText = hasTrialSchedule
              ? tutorTrialScheduleText(rs.getString("trial_start"), rs.getString("trial_end"), rs.getString("trial_half_day"))
              : "";
          String availabilityLabel = isTutorServiceAvailabilityStatus(status) ? "可家教时间：" : "可试课时间：";
          String orderDetail = "试课申请 · " + rs.getString("subject") + " · "
              + defaultText(rs.getString("period_start"), "待定") + " 至 "
              + defaultText(rs.getString("period_end"), "待定") + " · "
              + defaultText(rs.getString("address_label"), "地址待补充")
              + " · " + availabilityLabel + defaultText(rs.getString("availability"), "待补充")
              + " · 试课结算金额：" + toAmount(rs.getLong("trial_fee_cents"))
              + (trialScheduleText.isBlank() ? "" : " · 试课安排：" + trialScheduleText);
          return new ClientOrder(
              rs.getString("public_id"),
              role,
              rs.getString("title"),
              status,
              BigDecimal.ZERO,
              rs.getString("parent_nickname"),
              orderDetail,
              null,
              rs.getString("budget"),
              "tutor",
              maskPhone(rs.getString("parent_phone")),
              null,
              null,
              null,
              null,
              null,
              !isTutorApplicationTerminalStatus(status),
              !isTutorApplicationTerminalStatus(status),
              false,
              isTrialing || isFormalService,
              false,
              false,
              false,
              isTrialConfirmed && hasTrialSchedule,
              isSettlementConfirming,
              isTrialConfirmed && hasTrialSchedule,
              false,
              false,
              false,
              canCancelTutorApplication
          );
        },
        currentUserId,
        TUTOR_DEMAND_STATUS_CANCELLED,
        TUTOR_DEMAND_STATUS_ENDED,
        TUTOR_APPLICANT_STATUS_REJECTED,
        TUTOR_APPLICANT_STATUS_REJECTED_LEGACY,
        TUTOR_APPLICANT_STATUS_ENDED,
        TUTOR_APPLICANT_STATUS_CANCELLED,
        TUTOR_APPLICANT_STATUS_FORMAL_SERVICE_INVALID
    );
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
            new UserNickname(rs.getString("publisher_nickname"), maskPhone(rs.getString("publisher_phone"))),
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

  private List<HuntingTask> huntingTasks(Long currentUserId) {
    return jdbcTemplate.query(
        """
            SELECT ht.id, ht.public_id, ht.publisher_user_id, ht.accepted_user_id,
                   ht.title, ht.description, ht.mode, ht.fee_cents, ht.latest_time,
                   ht.location, ht.urgency, ht.status, ht.deposit_required, ht.deposit_cents,
                   ht.fulfillment_action, ht.fulfillment_action_user_id,
                   TO_CHAR(ht.created_at AT TIME ZONE 'Asia/Shanghai', 'MM-DD HH24:MI') AS publish_time,
                   (
                     SELECT COUNT(*)
                     FROM hunting_task_quote hq
                     WHERE hq.hunting_task_id = ht.id
                       AND hq.status IN ('待确认', ?, ?)
                   ) AS quote_count,
                   (
                     CAST(? AS BIGINT) IS NOT NULL
                     AND EXISTS (
                       SELECT 1
                       FROM hunting_task_quote hq
                       WHERE hq.hunting_task_id = ht.id
                         AND hq.quote_user_id = CAST(? AS BIGINT)
                         AND hq.status IN ('待确认', ?, ?, ?)
                     )
                   ) AS is_quoted_by_me,
                   (
                     SELECT hq.public_id
                     FROM hunting_task_quote hq
                     WHERE hq.hunting_task_id = ht.id
                       AND hq.quote_user_id = CAST(? AS BIGINT)
                       AND hq.status IN ('待确认', ?, ?, ?)
                     ORDER BY hq.updated_at DESC, hq.id DESC
                     LIMIT 1
                   ) AS pending_quote_id,
                   (
                     SELECT hq.amount_cents
                     FROM hunting_task_quote hq
                     WHERE hq.hunting_task_id = ht.id
                       AND hq.quote_user_id = CAST(? AS BIGINT)
                       AND hq.status IN ('待确认', ?, ?, ?)
                     ORDER BY hq.updated_at DESC, hq.id DESC
                     LIMIT 1
                   ) AS pending_quote_amount_cents,
                   (
                     SELECT hq.status
                     FROM hunting_task_quote hq
                     WHERE hq.hunting_task_id = ht.id
                       AND hq.quote_user_id = CAST(? AS BIGINT)
                       AND hq.status IN ('待确认', ?, ?, ?)
                     ORDER BY hq.updated_at DESC, hq.id DESC
                     LIMIT 1
                   ) AS pending_quote_status
            FROM hunting_task ht
            WHERE ht.enabled = TRUE
               OR (
                 CAST(? AS BIGINT) IS NOT NULL
                 AND ht.status IN (?, ?)
                 AND (
                   ht.publisher_user_id = CAST(? AS BIGINT)
                   OR ht.accepted_user_id = CAST(? AS BIGINT)
                   OR EXISTS (
                     SELECT 1
                     FROM hunting_task_quote hq
                     WHERE hq.hunting_task_id = ht.id
                       AND hq.quote_user_id = CAST(? AS BIGINT)
                   )
                 )
               )
            ORDER BY ht.updated_at DESC, ht.created_at DESC, ht.id DESC
            """,
        (rs, rowNum) -> {
          long rowId = rs.getLong("id");
          long feeCents = rs.getLong("fee_cents");
          String status = normalizeHuntingTaskStatus(rs.getString("status"));
          Long publisherUserId = rs.getObject("publisher_user_id", Long.class);
          Long acceptedUserId = rs.getObject("accepted_user_id", Long.class);
          Long fulfillmentActionUserId = rs.getObject("fulfillment_action_user_id", Long.class);
          Long pendingQuoteAmountCents = rs.getObject("pending_quote_amount_cents", Long.class);
          boolean isMine = currentUserId != null && currentUserId.equals(publisherUserId);
          boolean isQuotedByMe = rs.getBoolean("is_quoted_by_me");
          return new HuntingTask(
              rs.getString("public_id"),
              rs.getString("title"),
              rs.getString("description"),
              rs.getString("mode"),
              toAmount(feeCents),
              rs.getString("latest_time"),
              rs.getString("location"),
              rs.getString("urgency"),
              status,
              rs.getString("publish_time"),
              rs.getString("location"),
              rs.getString("urgency"),
              Arrays.stream(rs.getString("urgency").split("、"))
                  .map(String::strip)
                  .filter((item) -> !item.isBlank())
                  .toList(),
              userNickname(publisherUserIdOrFallback(publisherUserId)),
              acceptedUserId == null ? null : userNickname(acceptedUserId),
              isMine,
              currentUserId != null && currentUserId.equals(acceptedUserId),
              isQuotedByMe,
              pendingQuoteAmountCents == null ? null : toAmount(pendingQuoteAmountCents),
              rs.getString("pending_quote_id"),
              rs.getString("pending_quote_status"),
              rs.getString("fulfillment_action"),
              currentUserId != null && currentUserId.equals(fulfillmentActionUserId),
              feeCents == 0 && isHuntingQuoteStatus(status),
              rs.getBoolean("deposit_required"),
              toAmount(rs.getLong("deposit_cents")),
              rs.getInt("quote_count"),
              huntingQuotes(rowId, isMine, isQuotedByMe, currentUserId)
          );
        },
        QUOTE_WAITING_PUBLISHER,
        QUOTE_WAITING_HUNTER,
        currentUserId,
        currentUserId,
        QUOTE_WAITING_PUBLISHER,
        QUOTE_WAITING_HUNTER,
        QUOTE_CONFIRMED,
        currentUserId,
        QUOTE_WAITING_PUBLISHER,
        QUOTE_WAITING_HUNTER,
        QUOTE_CONFIRMED,
        currentUserId,
        QUOTE_WAITING_PUBLISHER,
        QUOTE_WAITING_HUNTER,
        QUOTE_CONFIRMED,
        currentUserId,
        QUOTE_WAITING_PUBLISHER,
        QUOTE_WAITING_HUNTER,
        QUOTE_CONFIRMED,
        currentUserId,
        TASK_COMPLETED,
        TASK_CANCELLED,
        currentUserId,
        currentUserId,
        currentUserId
    );
  }

  private List<TutorDemand> tutorDemands(ClientRole role, Long currentUserId) {
    if (role == ClientRole.parent) {
      List<TutorDemand> demands = new ArrayList<>(tutorExposedStudents());
      demands.addAll(parentTutorDemands(currentUserId));
      return demands;
    }

    return publishedTutorDemands();
  }

  /** 家长端家教列表展示已开启家教开关且认证通过的学生信息。 */
  private List<TutorDemand> tutorExposedStudents() {
    return jdbcTemplate.query(
        """
            SELECT id, COALESCE(NULLIF(nickname, ''), '未设置昵称') AS nickname,
                   phone, credit_score
            FROM app_user
            WHERE role = 'student'
              AND tutor_certification_status = 'normal'
              AND tutor_exposure_enabled = TRUE
            ORDER BY credit_score DESC, updated_at DESC, id DESC
            """,
        (rs, rowNum) -> new TutorDemand(
            "student-" + rs.getLong("id"),
            rs.getString("nickname"),
            "已开启家教",
            "认证学生",
            "可沟通",
            "可联系",
            rs.getString("nickname") + "的家教资料",
            "该学生已开启家教开关，认证信息可被家长查看。",
            "平台认证",
            "长期可沟通",
            new UserNickname(rs.getString("nickname"), maskPhone(rs.getString("phone"))),
            "tutorStudent",
            List.of()
        )
    );
  }


  /** 家长本人发布的家教需求，仅用于进行中申请列表数据，不在家教主列表直接展示。 */
  private List<TutorDemand> parentTutorDemands(Long parentUserId) {
    if (parentUserId == null) {
      return List.of();
    }
    return jdbcTemplate.query(
        """
            SELECT td.id, td.public_id, td.child, td.subject, td.school, td.budget, td.status,
                   td.title, td.description, td.address_label, td.period_start, td.period_end,
                   COALESCE(NULLIF(u.nickname, ''), '未设置昵称') AS publisher_nickname,
                   COALESCE(u.phone, '') AS publisher_phone
            FROM tutor_demand td
            LEFT JOIN app_user u ON u.id = td.parent_user_id
            WHERE td.parent_user_id = ?
              AND td.enabled = TRUE
              AND td.status NOT IN (?, ?)
            ORDER BY td.created_at DESC, td.id DESC
            """,
        (rs, rowNum) -> new TutorDemand(
            rs.getString("public_id"),
            rs.getString("child"),
            rs.getString("subject"),
            rs.getString("school"),
            rs.getString("budget"),
            tutorDemandStatusLabel(rs.getString("status")),
            defaultText(rs.getString("title"), rs.getString("child") + rs.getString("subject") + "家教"),
            defaultText(rs.getString("description"), "暂无描述"),
            defaultText(rs.getString("address_label"), rs.getString("school")),
            tutorPeriod(rs.getString("period_start"), rs.getString("period_end")),
            new UserNickname(rs.getString("publisher_nickname"), maskPhone(rs.getString("publisher_phone"))),
            "tutorDemand",
            tutorApplicants(rs.getLong("id"))
        ),
        parentUserId,
        TUTOR_DEMAND_STATUS_CANCELLED,
        TUTOR_DEMAND_STATUS_ENDED
    );
  }

  /** 学生端兼职列表展示家长已发布的家教需求。 */
  private List<TutorDemand> publishedTutorDemands() {
    return jdbcTemplate.query(
        """
            SELECT td.id, td.public_id, td.child, td.subject, td.school, td.budget, td.status,
                   td.title, td.description, td.address_label, td.period_start, td.period_end,
                   COALESCE(NULLIF(u.nickname, ''), '未设置昵称') AS publisher_nickname,
                   COALESCE(u.phone, '') AS publisher_phone
            FROM tutor_demand td
            LEFT JOIN app_user u ON u.id = td.parent_user_id
            WHERE td.enabled = TRUE
              AND td.status IN (?, ?)
            ORDER BY td.created_at DESC, td.id DESC
            """,
        (rs, rowNum) -> new TutorDemand(
            rs.getString("public_id"),
            rs.getString("child"),
            rs.getString("subject"),
            rs.getString("school"),
            rs.getString("budget"),
            tutorDemandStatusLabel(rs.getString("status")),
            defaultText(rs.getString("title"), rs.getString("child") + rs.getString("subject") + "家教"),
            defaultText(rs.getString("description"), "暂无描述"),
            defaultText(rs.getString("address_label"), rs.getString("school")),
            tutorPeriod(rs.getString("period_start"), rs.getString("period_end")),
            new UserNickname(rs.getString("publisher_nickname"), maskPhone(rs.getString("publisher_phone"))),
            "tutorDemand",
            tutorApplicants(rs.getLong("id"))
        ),
        TUTOR_DEMAND_STATUS_RECRUITING,
        TUTOR_DEMAND_STATUS_RECRUITING_LEGACY
    );
  }

  private TutorDemand findTutorDemand(String publicId) {
    List<TutorDemand> demands = jdbcTemplate.query(
        """
            SELECT td.id, td.public_id, td.child, td.subject, td.school, td.budget, td.status,
                   td.title, td.description, td.address_label, td.period_start, td.period_end,
                   COALESCE(NULLIF(u.nickname, ''), '未设置昵称') AS publisher_nickname,
                   COALESCE(u.phone, '') AS publisher_phone
            FROM tutor_demand td
            LEFT JOIN app_user u ON u.id = td.parent_user_id
            WHERE td.public_id = ?
              AND td.enabled = TRUE
            LIMIT 1
            """,
        (rs, rowNum) -> new TutorDemand(
            rs.getString("public_id"),
            rs.getString("child"),
            rs.getString("subject"),
            rs.getString("school"),
            rs.getString("budget"),
            tutorDemandStatusLabel(rs.getString("status")),
            defaultText(rs.getString("title"), rs.getString("child") + rs.getString("subject") + "家教"),
            defaultText(rs.getString("description"), "暂无描述"),
            defaultText(rs.getString("address_label"), rs.getString("school")),
            tutorPeriod(rs.getString("period_start"), rs.getString("period_end")),
            new UserNickname(rs.getString("publisher_nickname"), maskPhone(rs.getString("publisher_phone"))),
            "tutorDemand",
            tutorApplicants(rs.getLong("id"))
        ),
        publicId
    );
    if (demands.isEmpty()) {
      throw new BusinessException("TUTOR_DEMAND_NOT_FOUND", "家教需求不存在或已不可用");
    }
    return demands.get(0);
  }

  private List<TutorApplicant> tutorApplicants(long tutorDemandId) {
    return jdbcTemplate.query(
        """
            SELECT ta.public_id,
                   COALESCE(NULLIF(u.nickname, ''), '未设置昵称') AS nickname,
                   ta.school, ta.major, ta.gpa, ta.hired_times, ta.availability, ta.status,
                   ta.trial_fee_cents,
                   COALESCE(ta.trial_start, '') AS trial_start,
                   COALESCE(ta.trial_end, '') AS trial_end,
                   COALESCE(ta.trial_half_day, '') AS trial_half_day,
                   COALESCE(ta.service_confirmation_cancelled_by, '') AS service_confirmation_cancelled_by
            FROM tutor_applicant ta
            LEFT JOIN app_user u ON u.id = ta.applicant_user_id
            WHERE ta.tutor_demand_id = ?
              AND ta.enabled = TRUE
            ORDER BY ta.hired_times DESC, ta.id
            """,
        (rs, rowNum) -> {
          String trialSchedule = "";
          if (!defaultText(rs.getString("trial_start"), "").isBlank()
              && !defaultText(rs.getString("trial_end"), "").isBlank()
              && !defaultText(rs.getString("trial_half_day"), "").isBlank()) {
            trialSchedule = tutorTrialScheduleText(
                rs.getString("trial_start"),
                rs.getString("trial_end"),
                rs.getString("trial_half_day")
            );
          }

          return new TutorApplicant(
              rs.getString("public_id"),
              rs.getString("nickname"),
              rs.getString("school"),
              rs.getString("major"),
              rs.getString("gpa"),
              rs.getInt("hired_times"),
              rs.getString("availability"),
              rs.getString("status"),
              toAmount(rs.getLong("trial_fee_cents")),
              trialSchedule,
              rs.getString("service_confirmation_cancelled_by")
          );
        },
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

  private HuntingTask findHuntingTask(String publicId, long currentUserId) {
    return huntingTasks(currentUserId).stream()
        .filter((task) -> task.id().equals(publicId))
        .findFirst()
        .orElseThrow(() -> new BusinessException("HUNTING_TASK_NOT_FOUND", "委托不存在或已不可用"));
  }

  private List<HuntingQuote> huntingQuotes(
      long huntingTaskId,
      boolean isPublisher,
      boolean isQuotedByMe,
      Long currentUserId
  ) {
    if (!isPublisher && (!isQuotedByMe || currentUserId == null)) {
      return List.of();
    }

    String userFilter = isPublisher ? "" : "AND hq.quote_user_id = ?";
    Object[] parameters = isPublisher
        ? new Object[] {
            huntingTaskId,
            QUOTE_WAITING_PUBLISHER,
            QUOTE_WAITING_HUNTER,
            QUOTE_CONFIRMED,
            QUOTE_REJECTED,
            QUOTE_WAITING_PUBLISHER,
            QUOTE_WAITING_HUNTER
        }
        : new Object[] {
            huntingTaskId,
            currentUserId,
            QUOTE_WAITING_PUBLISHER,
            QUOTE_WAITING_HUNTER,
            QUOTE_CONFIRMED,
            QUOTE_REJECTED,
            QUOTE_WAITING_PUBLISHER,
            QUOTE_WAITING_HUNTER
        };

    String sql = """
            SELECT hq.public_id,
                   COALESCE(NULLIF(u.nickname, ''), '未设置昵称') AS bidder_nickname,
                   COALESCE(u.phone, '') AS bidder_phone,
                   hq.amount_cents,
                   hq.original_amount_cents,
                   TO_CHAR(hq.updated_at AT TIME ZONE 'Asia/Shanghai', 'MM-DD HH24:MI') AS quote_time,
                   hq.status,
                   hq.confirmed_at IS NOT NULL AS is_selected
            FROM hunting_task_quote hq
            JOIN app_user u ON u.id = hq.quote_user_id
            WHERE hq.hunting_task_id = ?
              %s
              AND hq.status IN ('待确认', ?, ?, ?, ?)
            ORDER BY CASE WHEN hq.status IN ('待确认', ?, ?) THEN 0 ELSE 1 END,
                     hq.updated_at DESC,
                     hq.id DESC
            """.formatted(userFilter);

    return jdbcTemplate.query(
        sql,
        (rs, rowNum) -> new HuntingQuote(
            rs.getString("public_id"),
            new UserNickname(rs.getString("bidder_nickname"), maskPhone(rs.getString("bidder_phone"))),
            toAmount(rs.getLong("amount_cents")),
            toAmount(rs.getLong("original_amount_cents")),
            rs.getString("quote_time"),
            rs.getString("status"),
            rs.getBoolean("is_selected")
        ),
        parameters
    );
  }

  private HuntingTaskRow requireHuntingTaskForUpdate(String publicId) {
    List<HuntingTaskRow> rows = jdbcTemplate.query(
        """
            SELECT id, public_id, publisher_user_id, accepted_user_id, title,
                   description, mode, fee_cents, latest_time, location, urgency,
                   status, deposit_required, deposit_cents,
                   fulfillment_action, fulfillment_action_user_id
            FROM hunting_task
            WHERE public_id = ?
              AND enabled = TRUE
            FOR UPDATE
            """,
        (rs, rowNum) -> new HuntingTaskRow(
            rs.getLong("id"),
            rs.getString("public_id"),
            rs.getObject("publisher_user_id", Long.class),
            rs.getObject("accepted_user_id", Long.class),
            rs.getString("title"),
            rs.getString("description"),
            rs.getString("mode"),
            rs.getLong("fee_cents"),
            rs.getString("latest_time"),
            rs.getString("location"),
            rs.getString("urgency"),
            rs.getString("status"),
            rs.getBoolean("deposit_required"),
            rs.getLong("deposit_cents"),
            rs.getString("fulfillment_action"),
            rs.getObject("fulfillment_action_user_id", Long.class)
        ),
        publicId
    );
    if (rows.isEmpty()) {
      throw new BusinessException("HUNTING_TASK_NOT_FOUND", "委托不存在或已不可用");
    }
    return rows.get(0);
  }

  private HuntingQuoteRow requireHuntingQuote(long huntingTaskId, String quoteId) {
    List<HuntingQuoteRow> rows = jdbcTemplate.query(
        """
            SELECT id, public_id, quote_user_id, amount_cents, status
            FROM hunting_task_quote
            WHERE hunting_task_id = ?
              AND public_id = ?
              AND status IN (?, ?, '待确认')
            FOR UPDATE
            """,
        (rs, rowNum) -> new HuntingQuoteRow(
            rs.getLong("id"),
            rs.getString("public_id"),
            rs.getLong("quote_user_id"),
            rs.getLong("amount_cents"),
            rs.getString("status")
        ),
        huntingTaskId,
        quoteId,
        QUOTE_WAITING_PUBLISHER,
        QUOTE_WAITING_HUNTER
    );
    if (rows.isEmpty()) {
      throw new BusinessException("HUNTING_QUOTE_NOT_FOUND", "报价不存在或已失效");
    }
    return rows.get(0);
  }

  private void ensureTaskCanBeOperatedByHunter(HuntingTaskRow task, long currentUserId) {
    if (task.publisherUserId() != null && task.publisherUserId().equals(currentUserId)) {
      throw new BusinessException("HUNTING_TASK_SELF_OPERATION", "不能联系、报价或接受自己发布的委托");
    }
    if (task.acceptedUserId() != null || isHuntingFulfillingStatus(task.status())) {
      throw new BusinessException("HUNTING_TASK_ALREADY_ACCEPTED", "该委托已被领取或已进入履约中");
    }
    if (isHuntingClosedStatus(task.status())) {
      throw new BusinessException("HUNTING_TASK_CLOSED", "该委托已结束，无法继续操作");
    }
  }

  private void ensureAcceptedHunter(HuntingTaskRow task, long currentUserId) {
    if (!isHuntingFulfillingStatus(task.status()) || task.acceptedUserId() == null) {
      throw new BusinessException("HUNTING_TASK_NOT_FULFILLING", "委托未处于履约中，不能发起履约申请");
    }
    if (!task.acceptedUserId().equals(currentUserId)) {
      throw new BusinessException("HUNTING_TASK_HUNTER_FORBIDDEN", "仅履约方可发起完成申请");
    }
  }

  /** 校验当前用户是否为履约中委托的发布方或履约方，用于双向取消协商。 */
  private void ensureHuntingCancellationActor(HuntingTaskRow task, long currentUserId) {
    if (!isHuntingFulfillingStatus(task.status()) || task.acceptedUserId() == null) {
      throw new BusinessException("HUNTING_TASK_NOT_FULFILLING", "委托未处于履约中，不能处理取消申请");
    }

    boolean isPublisher = task.publisherUserId() != null && task.publisherUserId().equals(currentUserId);
    boolean isHunter = task.acceptedUserId().equals(currentUserId);
    if (!isPublisher && !isHunter) {
      throw new BusinessException("HUNTING_TASK_CANCEL_FORBIDDEN", "仅发布方或履约方可处理取消申请");
    }
  }

  private void ensurePublisher(HuntingTaskRow task, long currentUserId) {
    if (task.publisherUserId() == null || !task.publisherUserId().equals(currentUserId)) {
      throw new BusinessException("HUNTING_TASK_PUBLISHER_FORBIDDEN", "仅发布方可处理该委托");
    }
  }

  private void ensureNoPendingFulfillmentAction(HuntingTaskRow task) {
    if (task.fulfillmentAction() != null && !task.fulfillmentAction().isBlank()) {
      throw new BusinessException("HUNTING_FULFILLMENT_ACTION_PENDING", "已有待确认的履约申请");
    }
  }

  /** 校验报价协商动作的当前处理方，确认只能由收到报价的一方发起。 */
  private void ensureQuoteActionAllowed(
      HuntingQuoteRow quote,
      boolean isPublisher,
      boolean isQuoteUser,
      String action
  ) {
    String status = quote.status();
    boolean waitingPublisher = QUOTE_WAITING_PUBLISHER.equals(status) || QUOTE_LEGACY_WAITING.equals(status);
    boolean waitingHunter = QUOTE_WAITING_HUNTER.equals(status);

    if ("confirm".equals(action)) {
      if ((isPublisher && waitingPublisher) || (isQuoteUser && waitingHunter)) {
        return;
      }
      throw new BusinessException("HUNTING_QUOTE_CONFIRM_FORBIDDEN", "当前报价不允许由你确认");
    }

    if ("counter".equals(action)) {
      if ((isPublisher && waitingPublisher) || (isQuoteUser && waitingHunter)) {
        return;
      }
      throw new BusinessException("HUNTING_QUOTE_COUNTER_FORBIDDEN", "当前报价不允许由你改价");
    }

    if ((isPublisher && waitingPublisher) || (isQuoteUser && waitingHunter)) {
      return;
    }
    throw new BusinessException("HUNTING_QUOTE_REJECT_FORBIDDEN", "当前报价不允许由你拒绝");
  }

  /** 将历史委托状态归一到发布、报价、履约中、完成、取消、异常六类。 */
  private String normalizeHuntingTaskStatus(String status) {
    String value = status == null ? "" : status.strip();
    if (value.contains("报价") || value.contains("待确认")) {
      return TASK_QUOTE;
    }
    if (value.contains("发布") || value.contains("待领取")) {
      return TASK_PUBLISHED;
    }
    if (value.contains("履约") || value.contains("进行") || value.contains("已领取")) {
      return TASK_FULFILLING;
    }
    if (value.contains("完成")) {
      return TASK_COMPLETED;
    }
    if (value.contains("取消")) {
      return TASK_CANCELLED;
    }
    if (value.contains("异常") || value.contains("争议")) {
      return TASK_EXCEPTION;
    }
    return value.isBlank() ? TASK_EXCEPTION : value;
  }

  private boolean isHuntingQuoteStatus(String status) {
    return TASK_QUOTE.equals(normalizeHuntingTaskStatus(status));
  }

  private boolean isHuntingFulfillingStatus(String status) {
    return TASK_FULFILLING.equals(normalizeHuntingTaskStatus(status));
  }

  private boolean isHuntingClosedStatus(String status) {
    String normalizedStatus = normalizeHuntingTaskStatus(status);
    return TASK_COMPLETED.equals(normalizedStatus)
        || TASK_CANCELLED.equals(normalizedStatus)
        || TASK_EXCEPTION.equals(normalizedStatus);
  }

  private void freezeHuntingDepositIfNeeded(long receiverUserId, HuntingTaskRow task) {
    if (!task.depositRequired() || task.depositCents() <= 0) {
      return;
    }

    int updatedRows = jdbcTemplate.update(
        """
            UPDATE wallet_account
            SET withdrawable_cents = withdrawable_cents - ?,
                frozen_cents = frozen_cents + ?,
                updated_at = NOW()
            WHERE user_id = ?
              AND withdrawable_cents >= ?
            """,
        task.depositCents(),
        task.depositCents(),
        receiverUserId,
        task.depositCents()
    );
    if (updatedRows == 0) {
      throw new BusinessException("HUNTING_DEPOSIT_NOT_ENOUGH", "钱包可提现余额不足，无法冻结委托押金");
    }

    jdbcTemplate.update(
        """
            INSERT INTO wallet_record (
              user_id, record_type, direction, amount_cents,
              related_biz_type, related_biz_id, title, status
            )
            VALUES (?, 'HUNTING_DEPOSIT_FREEZE', 'OUT', ?, 'HUNTING_TASK', ?, ?, '已冻结')
            """,
        receiverUserId,
        task.depositCents(),
        task.id(),
        task.title()
    );
  }

  private TutorDemandRow requireTutorDemandForUpdate(String publicId) {
    List<TutorDemandRow> rows = jdbcTemplate.query(
        """
            SELECT id, public_id, parent_user_id, status
            FROM tutor_demand
            WHERE public_id = ?
              AND enabled = TRUE
            FOR UPDATE
            """,
        (rs, rowNum) -> new TutorDemandRow(
            rs.getLong("id"),
            rs.getString("public_id"),
            rs.getObject("parent_user_id", Long.class),
            rs.getString("status")
        ),
        publicId
    );
    if (rows.isEmpty()) {
      throw new BusinessException("TUTOR_DEMAND_NOT_FOUND", "家教需求不存在或已不可用");
    }
    return rows.get(0);
  }

  /** 查询并锁定学生自己的家教试课申请。 */
  private TutorApplicationRow requireTutorApplicationForStudent(String applicationId, long studentUserId) {
    List<TutorApplicationRow> rows = jdbcTemplate.query(
        """
            SELECT ta.id, ta.public_id, td.public_id AS demand_public_id, ta.status,
                   COALESCE(ta.trial_start, '') AS trial_start,
                   COALESCE(ta.trial_end, '') AS trial_end,
                   COALESCE(ta.trial_half_day, '') AS trial_half_day
            FROM tutor_applicant ta
            JOIN tutor_demand td ON td.id = ta.tutor_demand_id
            WHERE ta.public_id = ?
              AND ta.applicant_user_id = ?
              AND ta.enabled = TRUE
              AND td.enabled = TRUE
            FOR UPDATE OF ta
            """,
        (rs, rowNum) -> new TutorApplicationRow(
            rs.getLong("id"),
            rs.getString("public_id"),
            rs.getString("demand_public_id"),
            rs.getString("status"),
            rs.getString("trial_start"),
            rs.getString("trial_end"),
            rs.getString("trial_half_day")
        ),
        applicationId,
        studentUserId
    );
    if (rows.isEmpty()) {
      throw new BusinessException("TUTOR_APPLICATION_NOT_FOUND", "试课申请不存在或无权操作");
    }
    return rows.get(0);
  }

  /** 查询并锁定学生在同一需求下的最新试课申请，用于申请阶段重新提交可试课时间。 */
  private TutorApplicationRow findLatestTutorApplicationForStudent(TutorDemandRow demand, long studentUserId) {
    List<TutorApplicationRow> rows = jdbcTemplate.query(
        """
            SELECT id, public_id, ? AS demand_public_id, status,
                   COALESCE(trial_start, '') AS trial_start,
                   COALESCE(trial_end, '') AS trial_end,
                   COALESCE(trial_half_day, '') AS trial_half_day
            FROM tutor_applicant
            WHERE tutor_demand_id = ?
              AND applicant_user_id = ?
              AND enabled = TRUE
            ORDER BY id DESC
            LIMIT 1
            FOR UPDATE
            """,
        (rs, rowNum) -> new TutorApplicationRow(
            rs.getLong("id"),
            rs.getString("public_id"),
            rs.getString("demand_public_id"),
            rs.getString("status"),
            rs.getString("trial_start"),
            rs.getString("trial_end"),
            rs.getString("trial_half_day")
        ),
        demand.publicId(),
        demand.id(),
        studentUserId
    );

    return rows.isEmpty() ? null : rows.get(0);
  }

  private boolean hasTutorTrialSchedule(long tutorDemandId) {
    Integer count = jdbcTemplate.queryForObject(
        """
            SELECT COUNT(*)
            FROM tutor_applicant
            WHERE tutor_demand_id = ?
              AND enabled = TRUE
              AND status NOT IN (?, ?, ?)
              AND COALESCE(NULLIF(trial_start, ''), '') <> ''
              AND COALESCE(NULLIF(trial_end, ''), '') <> ''
              AND COALESCE(NULLIF(trial_half_day, ''), '') <> ''
            """,
        Integer.class,
        tutorDemandId,
        TUTOR_APPLICANT_STATUS_CANCELLED,
        TUTOR_APPLICANT_STATUS_ENDED,
        TUTOR_APPLICANT_STATUS_REJECTED
    );
    return count != null && count > 0;
  }

  /** 生成家教试课安排展示文案，兼容旧版上午/下午枚举和新版多日排期摘要。 */
  private String tutorTrialScheduleText(String trialStart, String trialEnd, String trialHalfDay) {
    String normalizedSchedule = defaultText(trialHalfDay, "").strip();

    if (normalizedSchedule.contains("年") || normalizedSchedule.contains("；") || normalizedSchedule.contains(";")) {
      return normalizedSchedule;
    }

    return defaultText(trialStart, "待定") + " 至 " + defaultText(trialEnd, "待定") + " · " + normalizedSchedule;
  }

  /** 查询学生提交的原始可试课时间，家长确认试课时必须在该范围内安排。 */
  private String tutorApplicationAvailability(long tutorDemandId, String applicationId) {
    List<String> rows = jdbcTemplate.query(
        """
            SELECT availability
            FROM tutor_applicant
            WHERE tutor_demand_id = ?
              AND public_id = ?
              AND enabled = TRUE
            FOR UPDATE
            """,
        (rs, rowNum) -> defaultText(rs.getString("availability"), ""),
        tutorDemandId,
        applicationId
    );
    if (rows.isEmpty()) {
      throw new BusinessException("TUTOR_APPLICATION_NOT_FOUND", "试课申请不存在或无权操作");
    }
    return rows.get(0);
  }

  /** 校验家长安排的试课日期和时间段不超过 3 天，并落在学生提交的可试课时间内。 */
  private void assertTutorTrialScheduleWithinAvailability(String trialSchedule, String studentAvailability) {
    Map<LocalDate, List<TutorTrialTimeRange>> trialScheduleMap = parseTutorTrialScheduleMap(trialSchedule);
    if (trialScheduleMap.isEmpty()) {
      throw new BusinessException("TUTOR_TRIAL_SCHEDULE_REQUIRED", "请先制定试课安排");
    }
    if (trialScheduleMap.size() > TUTOR_TRIAL_PARENT_MAX_DAYS) {
      throw new BusinessException("TUTOR_TRIAL_SCHEDULE_TOO_MANY_DAYS", "试课安排最多选择 3 天");
    }

    Map<LocalDate, List<TutorTrialTimeRange>> availabilityMap = parseTutorTrialScheduleMap(studentAvailability);
    if (availabilityMap.isEmpty()) {
      return;
    }

    for (Map.Entry<LocalDate, List<TutorTrialTimeRange>> entry : trialScheduleMap.entrySet()) {
      List<TutorTrialTimeRange> availableRanges = availabilityMap.get(entry.getKey());
      if (availableRanges == null) {
        throw new BusinessException("TUTOR_TRIAL_SCHEDULE_OUT_OF_AVAILABILITY", "试课安排必须在学生提交的可试课日期内");
      }

      for (TutorTrialTimeRange trialRange : entry.getValue()) {
        boolean contained = availableRanges.stream().anyMatch((availableRange) -> availableRange.contains(trialRange));
        if (!contained) {
          throw new BusinessException("TUTOR_TRIAL_SCHEDULE_OUT_OF_AVAILABILITY", "试课安排必须在学生提交的可试课时间段内");
        }
      }
    }
  }

  /** 校验学生提交的正式家教可用时间，避免同意正式雇佣时没有可排期依据。 */
  private String requireTutorServiceAvailability(TutorWorkflowActionRequest request) {
    String availability = request == null ? "" : clean(request.availability());
    if (availability.isBlank()) {
      throw new BusinessException("TUTOR_SERVICE_AVAILABILITY_REQUIRED", "请先提交可家教日期");
    }

    Map<LocalDate, List<TutorTrialTimeRange>> availabilityMap = parseTutorTrialScheduleMap(availability);
    boolean hasTimeRange = availabilityMap.values().stream().anyMatch((timeRanges) -> !timeRanges.isEmpty());
    if (availabilityMap.isEmpty() || !hasTimeRange) {
      throw new BusinessException("TUTOR_SERVICE_AVAILABILITY_INVALID", "可家教日期格式不正确");
    }

    return availability;
  }

  /** 校验家长提交的正式家教日程必须落在学生提交的可家教时间内。 */
  private void assertTutorServiceScheduleWithinAvailability(String tutorSchedule, String serviceAvailability) {
    Map<LocalDate, List<TutorTrialTimeRange>> scheduleMap = parseTutorTrialScheduleMap(tutorSchedule);
    boolean hasScheduleTimeRange = scheduleMap.values().stream().anyMatch((timeRanges) -> !timeRanges.isEmpty());
    if (scheduleMap.isEmpty() || !hasScheduleTimeRange) {
      throw new BusinessException("TUTOR_SERVICE_SCHEDULE_REQUIRED", "请先提交兼职日程");
    }

    Map<LocalDate, List<TutorTrialTimeRange>> availabilityMap = parseTutorTrialScheduleMap(serviceAvailability);
    boolean hasAvailabilityTimeRange = availabilityMap.values().stream().anyMatch((timeRanges) -> !timeRanges.isEmpty());
    if (availabilityMap.isEmpty() || !hasAvailabilityTimeRange) {
      throw new BusinessException("TUTOR_SERVICE_AVAILABILITY_REQUIRED", "学生尚未提交可家教日期");
    }

    for (Map.Entry<LocalDate, List<TutorTrialTimeRange>> entry : scheduleMap.entrySet()) {
      List<TutorTrialTimeRange> availableRanges = availabilityMap.get(entry.getKey());
      if (availableRanges == null) {
        throw new BusinessException("TUTOR_SERVICE_SCHEDULE_OUT_OF_AVAILABILITY", "兼职日程必须在学生提交的可家教日期内");
      }

      for (TutorTrialTimeRange scheduleRange : entry.getValue()) {
        boolean contained = availableRanges.stream().anyMatch((availableRange) -> availableRange.contains(scheduleRange));
        if (!contained) {
          throw new BusinessException("TUTOR_SERVICE_SCHEDULE_OUT_OF_AVAILABILITY", "兼职日程必须在学生提交的可家教时间段内");
        }
      }
    }
  }

  /** 解析“2026年7月16日 9:00-11:00；...”格式的试课日程。 */
  private Map<LocalDate, List<TutorTrialTimeRange>> parseTutorTrialScheduleMap(String scheduleText) {
    Map<LocalDate, List<TutorTrialTimeRange>> scheduleMap = new HashMap<>();
    for (String line : defaultText(scheduleText, "").split("[；;]")) {
      Matcher dateMatcher = TUTOR_TRIAL_DATE_PATTERN.matcher(line);
      if (!dateMatcher.find()) {
        continue;
      }

      LocalDate date = LocalDate.of(
          Integer.parseInt(dateMatcher.group(1)),
          Integer.parseInt(dateMatcher.group(2)),
          Integer.parseInt(dateMatcher.group(3))
      );
      List<TutorTrialTimeRange> timeRanges = scheduleMap.computeIfAbsent(date, (ignored) -> new ArrayList<>());
      Matcher timeMatcher = TUTOR_TRIAL_TIME_RANGE_PATTERN.matcher(line);
      while (timeMatcher.find()) {
        timeRanges.add(new TutorTrialTimeRange(
            LocalTime.parse(timeMatcher.group(1), TUTOR_TRIAL_TIME_FORMATTER),
            LocalTime.parse(timeMatcher.group(2), TUTOR_TRIAL_TIME_FORMATTER)
        ));
      }
    }
    return scheduleMap;
  }

  private boolean isClosedTutorDemandStatus(String status) {
    return TUTOR_DEMAND_STATUS_CANCELLED.equals(status) || TUTOR_DEMAND_STATUS_ENDED.equals(status);
  }

  private boolean isRecruitingTutorDemandStatus(String status) {
    return TUTOR_DEMAND_STATUS_RECRUITING.equals(status) || TUTOR_DEMAND_STATUS_RECRUITING_LEGACY.equals(status);
  }

  private boolean isFormalTutorDemandStatus(String status) {
    return TUTOR_DEMAND_STATUS_IN_PROGRESS.equals(status)
        || TUTOR_DEMAND_STATUS_FORMAL_SERVICE_LEGACY.equals(status)
        || TUTOR_DEMAND_STATUS_FORMAL_TUTOR_SERVICE_LEGACY.equals(status)
        || TUTOR_DEMAND_STATUS_TUTORING_LEGACY.equals(status);
  }

  /** 判断当前申请是否已经进入正式家教可用时间或正式日程阶段。 */
  private boolean isTutorServiceAvailabilityStatus(String status) {
    return TUTOR_APPLICANT_STATUS_SERVICE_SCHEDULE_PENDING.equals(status)
        || TUTOR_APPLICANT_STATUS_SERVICE_SCHEDULE_PENDING_LEGACY.equals(status)
        || TUTOR_APPLICANT_STATUS_SERVICE_SCHEDULE_CONFIRMING_LEGACY.equals(status)
        || TUTOR_APPLICANT_STATUS_FORMAL_SERVICE.equals(status)
        || TUTOR_APPLICANT_STATUS_FORMAL_SERVICE_LEGACY.equals(status)
        || TUTOR_APPLICANT_STATUS_TUTORING_LEGACY.equals(status);
  }

  /** 判断申请是否仍处于家长处理前的申请阶段，并兼容迁移前状态。 */
  private boolean isTutorApplicationPendingStatus(String status) {
    return TUTOR_APPLICANT_STATUS_APPLICATION_PENDING.equals(status)
        || TUTOR_APPLICANT_STATUS_APPLICATION_PENDING_LEGACY.equals(status);
  }

  /** 判断家长已提交试课日程，等待学生确认的阶段。 */
  private boolean isTutorTrialScheduleConfirmingStatus(String status) {
    return TUTOR_APPLICANT_STATUS_TRIAL_CONFIRMED.equals(status)
        || TUTOR_APPLICANT_STATUS_TRIAL_CONFIRMED_LEGACY.equals(status);
  }

  /** 判断学生是否可在当前节点取消试课申请。 */
  private boolean isTutorApplicationCancellableStatus(String status) {
    return isTutorApplicationPendingStatus(status) || isTutorTrialScheduleConfirmingStatus(status);
  }

  /** 判断申请是否已经进入不阻止重新申请的终态。 */
  private boolean isTutorApplicationTerminalStatus(String status) {
    return TUTOR_APPLICANT_STATUS_CANCELLED.equals(status)
        || TUTOR_APPLICANT_STATUS_ENDED.equals(status)
        || TUTOR_APPLICANT_STATUS_REJECTED.equals(status)
        || TUTOR_APPLICANT_STATUS_REJECTED_LEGACY.equals(status)
        || TUTOR_APPLICANT_STATUS_TRIAL_ENDED.equals(status)
        || TUTOR_APPLICANT_STATUS_FORMAL_SERVICE_INVALID.equals(status);
  }

  private boolean isFormalTutorApplicationStatus(String status) {
    return TUTOR_APPLICANT_STATUS_FORMAL_SERVICE.equals(status)
        || TUTOR_APPLICANT_STATUS_FORMAL_SERVICE_LEGACY.equals(status)
        || TUTOR_APPLICANT_STATUS_SERVICE_SCHEDULE_CONFIRMING_LEGACY.equals(status)
        || TUTOR_APPLICANT_STATUS_TUTORING_LEGACY.equals(status);
  }

  private String tutorDemandStatusLabel(String status) {
    if (TUTOR_DEMAND_STATUS_RECRUITING_LEGACY.equals(status)) {
      return TUTOR_DEMAND_STATUS_RECRUITING;
    }
    if (TUTOR_DEMAND_STATUS_TUTORING_LEGACY.equals(status)) {
      return TUTOR_DEMAND_STATUS_IN_PROGRESS;
    }
    if (TUTOR_DEMAND_STATUS_FORMAL_SERVICE_LEGACY.equals(status) || TUTOR_DEMAND_STATUS_FORMAL_TUTOR_SERVICE_LEGACY.equals(status)) {
      return TUTOR_DEMAND_STATUS_IN_PROGRESS;
    }
    return status;
  }

  private String tutorDemandOrderStatus(String demandStatus) {
    return tutorDemandStatusLabel(demandStatus);
  }

  private void requireTutorApplicationStatus(String actualStatus, String errorCode, String errorMessage, String... allowedStatuses) {
    boolean matched = Arrays.stream(allowedStatuses).anyMatch((allowedStatus) -> isSameTutorApplicationStatus(actualStatus, allowedStatus));
    if (!matched) {
      throw new BusinessException(errorCode, errorMessage);
    }
  }

  /** 业务状态文案重命名时保留旧值兼容，避免旧数据在流程推进时断链。 */
  private boolean isSameTutorApplicationStatus(String actualStatus, String allowedStatus) {
    if (Objects.equals(actualStatus, allowedStatus)) {
      return true;
    }
    return (TUTOR_APPLICANT_STATUS_SERVICE_CONFIRMING.equals(allowedStatus)
        && TUTOR_APPLICANT_STATUS_SERVICE_CONFIRMING_LEGACY.equals(actualStatus))
        || (TUTOR_APPLICANT_STATUS_TRIAL_SETTLED_SERVICE_PENDING.equals(allowedStatus)
        && TUTOR_APPLICANT_STATUS_TRIAL_SETTLED_SERVICE_PENDING_LEGACY.equals(actualStatus))
        || (TUTOR_APPLICANT_STATUS_SERVICE_SCHEDULE_PENDING.equals(allowedStatus)
        && TUTOR_APPLICANT_STATUS_SERVICE_SCHEDULE_PENDING_LEGACY.equals(actualStatus))
        || (TUTOR_APPLICANT_STATUS_FORMAL_SERVICE.equals(allowedStatus)
        && (TUTOR_APPLICANT_STATUS_FORMAL_SERVICE_LEGACY.equals(actualStatus)
        || TUTOR_APPLICANT_STATUS_SERVICE_SCHEDULE_CONFIRMING_LEGACY.equals(actualStatus)
        || TUTOR_APPLICANT_STATUS_TUTORING_LEGACY.equals(actualStatus)));
  }

  private void ensureTutorParent(TutorWorkflowRow application, long currentUserId) {
    if (application.parentUserId() == null || !application.parentUserId().equals(currentUserId)) {
      throw new BusinessException("TUTOR_WORKFLOW_PARENT_FORBIDDEN", "仅发布该家教需求的家长可以操作");
    }
  }

  private void ensureTutorStudent(TutorWorkflowRow application, long currentUserId) {
    if (application.applicantUserId() == null || !application.applicantUserId().equals(currentUserId)) {
      throw new BusinessException("TUTOR_WORKFLOW_STUDENT_FORBIDDEN", "仅当前申请学生可以操作");
    }
  }

  private void ensureTutorWorkflowOwner(TutorWorkflowRow application, long currentUserId) {
    if ((application.parentUserId() == null || !application.parentUserId().equals(currentUserId))
        && (application.applicantUserId() == null || !application.applicantUserId().equals(currentUserId))) {
      throw new BusinessException("TUTOR_WORKFLOW_OWNER_FORBIDDEN", "仅家教流程双方可以操作");
    }
  }

  private void updateTutorApplicationStatus(long applicationId, String status) {
    jdbcTemplate.update("UPDATE tutor_applicant SET status = ?, updated_at = NOW() WHERE id = ?", status, applicationId);
  }

  /** 发起正式雇佣确认时清空上一轮取消发起方，避免影响新的确认链路。 */
  private void updateTutorApplicationStatusForServiceConfirmation(long applicationId, String status) {
    jdbcTemplate.update(
        """
            UPDATE tutor_applicant
            SET status = ?,
                service_confirmation_cancelled_by = NULL,
                updated_at = NOW()
            WHERE id = ?
            """,
        status,
        applicationId
    );
  }

  /** 取消正式兼职确认并回到试课费用已结算后的家长决策阶段。 */
  private void cancelTutorServiceConfirmation(TutorWorkflowRow application, long currentUserId) {
    String cancelledBy = application.applicantUserId() != null && application.applicantUserId().equals(currentUserId)
        ? TUTOR_SERVICE_CONFIRMATION_CANCELLED_BY_STUDENT
        : TUTOR_SERVICE_CONFIRMATION_CANCELLED_BY_PARENT;

    jdbcTemplate.update(
        """
            UPDATE tutor_applicant
            SET status = ?,
                trial_hire_decision = NULL,
                service_confirmation_cancelled_by = ?,
                updated_at = NOW()
            WHERE id = ?
            """,
        TUTOR_APPLICANT_STATUS_TRIAL_SETTLED_SERVICE_PENDING,
        cancelledBy,
        application.id()
    );
    updateTutorDemandStatus(application.demandId(), TUTOR_DEMAND_STATUS_RECRUITING);
  }

  /** 写入试课结算金额和可选雇佣决策，并进入学生费用确认。 */
  private void updateTutorTrialResult(long applicationId, BigDecimal trialFee, Boolean hireTutor) {
    long trialFeeCents = toTrialFeeCents(trialFee);
    jdbcTemplate.update(
        """
            UPDATE tutor_applicant
            SET trial_fee_cents = ?,
                trial_hire_decision = ?,
                status = ?,
                updated_at = NOW()
            WHERE id = ?
        """,
        trialFeeCents,
        tutorTrialHireDecision(hireTutor),
        TUTOR_APPLICANT_STATUS_SETTLEMENT_CONFIRMING,
        applicationId
    );
  }

  /** 旧链路已存在试课结果处理时，仅补充雇佣决策并进入费用确认。 */
  private void updateTutorTrialSettlementDecision(long applicationId, Boolean hireTutor) {
    jdbcTemplate.update(
        """
            UPDATE tutor_applicant
            SET trial_hire_decision = ?,
                status = ?,
                updated_at = NOW()
            WHERE id = ?
        """,
        tutorTrialHireDecision(hireTutor),
        TUTOR_APPLICANT_STATUS_SETTLEMENT_CONFIRMING,
        applicationId
    );
  }

  /** 将家长在结算弹窗中选择的正式雇佣意向转换为稳定入库值，空值表示后续再决策。 */
  private String tutorTrialHireDecision(Boolean hireTutor) {
    if (hireTutor == null) {
      return null;
    }

    return Boolean.TRUE.equals(hireTutor) ? TUTOR_TRIAL_HIRE_DECISION_HIRE : TUTOR_TRIAL_HIRE_DECISION_NOT_HIRE;
  }

  /** 更新学生提交的可用时间并推进申请状态；空可用时间仅用于兼容旧流程动作。 */
  private void updateTutorApplicationAvailabilityAndStatus(long applicationId, String availability, String status) {
    jdbcTemplate.update(
        """
            UPDATE tutor_applicant
            SET availability = CASE WHEN ? <> '' THEN ? ELSE availability END,
                status = ?,
                updated_at = NOW()
            WHERE id = ?
            """,
        availability,
        availability,
        status,
        applicationId
    );
  }

  /** 写入家长提交的正式兼职日程，并同步可供前端展示的起止日期和日程摘要。 */
  private void updateTutorApplicationSchedule(long applicationId, String tutorSchedule, String status) {
    if (tutorSchedule.isBlank()) {
      throw new BusinessException("TUTOR_SERVICE_SCHEDULE_REQUIRED", "请先提交兼职日程");
    }
    List<LocalDate> dates = parseTutorTrialScheduleMap(tutorSchedule).keySet().stream().sorted().toList();
    if (dates.isEmpty()) {
      throw new BusinessException("TUTOR_SERVICE_SCHEDULE_REQUIRED", "兼职日程格式不正确");
    }
    jdbcTemplate.update(
        """
            UPDATE tutor_applicant
            SET trial_start = ?,
                trial_end = ?,
                trial_half_day = ?,
                status = ?,
                updated_at = NOW()
            WHERE id = ?
            """,
        dates.get(0).toString(),
        dates.get(dates.size() - 1).toString(),
        tutorSchedule,
        status,
        applicationId
    );
  }

  private void updateTutorDemandStatus(long demandId, String status) {
    jdbcTemplate.update("UPDATE tutor_demand SET status = ?, updated_at = NOW() WHERE id = ?", status, demandId);
  }

  /** 家长不正式雇佣且结束发布时，关闭当前试课和同需求下仍活跃的其他申请。 */
  private void closeTutorDemandAfterTrialResult(TutorWorkflowRow application) {
    updateTutorApplicationStatus(application.id(), TUTOR_APPLICANT_STATUS_TRIAL_ENDED);
    jdbcTemplate.update(
        """
            UPDATE tutor_applicant
            SET status = ?,
                updated_at = NOW()
            WHERE tutor_demand_id = ?
              AND id <> ?
              AND enabled = TRUE
              AND status IN (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
        TUTOR_APPLICANT_STATUS_ENDED,
        application.demandId(),
        application.id(),
        TUTOR_APPLICANT_STATUS_APPLICATION_PENDING,
        TUTOR_APPLICANT_STATUS_APPLICATION_PENDING_LEGACY,
        TUTOR_APPLICANT_STATUS_TRIAL_CONFIRMED,
        TUTOR_APPLICANT_STATUS_TRIAL_CONFIRMED_LEGACY,
        TUTOR_APPLICANT_STATUS_TRIALING,
        TUTOR_APPLICANT_STATUS_TRIAL_END_CONFIRMING,
        TUTOR_APPLICANT_STATUS_TRIAL_RESULT_PROCESSING,
        TUTOR_APPLICANT_STATUS_SETTLEMENT_CONFIRMING,
        TUTOR_APPLICANT_STATUS_TRIAL_SETTLED_SERVICE_PENDING,
        TUTOR_APPLICANT_STATUS_TRIAL_SETTLED_SERVICE_PENDING_LEGACY,
        TUTOR_APPLICANT_STATUS_SERVICE_CONFIRMING,
        TUTOR_APPLICANT_STATUS_SERVICE_CONFIRMING_LEGACY,
        TUTOR_APPLICANT_STATUS_SERVICE_SCHEDULE_PENDING,
        TUTOR_APPLICANT_STATUS_SERVICE_SCHEDULE_PENDING_LEGACY,
        TUTOR_APPLICANT_STATUS_SERVICE_SCHEDULE_CONFIRMING_LEGACY
    );
    updateTutorDemandStatus(application.demandId(), TUTOR_DEMAND_STATUS_ENDED);
  }

  /** 正式雇佣成立后，结束同一需求下其他仍在申请、试课或正式确认前的候选。 */
  private void endOtherActiveTutorApplicationsAfterFormalHire(long demandId, String applicationPublicId) {
    jdbcTemplate.update(
        """
            UPDATE tutor_applicant
            SET status = ?,
                updated_at = NOW()
            WHERE tutor_demand_id = ?
              AND public_id <> ?
              AND enabled = TRUE
              AND status IN (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
        TUTOR_APPLICANT_STATUS_ENDED,
        demandId,
        applicationPublicId,
        TUTOR_APPLICANT_STATUS_APPLICATION_PENDING,
        TUTOR_APPLICANT_STATUS_APPLICATION_PENDING_LEGACY,
        TUTOR_APPLICANT_STATUS_TRIAL_CONFIRMED,
        TUTOR_APPLICANT_STATUS_TRIAL_CONFIRMED_LEGACY,
        TUTOR_APPLICANT_STATUS_TRIALING,
        TUTOR_APPLICANT_STATUS_TRIAL_END_CONFIRMING,
        TUTOR_APPLICANT_STATUS_TRIAL_RESULT_PROCESSING,
        TUTOR_APPLICANT_STATUS_SETTLEMENT_CONFIRMING,
        TUTOR_APPLICANT_STATUS_TRIAL_SETTLED_SERVICE_PENDING,
        TUTOR_APPLICANT_STATUS_TRIAL_SETTLED_SERVICE_PENDING_LEGACY,
        TUTOR_APPLICANT_STATUS_SERVICE_CONFIRMING,
        TUTOR_APPLICANT_STATUS_SERVICE_CONFIRMING_LEGACY,
        TUTOR_APPLICANT_STATUS_SERVICE_SCHEDULE_PENDING,
        TUTOR_APPLICANT_STATUS_SERVICE_SCHEDULE_PENDING_LEGACY,
        TUTOR_APPLICANT_STATUS_SERVICE_SCHEDULE_CONFIRMING_LEGACY
    );
  }

  private TutorWorkflowRow requireTutorApplicationForWorkflow(String applicationId) {
    List<TutorWorkflowRow> rows = jdbcTemplate.query(
        """
            SELECT ta.id, ta.public_id, ta.tutor_demand_id, td.public_id AS demand_public_id,
                   td.parent_user_id, ta.applicant_user_id, ta.status, td.status AS demand_status,
                   COALESCE(ta.trial_start, '') AS trial_start,
                   COALESCE(ta.trial_end, '') AS trial_end,
                   COALESCE(ta.trial_half_day, '') AS trial_half_day,
                   COALESCE(ta.trial_hire_decision, '') AS trial_hire_decision
            FROM tutor_applicant ta
            JOIN tutor_demand td ON td.id = ta.tutor_demand_id
            WHERE ta.public_id = ?
              AND ta.enabled = TRUE
              AND td.enabled = TRUE
            FOR UPDATE OF ta
            """,
        (rs, rowNum) -> new TutorWorkflowRow(
            rs.getLong("id"),
            rs.getString("public_id"),
            rs.getLong("tutor_demand_id"),
            rs.getString("demand_public_id"),
            rs.getObject("parent_user_id", Long.class),
            rs.getObject("applicant_user_id", Long.class),
            rs.getString("status"),
            rs.getString("demand_status"),
            rs.getString("trial_start"),
            rs.getString("trial_end"),
            rs.getString("trial_half_day"),
            rs.getString("trial_hire_decision")
        ),
        applicationId
    );
    if (rows.isEmpty()) {
      throw new BusinessException("TUTOR_APPLICATION_NOT_FOUND", "试课申请不存在或无权操作");
    }
    return rows.get(0);
  }

  private void ensureUserRole(long userId, ClientRole expectedRole, String errorCode, String errorMessage) {
    if (userRole(userId) != expectedRole) {
      throw new BusinessException(errorCode, errorMessage);
    }
  }

  private ClientRole userRole(long userId) {
    String role = jdbcTemplate.queryForObject("SELECT role FROM app_user WHERE id = ?", String.class, userId);
    return ClientRole.valueOf(role);
  }

  private String tutorPeriod(String periodStart, String periodEnd) {
    String start = defaultText(periodStart, "待定");
    String end = defaultText(periodEnd, "待定");
    return start + " 至 " + end;
  }

  private String joinTags(List<String> tags) {
    if (tags == null || tags.isEmpty()) {
      return "";
    }
    return String.join("、", tags.stream().map(String::strip).filter((tag) -> !tag.isBlank()).toList());
  }

  private List<HuntingProjectStopResponse> normalizedHuntingProjectStops(
      List<com.unknown.platform.modules.clientworkspace.model.HuntingProjectStopRequest> stops
  ) {
    if (stops == null) {
      return List.of();
    }
    return stops.stream()
        .map((stop) -> new HuntingProjectStopResponse(
            defaultText(stop.inputMode(), "select"),
            defaultText(stop.area(), ""),
            defaultText(stop.customArea(), ""),
            defaultText(stop.etaStart(), ""),
            defaultText(stop.etaEnd(), "")
        ))
        .filter((stop) -> !stop.area().isBlank() || !stop.customArea().isBlank())
        .toList();
  }

  private int matchedHuntingTaskCount(String currentArea, List<HuntingProjectStopResponse> stops) {
    List<String> areas = new ArrayList<>();
    areas.add(defaultText(currentArea, ""));
    stops.forEach((stop) -> areas.add(defaultText(stop.customArea().isBlank() ? stop.area() : stop.customArea(), "")));
    int matchedCount = 0;
    for (String area : areas.stream().filter((item) -> !item.isBlank()).distinct().toList()) {
      Integer count = jdbcTemplate.queryForObject(
          """
              SELECT COUNT(*)
              FROM hunting_task
              WHERE enabled = TRUE
                AND status IN (?, ?)
                AND (location ILIKE ? OR title ILIKE ? OR COALESCE(description, '') ILIKE ?)
              """,
          Integer.class,
          TASK_PUBLISHED,
          TASK_QUOTE,
          "%" + area + "%",
          "%" + area + "%",
          "%" + area + "%"
      );
      matchedCount += count == null ? 0 : count;
    }
    return matchedCount;
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

  private long publisherUserIdOrFallback(Long publisherUserId) {
    return publisherUserId == null ? roleUserId(ClientRole.student) : publisherUserId;
  }

  private UserNickname userNickname(long userId) {
    UserContact contact = userContact(userId);
    return new UserNickname(contact.nickname(), maskPhone(contact.phone()));
  }

  private UserContact userContact(long userId) {
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

  private String maskPhone(String phone) {
    String normalizedPhone = phone == null ? "" : phone.strip();
    if (normalizedPhone.isBlank()) {
      return "暂无手机号";
    }
    if (normalizedPhone.length() < 7) {
      return normalizedPhone;
    }

    return normalizedPhone.substring(0, 3) + "****" + normalizedPhone.substring(7);
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

  private record UserContact(String nickname, String phone) {
  }

  private BigDecimal toAmount(long cents) {
    return BigDecimal.valueOf(cents, 2);
  }

  /** 将元转换为分，统一保留两位小数。 */
  private long toCents(BigDecimal amount) {
    return toPositiveCents(amount, "INVALID_HUNTING_TASK_AMOUNT", "发布金额必须大于 0");
  }

  /** 将正数金额转换为分，并使用调用方传入的错误码和文案区分业务场景。 */
  private long toPositiveCents(BigDecimal amount, String errorCode, String errorMessage) {
    if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
      throw new BusinessException(errorCode, errorMessage);
    }

    return amount.setScale(2, RoundingMode.HALF_UP).movePointRight(2).longValueExact();
  }

  /** 将试课结算金额转换为分，允许 0 元但不允许空值或负数。 */
  private long toTrialFeeCents(BigDecimal trialFee) {
    if (trialFee == null) {
      throw new BusinessException("TUTOR_TRIAL_FEE_REQUIRED", "请先确认试课结算金额");
    }
    if (trialFee.compareTo(BigDecimal.ZERO) < 0) {
      throw new BusinessException("TUTOR_TRIAL_FEE_INVALID", "试课结算金额不能小于 0");
    }

    return trialFee.setScale(2, RoundingMode.HALF_UP).movePointRight(2).longValueExact();
  }

  /** 生成家教需求对外编号。 */
  private String nextTutorDemandPublicId() {
    String randomSuffix = UUID.randomUUID().toString().replace("-", "").substring(0, 6).toUpperCase();
    return "TD" + System.currentTimeMillis() + randomSuffix;
  }

  /** 生成家教试课申请对外编号。 */
  private String nextTutorApplicantPublicId() {
    String randomSuffix = UUID.randomUUID().toString().replace("-", "").substring(0, 6).toUpperCase();
    return "TA" + System.currentTimeMillis() + randomSuffix;
  }

  /** 生成狩猎项目对外编号。 */
  private String nextHuntingProjectPublicId() {
    String randomSuffix = UUID.randomUUID().toString().replace("-", "").substring(0, 6).toUpperCase();
    return "HP" + System.currentTimeMillis() + randomSuffix;
  }

  /** 生成委托任务对外编号。 */
  private String nextHuntingTaskPublicId() {
    String randomSuffix = UUID.randomUUID().toString().replace("-", "").substring(0, 6).toUpperCase();
    return "H" + System.currentTimeMillis() + randomSuffix;
  }

  /** 生成委托报价对外编号。 */
  private String nextHuntingQuotePublicId() {
    String randomSuffix = UUID.randomUUID().toString().replace("-", "").substring(0, 6).toUpperCase();
    return "HQ" + System.currentTimeMillis() + randomSuffix;
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

  /** 清理用户输入文本，为空时返回空字符串。 */
  private String clean(String value) {
    return value == null ? "" : value.strip();
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

  private record TutorDemandRow(
      long id,
      String publicId,
      Long parentUserId,
      String status
  ) {
  }

  private record TutorApplicationRow(
      long id,
      String publicId,
      String demandPublicId,
      String status,
      String trialStart,
      String trialEnd,
      String trialHalfDay
  ) {
  }

  private record TutorWorkflowRow(
      long id,
      String publicId,
      long demandId,
      String demandPublicId,
      Long parentUserId,
      Long applicantUserId,
      String status,
      String demandStatus,
      String trialStart,
      String trialEnd,
      String trialHalfDay,
      String trialHireDecision
  ) {
  }

  /** 试课时间段，用于校验家长安排是否落在学生可试课时间内。 */
  private record TutorTrialTimeRange(LocalTime start, LocalTime end) {
    private boolean contains(TutorTrialTimeRange target) {
      return !target.start().isBefore(start) && !target.end().isAfter(end);
    }
  }

  private record HuntingTaskRow(
      long id,
      String publicId,
      Long publisherUserId,
      Long acceptedUserId,
      String title,
      String description,
      String mode,
      long feeCents,
      String latestTime,
      String location,
      String urgency,
      String status,
      boolean depositRequired,
      long depositCents,
      String fulfillmentAction,
      Long fulfillmentActionUserId
  ) {
  }

  private record HuntingQuoteRow(
      long id,
      String publicId,
      long quoteUserId,
      long amountCents,
      String status
  ) {
  }
}
