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
import com.unknown.platform.modules.clientworkspace.model.ClientWorkspaceResponse.HuntingQuote;
import com.unknown.platform.modules.clientworkspace.model.ClientWorkspaceResponse.HuntingSummary;
import com.unknown.platform.modules.clientworkspace.model.ClientWorkspaceResponse.HuntingTask;
import com.unknown.platform.modules.clientworkspace.model.CreateHuntingProjectRequest;
import com.unknown.platform.modules.clientworkspace.model.HuntingProjectResponse;
import com.unknown.platform.modules.clientworkspace.model.HuntingProjectStopResponse;
import com.unknown.platform.modules.clientworkspace.model.HuntingQuoteDecisionRequest;
import com.unknown.platform.modules.clientworkspace.model.HuntingTaskFulfillmentActionRequest;
import com.unknown.platform.modules.clientworkspace.model.PublishHuntingTaskRequest;
import com.unknown.platform.modules.clientworkspace.model.QuoteHuntingTaskRequest;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 委托/狩猎（Hunting）领域应用服务：任务发布、接单、报价、履约和取消等完整工作流。
 *
 * <p>由 {@link ClientWorkspaceAppService} 从原单体服务中拆分而来，仅承载委托/狩猎领域逻辑；
 * 与家教领域（{@link TutorWorkspaceAppService}）之间没有直接方法调用，仅通过工作台聚合层组合。</p>
 */
@Service
public class HuntingTaskAppService {
  private static final DateTimeFormatter HUNTING_PUBLISH_TIME_FORMATTER = DateTimeFormatter.ofPattern("MM-dd HH:mm");

  private final JdbcTemplate jdbcTemplate;
  private final ClientSessionService clientSessionService;
  private final ClientWorkspaceSupport support;

  public HuntingTaskAppService(
      JdbcTemplate jdbcTemplate,
      ClientSessionService clientSessionService,
      ClientWorkspaceSupport support
  ) {
    this.jdbcTemplate = jdbcTemplate;
    this.clientSessionService = clientSessionService;
    this.support = support;
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


  /** 发布委托或回收任务，并返回委托列表可直接展示的任务数据。 */
  @Transactional
  public HuntingTask publishHuntingTask(PublishHuntingTaskRequest request, String authorization) {
    Long currentUserId = clientSessionService.userIdOrNull(authorization);
    long publisherUserId = currentUserId == null ? support.roleUserId(ClientRole.student) : currentUserId;
    ClientWorkspaceSupport.UserContact publisher = support.userContact(publisherUserId);
    String mode = huntingTaskMode(request.type());
    String publicId = nextHuntingTaskPublicId();
    String title = request.title().strip();
    boolean amountNegotiable = Boolean.TRUE.equals(request.amountNegotiable());
    String taskMode = amountNegotiable && "delegation".equals(request.type()) ? "报价发布" : mode;
    long feeCents = amountNegotiable ? 0 : support.toCents(request.amount());
    boolean depositRequired = Boolean.TRUE.equals(request.depositRequired());
    long depositCents = depositRequired
        ? support.toPositiveCents(request.depositAmount(), "INVALID_HUNTING_TASK_DEPOSIT", "委托押金金额必须大于 0")
        : 0;
    String description = support.defaultText(request.description(), "暂无描述");
    String latestTime = request.latestTime().strip();
    String location = support.defaultText(support.defaultText(request.destination(), request.location()), "目的地待补充");
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
        support.truncate(requirement, 40),
        status,
        depositRequired,
        depositCents
    );

    return new HuntingTask(
        publicId,
        title,
        description,
        taskMode,
        support.toAmount(feeCents),
        latestTime,
        location,
        support.truncate(requirement, 40),
        status,
        HUNTING_PUBLISH_TIME_FORMATTER.format(LocalDateTime.now()),
        location,
        requirement,
        normalizedRequirementTags(request.requirementTags()),
        new UserNickname(publisher.nickname(), support.maskPhone(publisher.phone())),
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
        support.toAmount(depositCents),
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

    long amountCents = support.toPositiveCents(request.amount(), "INVALID_HUNTING_QUOTE_AMOUNT", "报价金额必须大于 0");
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
    long amountCents = support.toPositiveCents(amount, "INVALID_HUNTING_QUOTE_AMOUNT", "报价金额必须大于 0");
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
        support.defaultText(task.description(), "暂无描述"),
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


  /** 创建狩猎项目并根据动线粗略计算系统推荐委托数量。 */
  @Transactional
  public HuntingProjectResponse createHuntingProject(CreateHuntingProjectRequest request, String authorization) {
    long currentUserId = clientSessionService.requireUserId(authorization);
    support.ensureUserRole(currentUserId, ClientRole.student, "HUNTING_PROJECT_STUDENT_ONLY", "仅学生账号可以创建狩猎项目");
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


  public HuntingSummary huntingSummary() {
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


  public List<HuntingTask> huntingTasks(Long currentUserId) {
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
              support.toAmount(feeCents),
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
              support.userNickname(support.publisherUserIdOrFallback(publisherUserId)),
              acceptedUserId == null ? null : support.userNickname(acceptedUserId),
              isMine,
              currentUserId != null && currentUserId.equals(acceptedUserId),
              isQuotedByMe,
              pendingQuoteAmountCents == null ? null : support.toAmount(pendingQuoteAmountCents),
              rs.getString("pending_quote_id"),
              rs.getString("pending_quote_status"),
              rs.getString("fulfillment_action"),
              currentUserId != null && currentUserId.equals(fulfillmentActionUserId),
              feeCents == 0 && isHuntingQuoteStatus(status),
              rs.getBoolean("deposit_required"),
              support.toAmount(rs.getLong("deposit_cents")),
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
            new UserNickname(rs.getString("bidder_nickname"), support.maskPhone(rs.getString("bidder_phone"))),
            support.toAmount(rs.getLong("amount_cents")),
            support.toAmount(rs.getLong("original_amount_cents")),
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


  private List<HuntingProjectStopResponse> normalizedHuntingProjectStops(
      List<com.unknown.platform.modules.clientworkspace.model.HuntingProjectStopRequest> stops
  ) {
    if (stops == null) {
      return List.of();
    }
    return stops.stream()
        .map((stop) -> new HuntingProjectStopResponse(
            support.defaultText(stop.inputMode(), "select"),
            support.defaultText(stop.area(), ""),
            support.defaultText(stop.customArea(), ""),
            support.defaultText(stop.etaStart(), ""),
            support.defaultText(stop.etaEnd(), "")
        ))
        .filter((stop) -> !stop.area().isBlank() || !stop.customArea().isBlank())
        .toList();
  }


  private int matchedHuntingTaskCount(String currentArea, List<HuntingProjectStopResponse> stops) {
    List<String> areas = new ArrayList<>();
    areas.add(support.defaultText(currentArea, ""));
    stops.forEach((stop) -> areas.add(support.defaultText(stop.customArea().isBlank() ? stop.area() : stop.customArea(), "")));
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
  }}
