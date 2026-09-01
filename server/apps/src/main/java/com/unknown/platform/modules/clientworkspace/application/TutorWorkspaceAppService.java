package com.unknown.platform.modules.clientworkspace.application;

import com.unknown.platform.common.api.UserNickname;
import com.unknown.platform.common.exception.BusinessException;
import com.unknown.platform.common.security.ClientSessionService;
import com.unknown.platform.modules.auth.model.ClientRole;
import com.unknown.platform.modules.clientworkspace.model.ClientWorkspaceResponse.ClientOrder;
import com.unknown.platform.modules.clientworkspace.model.ClientWorkspaceResponse.TutorApplicant;
import com.unknown.platform.modules.clientworkspace.model.ClientWorkspaceResponse.TutorApplicantProfile;
import com.unknown.platform.modules.clientworkspace.model.ClientWorkspaceResponse.TutorDemand;
import com.unknown.platform.modules.clientworkspace.model.ApplyTutorTrialRequest;
import com.unknown.platform.modules.clientworkspace.model.CompleteTutorTrialEndRequest;
import com.unknown.platform.modules.clientworkspace.model.ConfirmTutorTrialRequest;
import com.unknown.platform.modules.clientworkspace.model.PublishTutorDemandRequest;
import com.unknown.platform.modules.clientworkspace.model.TutorSubjects;
import com.unknown.platform.modules.clientworkspace.model.TutorWorkflowActionRequest;
import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 家教（Tutor）领域应用服务：需求发布、试课申请、日程确认、结算和状态流转等完整工作流。
 *
 * <p>由 {@link ClientWorkspaceAppService} 从原单体服务中拆分而来，仅承载家教领域逻辑；
 * 与委托/狩猎领域（{@link HuntingTaskAppService}）之间没有直接方法调用，仅通过工作台聚合层组合。</p>
 */
@Service
public class TutorWorkspaceAppService {
  private static final DateTimeFormatter TUTOR_TRIAL_TIME_FORMATTER = DateTimeFormatter.ofPattern("H:mm");
  private static final Pattern TUTOR_TRIAL_DATE_PATTERN = Pattern.compile("(\\d{4})年(\\d{1,2})月(\\d{1,2})日");
  private static final Pattern TUTOR_TRIAL_TIME_PATTERN = Pattern.compile("(\\d{1,2}):(\\d{2})");
  private static final Pattern TUTOR_TRIAL_TIME_RANGE_PATTERN = Pattern.compile("(\\d{1,2}:\\d{2})-(\\d{1,2}:\\d{2})");
  private static final int TUTOR_TRIAL_PARENT_MAX_DAYS = 3;
  // 状态值统一改为稳定 KEY（不再是中文展示文案），数据库、常量、API 三层都存/传 KEY；
  // 中文展示文案只在前端维护，详见 docs/家教状态模型治理建议.md。
  // _LEGACY 常量的值收敛成跟对应正式常量相同的 KEY（历史文案已通过 V30 迁移归一化，
  // 不会再有旧数据命中这些分支，保留常量名只是避免大范围改动引用点）。
  private static final String TUTOR_APPLICANT_STATUS_APPLICATION_PENDING = "APPLICATION_PENDING";
  private static final String TUTOR_APPLICANT_STATUS_APPLICATION_PENDING_LEGACY = "APPLICATION_PENDING";
  private static final String TUTOR_APPLICANT_STATUS_CANCELLED = "CANCELLED";
  private static final String TUTOR_APPLICANT_STATUS_ENDED = "ENDED";
  private static final String TUTOR_APPLICANT_STATUS_FORMAL_SERVICE = "FORMAL_SERVICE";
  private static final String TUTOR_APPLICANT_STATUS_FORMAL_SERVICE_LEGACY = "FORMAL_SERVICE";
  private static final String TUTOR_APPLICANT_STATUS_FORMAL_SERVICE_INVALID = "FORMAL_SERVICE_INVALID";
  private static final String TUTOR_APPLICANT_STATUS_REJECTED = "REJECTED";
  private static final String TUTOR_APPLICANT_STATUS_REJECTED_LEGACY = "REJECTED";
  private static final String TUTOR_APPLICANT_STATUS_SERVICE_CONFIRMING = "SERVICE_CONFIRMING";
  private static final String TUTOR_APPLICANT_STATUS_SERVICE_CONFIRMING_LEGACY = "SERVICE_CONFIRMING";
  // 这个状态只在旧数据里出现过，从未有对应的"正式"常量，KEY 化后单独保留自己的 KEY。
  private static final String TUTOR_APPLICANT_STATUS_SERVICE_SCHEDULE_CONFIRMING_LEGACY = "SERVICE_SCHEDULE_CONFIRMING";
  private static final String TUTOR_APPLICANT_STATUS_SERVICE_SCHEDULE_PENDING = "SERVICE_SCHEDULE_PENDING";
  private static final String TUTOR_APPLICANT_STATUS_SERVICE_SCHEDULE_PENDING_LEGACY = "SERVICE_SCHEDULE_PENDING";
  private static final String TUTOR_APPLICANT_STATUS_SETTLEMENT_CONFIRMING = "SETTLEMENT_CONFIRMING";
  private static final String TUTOR_APPLICANT_STATUS_SETTLEMENT_REVISING = "SETTLEMENT_REVISING";
  private static final String TUTOR_APPLICANT_STATUS_SERVICE_END_CONFIRMING = "SERVICE_END_CONFIRMING";
  private static final String TUTOR_APPLICANT_STATUS_SYSTEM_SETTLING = "SYSTEM_SETTLING";
  private static final String TUTOR_APPLICANT_STATUS_TRIAL_SETTLED_SERVICE_PENDING = "TRIAL_SETTLED_SERVICE_PENDING";
  private static final String TUTOR_APPLICANT_STATUS_TRIAL_SETTLED_SERVICE_PENDING_LEGACY = "TRIAL_SETTLED_SERVICE_PENDING";
  private static final String TUTOR_APPLICANT_STATUS_TRIAL_ENDED = "TRIAL_ENDED";
  private static final String TUTOR_APPLICANT_STATUS_TRIAL_END_CONFIRMING = "TRIAL_END_CONFIRMING";
  private static final String TUTOR_APPLICANT_STATUS_TRIAL_CONFIRMED = "TRIAL_CONFIRMING";
  private static final String TUTOR_APPLICANT_STATUS_TRIAL_CONFIRMED_LEGACY = "TRIAL_CONFIRMING";
  private static final String TUTOR_APPLICANT_STATUS_TRIAL_RESULT_PROCESSING = "TRIAL_RESULT_PROCESSING";
  private static final String TUTOR_APPLICANT_STATUS_TRIALING = "TRIALING";
  private static final String TUTOR_APPLICANT_STATUS_TUTORING_LEGACY = "FORMAL_SERVICE";
  private static final String TUTOR_DEMAND_STATUS_CANCELLED = "CANCELLED";
  private static final String TUTOR_DEMAND_STATUS_ENDED = "ENDED";
  private static final String TUTOR_DEMAND_STATUS_IN_PROGRESS = "IN_PROGRESS";
  private static final String TUTOR_DEMAND_STATUS_PENDING_PUBLISH = "PENDING_PUBLISH";
  private static final String TUTOR_DEMAND_STATUS_SERVICE_END_REQUESTED = "SERVICE_END_REQUESTED";
  private static final String TUTOR_DEMAND_STATUS_FORMAL_SERVICE_LEGACY = "IN_PROGRESS";
  private static final String TUTOR_DEMAND_STATUS_FORMAL_TUTOR_SERVICE_LEGACY = "IN_PROGRESS";
  private static final String TUTOR_DEMAND_STATUS_RECRUITING = "RECRUITING";
  private static final String TUTOR_DEMAND_STATUS_RECRUITING_LEGACY = "RECRUITING";
  private static final String TUTOR_DEMAND_STATUS_TUTORING_LEGACY = "IN_PROGRESS";
  private static final String TUTOR_TRIAL_HIRE_DECISION_HIRE = "hire";
  private static final String TUTOR_TRIAL_HIRE_DECISION_NOT_HIRE = "not_hire";
  private static final String TUTOR_SERVICE_CONFIRMATION_CANCELLED_BY_PARENT = "parent";
  private static final String TUTOR_SERVICE_CONFIRMATION_CANCELLED_BY_STUDENT = "student";
  private static final String TUTOR_APPLICATION_SCHEDULE_STAGE_SERVICE = "service";
  private static final String TUTOR_APPLICATION_SCHEDULE_STAGE_TRIAL = "trial";
  /** 家教进行中列表归档状态：包含取消发布后的待发布，以及需求/申请的结束、取消、拒绝和试课结束；
   *  不含正式雇佣失效，那个状态还有"重新发起正式雇佣"操作要展示，不能归档。原逻辑曾放在前端
   *  isArchivedClientOrder 里，现收敛到接口源头，返回的就是真实进行中数据。 */
  // TUTOR_DEMAND_STATUS_ENDED/TUTOR_APPLICANT_STATUS_ENDED、TUTOR_DEMAND_STATUS_CANCELLED/
  // TUTOR_APPLICANT_STATUS_CANCELLED 两两同值（都是 "ENDED"/"CANCELLED"），Set.of 遇重复元素会抛
  // IllegalArgumentException，这里只保留互不相同的 KEY，语义上已经覆盖需求和申请两类状态。
  private static final Set<String> ARCHIVED_TUTOR_CLIENT_ORDER_STATUS_KEYS = Set.of(
      TUTOR_DEMAND_STATUS_ENDED,
      TUTOR_DEMAND_STATUS_CANCELLED,
      TUTOR_DEMAND_STATUS_PENDING_PUBLISH,
      TUTOR_APPLICANT_STATUS_REJECTED,
      TUTOR_APPLICANT_STATUS_TRIAL_ENDED
  );

  private final JdbcTemplate jdbcTemplate;
  private final ClientSessionService clientSessionService;
  private final ClientWorkspaceSupport support;

  public TutorWorkspaceAppService(
      JdbcTemplate jdbcTemplate,
      ClientSessionService clientSessionService,
      ClientWorkspaceSupport support
  ) {
    this.jdbcTemplate = jdbcTemplate;
    this.clientSessionService = clientSessionService;
    this.support = support;
  }

  /**
   * {@link #parentTutorDemandApplicants} 的接口层入口，从登录态解析当前用户 ID。按需求 id 精确查询
   * 单条家教需求的申请人列表（含完整认证资料），供"进行中"弹窗（试课申请列表/试课中列表）点开某一张
   * 卡片时按需加载，不再一次性拉取家长名下全部家教需求再由前端筛选；只返回申请人列表，不带需求本身的
   * 展示字段。
   */
  public List<TutorApplicantProfile> getTutorApplication(ClientRole role, String authorization, String demandId) {
    Long currentUserId = clientSessionService.userIdOrNull(authorization);
    if (role != ClientRole.parent || currentUserId == null) {
      throw new BusinessException("TUTOR_DEMAND_NOT_FOUND", "家教需求不存在或已不可用");
    }
    return parentTutorDemandApplicants(currentUserId, demandId);
  }

  /**
   * 学生端招募中的家教需求，作为兼职列表聚合的一种类型，供 {@code /workspace/jobs} 拼装展示；
   * 仅学生角色可见，其它角色返回空列表。
   *
   * @param role 当前角色
   * @return 招募中的家教需求列表
   */
  public List<TutorDemand> recruitingTutorDemandsForJobs(ClientRole role) {
    if (role != ClientRole.student) {
      return List.of();
    }

    return publishedTutorDemands();
  }

  /**
   * 家长端可浏览的认证学生列表，仅家长角色可见，其它角色返回空列表。
   *
   * @param role 当前角色
   * @return 已开启家教曝光、认证通过的学生原始数据列表
   */
  public List<Object> listTutorCertifiedStudents(ClientRole role) {
    if (role != ClientRole.parent) {
      return List.of();
    }

    return new ArrayList<>(tutorExposedStudents());
  }


  /** 家长发布家教需求，发布后进入自己的进行中家教列表。 */
  @Transactional
  public TutorDemand publishTutorDemand(PublishTutorDemandRequest request, String authorization) {
    long currentUserId = clientSessionService.requireUserId(authorization);
    support.ensureUserRole(currentUserId, ClientRole.parent, "TUTOR_DEMAND_PARENT_ONLY", "仅家长账号可以发布家教需求");
    String publicId = nextTutorDemandPublicId();
    String childName = support.defaultText(request.childName(), "孩子");
    // 学科从固定选项选择，不再兜底成"待沟通"这类不属于任何 KEY 的占位文案；未选学科视为提交无效。
    TutorSubjects.requireValidKeys(request.subject());
    String subject = request.subject();
    String title = support.defaultText(request.title(), childName + TutorSubjects.label(subject) + "家教");
    String addressLabel = support.defaultText(request.addressLabel(), "地址待补充");
    String periodStart = support.defaultText(request.periodStart(), "待定");
    String periodEnd = support.defaultText(request.periodEnd(), "待定");
    String plannedDates = support.joinTags(request.plannedDates());
    String wageMode = normalizedTutorWageMode(request.wageMode());
    long wageAmountCents = isTutorWageAmountRequired(wageMode)
        ? support.toPositiveCents(request.wageAmount(), "TUTOR_WAGE_AMOUNT_REQUIRED", "请输入家教计薪金额")
        : 0L;
    String budget = tutorWageBudgetLabel(wageMode, wageAmountCents, Boolean.TRUE.equals(request.trialEnabled()));
    String school = addressLabel;

    jdbcTemplate.update(
        """
            INSERT INTO tutor_demand (
              public_id, parent_user_id, child, subject, school, budget, status,
              title, description, requirement, address_id, address_label, child_id,
              period_start, period_end, period_dates, trial_enabled, trial_duration, wage_mode, school_tags,
              enabled, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, NOW())
            """,
        publicId,
        currentUserId,
        childName,
        subject,
        school,
        budget,
        TUTOR_DEMAND_STATUS_RECRUITING,
        title,
        support.defaultText(request.description(), "暂无描述"),
        support.defaultText(request.requirement(), "暂无要求"),
        support.clean(request.addressId()),
        addressLabel,
        support.clean(request.childId()),
        periodStart,
        periodEnd,
        plannedDates,
        Boolean.TRUE.equals(request.trialEnabled()),
        support.defaultText(request.trialDuration(), ""),
        wageMode,
        support.joinTags(request.schoolTags())
    );
    return findTutorDemand(publicId);
  }


  /** 学生申请家教试课，申请记录进入双方进行中列表。 */
  @Transactional
  public TutorDemand applyTutorTrial(String demandId, ApplyTutorTrialRequest request, String authorization) {
    long currentUserId = clientSessionService.requireUserId(authorization);
    support.ensureUserRole(currentUserId, ClientRole.student, "TUTOR_TRIAL_STUDENT_ONLY", "仅学生账号可以申请家教试课");
    TutorDemandRow demand = requireTutorDemandForUpdate(demandId);
    if (!isRecruitingTutorDemandStatus(demand.status())) {
      throw new BusinessException("TUTOR_DEMAND_CLOSED", "该家教兼职已不可申请");
    }
    /** 学生端直接提交申请，不再要求先选可试课时间；具体安排改为申请通过后由双方另行协商。 */
    String availability = request == null ? "" : support.clean(request.availability());
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
          request == null ? "" : support.clean(request.message()),
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
        request == null ? "" : support.clean(request.message())
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
    support.ensureUserRole(currentUserId, ClientRole.student, "TUTOR_TRIAL_STUDENT_ONLY", "仅学生账号可以取消试课申请");
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


  /** 家长提交结构化试课日程，服务端统一派生起止日期与展示摘要。 */
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

    TutorTrialSchedule trialSchedule = normalizeTutorTrialSchedule(request);

    int updatedRows = jdbcTemplate.update(
        """
            UPDATE tutor_applicant
            SET status = ?,
                updated_at = NOW()
            WHERE tutor_demand_id = ?
              AND public_id = ?
              AND status IN (?, ?, ?, ?)
              AND enabled = TRUE
            """,
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
    upsertTutorApplicationScheduleByPublicId(
        demand.id(),
        applicationId,
        TUTOR_APPLICATION_SCHEDULE_STAGE_TRIAL,
        trialSchedule.start(),
        trialSchedule.end(),
        trialSchedule.summary(),
        "parent"
    );
    return findTutorDemand(demand.publicId());
  }


  /** 学生确认家长提交的试课安排，申请状态进入试课中。 */
  @Transactional
  public TutorDemand confirmTutorTrialStart(String applicationId, String authorization) {
    long currentUserId = clientSessionService.requireUserId(authorization);
    support.ensureUserRole(currentUserId, ClientRole.student, "TUTOR_TRIAL_STUDENT_ONLY", "仅学生账号可以确认试课");
    TutorApplicationRow application = requireTutorApplicationForStudent(applicationId, currentUserId);
    if (!isTutorTrialScheduleConfirmingStatus(application.status())) {
      throw new BusinessException("TUTOR_TRIAL_STATUS_INVALID", "当前试课状态不可确认");
    }
    if (tutorApplicationSchedule(application.id(), TUTOR_APPLICATION_SCHEDULE_STAGE_TRIAL).isBlank()) {
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
    support.ensureUserRole(currentUserId, ClientRole.student, "TUTOR_TRIAL_STUDENT_ONLY", "仅学生账号可以发起结束试课");
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
    String action = request == null ? "" : support.clean(request.action());
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
        updateTutorApplicationAvailabilityAndStatus(application.id(), request == null ? "" : support.clean(request.availability()), TUTOR_APPLICANT_STATUS_APPLICATION_PENDING);
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
        String tutorSchedule = request == null ? "" : support.clean(request.tutorSchedule());
        assertTutorServiceScheduleWithinAvailability(tutorSchedule, tutorApplicationAvailability(application.demandId(), application.publicId()));
        updateTutorApplicationServiceSchedule(application.id(), tutorSchedule, TUTOR_APPLICANT_STATUS_FORMAL_SERVICE);
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
        boolean isParent = application.parentUserId() != null && application.parentUserId().equals(currentUserId);
        if (isParent) {
          requireTutorApplicationStatus(
              application.status(),
              "TUTOR_SERVICE_END_STATUS_INVALID",
              "只有进行中或等待结束确认的家教兼职可以结束",
              TUTOR_APPLICANT_STATUS_FORMAL_SERVICE,
              TUTOR_APPLICANT_STATUS_TUTORING_LEGACY,
              TUTOR_APPLICANT_STATUS_SERVICE_END_CONFIRMING
          );
          updateTutorTrialResult(application.id(), request == null ? null : request.trialFee(), null);
          updateTutorDemandStatus(application.demandId(), TUTOR_DEMAND_STATUS_ENDED);
        } else {
          requireTutorApplicationStatus(
              application.status(),
              "TUTOR_SERVICE_END_STATUS_INVALID",
              "只有进行中的家教兼职可以发起结束",
              TUTOR_APPLICANT_STATUS_FORMAL_SERVICE,
              TUTOR_APPLICANT_STATUS_TUTORING_LEGACY
          );
          updateTutorApplicationStatus(application.id(), TUTOR_APPLICANT_STATUS_SERVICE_END_CONFIRMING);
        }
      }
      case "accept_service_offer" -> {
        ensureTutorStudent(application, currentUserId);
        requireTutorApplicationStatus(application.status(), "TUTOR_SERVICE_OFFER_STATUS_INVALID", "只有正式雇佣确认中的记录可以同意", TUTOR_APPLICANT_STATUS_SERVICE_CONFIRMING);
        String serviceAvailability = requireTutorServiceAvailability(request);
        assertTutorServiceAvailabilityNotOverlappingTrialSchedule(
            serviceAvailability,
            tutorApplicationSchedule(application.id(), TUTOR_APPLICATION_SCHEDULE_STAGE_TRIAL)
        );
        updateTutorServiceAvailabilityAndResetServiceSchedule(application.id(), serviceAvailability, TUTOR_APPLICANT_STATUS_SERVICE_SCHEDULE_PENDING);
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
        updateTutorServiceAvailabilityAndResetServiceSchedule(application.id(), requireTutorServiceAvailability(request), TUTOR_APPLICANT_STATUS_SERVICE_SCHEDULE_PENDING);
      }
      case "confirm_settlement" -> {
        ensureTutorStudent(application, currentUserId);
        requireTutorApplicationStatus(application.status(), "TUTOR_SETTLEMENT_STATUS_INVALID", "只有结算确认中的记录可以确认结算", TUTOR_APPLICANT_STATUS_SETTLEMENT_CONFIRMING);
        if (isFormalTutorDemandStatus(application.demandStatus()) || TUTOR_DEMAND_STATUS_ENDED.equals(application.demandStatus())) {
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
   * 家长取消发布尚未进入试课安排的家教兼职，取消发布后主任务回到待发布状态。
   *
   * @param demandId 家教需求对外 ID
   * @param authorization 客户端登录访问令牌
   * @return 已取消发布并回到待发布状态的家教需求
   */
  @Transactional
  public TutorDemand cancelTutorDemand(String demandId, String authorization) {
    long currentUserId = clientSessionService.requireUserId(authorization);
    TutorDemandRow demand = requireTutorDemandForUpdate(demandId);
    if (demand.parentUserId() == null || !demand.parentUserId().equals(currentUserId)) {
      throw new BusinessException("TUTOR_DEMAND_CANCEL_PARENT_FORBIDDEN", "仅发布该家教兼职的家长可以取消发布");
    }
    if (isClosedTutorDemandStatus(demand.status())) {
      throw new BusinessException("TUTOR_DEMAND_ALREADY_CLOSED", "该家教兼职已结束或已取消");
    }
    if (hasTutorTrialSchedule(demand.id())) {
      throw new BusinessException("TUTOR_DEMAND_TRIAL_SCHEDULED", "已有试课安排的家教兼职不能直接取消发布");
    }

    jdbcTemplate.update(
        """
            UPDATE tutor_demand
            SET status = ?,
                updated_at = NOW()
            WHERE id = ?
            """,
        TUTOR_DEMAND_STATUS_PENDING_PUBLISH,
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


  /** 将家教需求和试课申请并入进行中列表，避免 H5 只维护本地临时订单。 */
  public List<ClientOrder> tutorOrders(ClientRole role, Long currentUserId) {
    if (currentUserId == null || role == ClientRole.merchant) {
      return List.of();
    }

    if (role == ClientRole.parent) {
      return jdbcTemplate.query(
          """
              SELECT td.public_id, td.title, td.child, td.subject, td.school, td.budget, td.status, td.address_label,
                     td.description, td.period_start, td.period_end, td.period_dates,
                     (
                       SELECT COUNT(*)
                       FROM tutor_applicant ta
                       WHERE ta.tutor_demand_id = td.id
                         AND ta.enabled = TRUE
                         AND ta.status IN ('APPLICATION_PENDING')
                     ) AS applicant_count,
                     (
                       SELECT COUNT(*)
                       FROM tutor_applicant ta
                       WHERE ta.tutor_demand_id = td.id
                        AND ta.enabled = TRUE
                        AND ta.status IN (
                           'TRIAL_CONFIRMING', 'TRIALING', 'TRIAL_END_CONFIRMING', 'TRIAL_RESULT_PROCESSING',
                           'SETTLEMENT_CONFIRMING', 'SETTLEMENT_REVISING', 'TRIAL_SETTLED_SERVICE_PENDING',
                           'SERVICE_CONFIRMING', 'SERVICE_SCHEDULE_PENDING', 'SERVICE_SCHEDULE_CONFIRMING',
                           'FORMAL_SERVICE', 'SERVICE_END_CONFIRMING', 'FORMAL_SERVICE_INVALID'
                         )
                     ) AS trialing_count,
                     EXISTS (
                       SELECT 1
                       FROM tutor_applicant ta
                       JOIN tutor_application_schedule tas ON tas.tutor_applicant_id = ta.id
                       WHERE ta.tutor_demand_id = td.id
                         AND ta.enabled = TRUE
                         AND ta.status NOT IN ('CANCELLED', 'ENDED', 'REJECTED')
                         AND tas.stage = 'trial'
                         AND tas.enabled = TRUE
                         AND COALESCE(NULLIF(tas.schedule_summary, ''), '') <> ''
                     ) AS has_trial_schedule,
                     (
                       SELECT ta.public_id
                       FROM tutor_applicant ta
                       WHERE ta.tutor_demand_id = td.id
                         AND ta.enabled = TRUE
                         AND ta.status IN (
                           'SERVICE_SCHEDULE_PENDING', 'SERVICE_SCHEDULE_CONFIRMING',
                           'FORMAL_SERVICE', 'SERVICE_END_CONFIRMING'
                         )
                       ORDER BY ta.updated_at DESC, ta.id DESC
                       LIMIT 1
                     ) AS active_application_public_id,
                     (
                       SELECT ta.status
                       FROM tutor_applicant ta
                       WHERE ta.tutor_demand_id = td.id
                         AND ta.enabled = TRUE
                         AND ta.status IN (
                           'SERVICE_SCHEDULE_PENDING', 'SERVICE_SCHEDULE_CONFIRMING',
                           'FORMAL_SERVICE', 'SERVICE_END_CONFIRMING'
                         )
                       ORDER BY ta.updated_at DESC, ta.id DESC
                       LIMIT 1
                     ) AS active_application_status,
                     (
                       SELECT COALESCE(NULLIF(ta.availability, ''), '')
                       FROM tutor_applicant ta
                       WHERE ta.tutor_demand_id = td.id
                         AND ta.enabled = TRUE
                         AND ta.status IN (
                           'SERVICE_SCHEDULE_PENDING', 'SERVICE_SCHEDULE_CONFIRMING',
                           'FORMAL_SERVICE', 'SERVICE_END_CONFIRMING'
                         )
                       ORDER BY ta.updated_at DESC, ta.id DESC
                       LIMIT 1
                     ) AS active_application_availability,
                     (
                       SELECT COALESCE(NULLIF(tas.schedule_summary, ''), '')
                       FROM tutor_applicant ta
                       JOIN tutor_application_schedule tas ON tas.tutor_applicant_id = ta.id
                       WHERE ta.tutor_demand_id = td.id
                         AND ta.enabled = TRUE
                         AND tas.stage = 'trial'
                         AND tas.enabled = TRUE
                         AND ta.status IN (
                           'SERVICE_SCHEDULE_PENDING', 'SERVICE_SCHEDULE_CONFIRMING',
                           'FORMAL_SERVICE', 'SERVICE_END_CONFIRMING'
                         )
                       ORDER BY ta.updated_at DESC, ta.id DESC
                       LIMIT 1
                     ) AS active_application_trial_schedule,
                     (
                       SELECT COALESCE(NULLIF(tas.schedule_summary, ''), '')
                       FROM tutor_applicant ta
                       JOIN tutor_application_schedule tas ON tas.tutor_applicant_id = ta.id
                       WHERE ta.tutor_demand_id = td.id
                         AND ta.enabled = TRUE
                         AND tas.stage = 'service'
                         AND tas.enabled = TRUE
                         AND ta.status IN (
                           'SERVICE_SCHEDULE_PENDING', 'SERVICE_SCHEDULE_CONFIRMING',
                           'FORMAL_SERVICE', 'SERVICE_END_CONFIRMING'
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
            // 需求维度：该需求下是否存在任意申请人已填写试课安排，取自持久化列 has_trial_schedule；
            // 与 tutorOrders() 中按单个申请自身文本推导的 hasOwnTrialSchedule 粒度不同。
            boolean hasTrialSchedule = rs.getBoolean("has_trial_schedule");
            int applicantCount = rs.getInt("applicant_count");
            boolean hasTrialingTutor = rs.getInt("trialing_count") > 0;
            String activeApplicationPublicId = support.defaultText(rs.getString("active_application_public_id"), "");
            String activeApplicationStatus = support.defaultText(rs.getString("active_application_status"), "");
            String activeApplicationAvailability = support.defaultText(rs.getString("active_application_availability"), "");
            String activeApplicationTrialSchedule = support.defaultText(rs.getString("active_application_trial_schedule"), "");
            String activeApplicationSchedule = support.defaultText(rs.getString("active_application_schedule"), "");
            boolean isServiceSchedulePending = isSameTutorApplicationStatus(activeApplicationStatus, TUTOR_APPLICANT_STATUS_SERVICE_SCHEDULE_PENDING);
            boolean isRecruiting = isRecruitingTutorDemandStatus(status);
            boolean isDemandInProgress = !isClosed && (isFormalTutorDemandStatus(status) || !activeApplicationPublicId.isBlank());
            boolean canManageRecruitingDemand = isRecruiting && !isDemandInProgress;
            boolean canCancelPublishedDemand = canManageRecruitingDemand;
            boolean hasActiveApplication = !activeApplicationPublicId.isBlank();
            // 需求主状态和活跃申请状态分开返回两个 KEY 字段，不再由后端拼成一个复合展示串；
            // 家长端"进行中 · 申请结束中"这类合并展示行由前端查表拼接。
            String demandStatusKey = isDemandInProgress ? TUTOR_DEMAND_STATUS_IN_PROGRESS : tutorDemandStatusLabel(status);
            String activeApplicantStatusKey = hasActiveApplication ? activeApplicationStatus : null;
            String scheduleDetail = isServiceSchedulePending || activeApplicationSchedule.isBlank()
                ? ""
                : " · 课程安排：" + activeApplicationSchedule;
            String trialScheduleDetail = activeApplicationTrialSchedule.isBlank()
                ? ""
                : " · 试课安排：" + activeApplicationTrialSchedule;
            String availabilityDetail = isServiceSchedulePending && !activeApplicationAvailability.isBlank()
                ? " · 可家教时间：" + activeApplicationAvailability
                : "";
            return ClientOrder.builder()
                .id(rs.getString("public_id"))
                .role(role)
                .title(support.defaultText(rs.getString("title"), rs.getString("child") + rs.getString("subject") + "家教"))
                .status(demandStatusKey)
                .activeApplicantStatus(activeApplicantStatusKey)
                .amount(BigDecimal.ZERO)
                .contact("孩子：" + rs.getString("child"))
                .detail("周期：" + support.defaultText(rs.getString("period_start"), "待定") + " 至 "
                    + support.defaultText(rs.getString("period_end"), "待定") + " · 地址："
                    + support.defaultText(rs.getString("address_label"), "地址待补充") + " · 学科：" + rs.getString("subject")
                    + availabilityDetail
                    + trialScheduleDetail
                    + scheduleDetail)
                .amountLabel(rs.getString("budget"))
                .category("tutor")
                .subject(rs.getString("subject"))
                .address(support.defaultText(rs.getString("address_label"), "地址待补充"))
                .plannedDates(support.splitTags(rs.getString("period_dates")))
                .quoteCount(rs.getInt("applicant_count"))
                .trialCount(rs.getInt("trialing_count"))
                .quoteId(activeApplicationPublicId)
                .canCall(canManageRecruitingDemand)
                .canMessage(canManageRecruitingDemand)
                .canRequestCancel(canCancelPublishedDemand)
                .canRequestComplete(hasActiveApplication && isDemandInProgress)
                .canConfirmCancel(false)
                .canConfirmComplete(false)
                .canRepublish(false)
                .canAgreeTrial(false)
                .canOpenTrialResult(false)
                .canOpenTrialSchedule(hasActiveApplication && isDemandInProgress)
                .canOpenTutorTrialList(!isDemandInProgress && hasTrialingTutor)
                .canOpenTutorApplications(canManageRecruitingDemand && applicantCount > 0)
                .canRejectTrial(false)
                .canCancelTutorApplication(false)
                .tutorDemand(new TutorDemand(
                    rs.getString("public_id"),
                    rs.getString("child"),
                    rs.getString("subject"),
                    rs.getString("school"),
                    rs.getString("budget"),
                    tutorDemandStatusLabel(status),
                    support.defaultText(rs.getString("title"), rs.getString("child") + rs.getString("subject") + "家教"),
                    support.defaultText(rs.getString("description"), "暂无描述"),
                    support.defaultText(rs.getString("address_label"), rs.getString("school")),
                    tutorPeriod(rs.getString("period_start"), rs.getString("period_end")),
                    support.splitTags(rs.getString("period_dates")),
                    // 家长自己发布的需求，发布方就是自己，卡片不展示这个信息，昵称留空即可。
                    new UserNickname("", ""),
                    "tutorDemand",
                    List.of()
                ))
                .build();
          },
          currentUserId
      );
    }

    return jdbcTemplate.query(
        """
            SELECT ta.public_id, ta.status, ta.availability, ta.trial_fee_cents,
                   COALESCE(NULLIF(trial_schedule.schedule_summary, ''), '') AS trial_schedule,
                   COALESCE(NULLIF(service_schedule.schedule_summary, ''), '') AS service_schedule,
                   td.public_id AS demand_public_id, td.title, td.child, td.subject, td.school, td.budget,
                   td.status AS demand_status, td.address_label, td.description, td.period_start, td.period_end, td.period_dates,
                   COALESCE(NULLIF(parent.nickname, ''), '未设置昵称') AS parent_nickname,
                   COALESCE(parent.phone, '') AS parent_phone
            FROM tutor_applicant ta
            JOIN tutor_demand td ON td.id = ta.tutor_demand_id
            LEFT JOIN app_user parent ON parent.id = td.parent_user_id
            LEFT JOIN tutor_application_schedule trial_schedule
              ON trial_schedule.tutor_applicant_id = ta.id
             AND trial_schedule.stage = 'trial'
             AND trial_schedule.enabled = TRUE
            LEFT JOIN tutor_application_schedule service_schedule
              ON service_schedule.tutor_applicant_id = ta.id
             AND service_schedule.stage = 'service'
             AND service_schedule.enabled = TRUE
            WHERE ta.applicant_user_id = ?
              AND ta.enabled = TRUE
              AND td.enabled = TRUE
              AND td.status NOT IN (?, ?)
              AND ta.status NOT IN (?, ?, ?)
            ORDER BY ta.updated_at DESC, ta.id DESC
            """,
        (rs, rowNum) -> {
          String status = rs.getString("status");
          boolean isTrialConfirmed = isTutorTrialScheduleConfirmingStatus(status);
          boolean isTrialing = TUTOR_APPLICANT_STATUS_TRIALING.equals(status);
          boolean isFormalService = isFormalTutorApplicationStatus(status);
          boolean isSettlementConfirming = TUTOR_APPLICANT_STATUS_SETTLEMENT_CONFIRMING.equals(status);
          boolean isFormalSettlement = isSettlementConfirming && TUTOR_DEMAND_STATUS_ENDED.equals(rs.getString("demand_status"));
          boolean isApplicationPending = isTutorApplicationPendingStatus(status);
          boolean canCancelTutorApplication = isApplicationPending || isTrialConfirmed;
          String trialScheduleText = support.defaultText(rs.getString("trial_schedule"), "");
          // 注意：这里是当前申请自身的试课安排是否已填写，粒度与上文按需求聚合的
          // hasTrialSchedule（取自持久化列 has_trial_schedule）不同，命名区分避免误用。
          boolean hasOwnTrialSchedule = !trialScheduleText.isBlank();
          String serviceScheduleText = support.defaultText(rs.getString("service_schedule"), "");
          String availabilityLabel = isTutorServiceAvailabilityStatus(status) ? "可家教时间：" : "可试课时间：";
          String feeLabel = isFormalService || isFormalSettlement ? "结算金额：" : "试课结算金额：";
          String orderDetail = (isFormalService || isFormalSettlement ? "正式雇佣 · " : "试课申请 · ") + rs.getString("subject") + " · "
              + support.defaultText(rs.getString("period_start"), "待定") + " 至 "
              + support.defaultText(rs.getString("period_end"), "待定") + " · "
              + support.defaultText(rs.getString("address_label"), "地址待补充")
              + " · " + availabilityLabel + support.defaultText(rs.getString("availability"), "待补充")
              + " · " + feeLabel + support.toAmount(rs.getLong("trial_fee_cents"))
              + (trialScheduleText.isBlank() ? "" : " · 试课安排：" + trialScheduleText)
              + (serviceScheduleText.isBlank() ? "" : " · 课程安排：" + serviceScheduleText);
          boolean canContact = !isTutorApplicationTerminalStatus(status);
          return ClientOrder.builder()
              .id(rs.getString("public_id"))
              .role(role)
              .title(rs.getString("title"))
              .status(status)
              .amount(BigDecimal.ZERO)
              .contact(rs.getString("parent_nickname"))
              .detail(orderDetail)
              .amountLabel(rs.getString("budget"))
              .category("tutor")
              .subject(rs.getString("subject"))
              .address(support.defaultText(rs.getString("address_label"), "地址待补充"))
              .plannedDates(support.splitTags(rs.getString("period_dates")))
              .phoneNumber(support.maskPhone(rs.getString("parent_phone")))
              .canCall(canContact)
              .canMessage(canContact)
              .canRequestCancel(false)
              .canRequestComplete(isTrialing || isFormalService)
              .canConfirmCancel(false)
              .canConfirmComplete(false)
              .canRepublish(false)
              .canAgreeTrial(isTrialConfirmed && hasOwnTrialSchedule)
              .canOpenTrialResult(isSettlementConfirming)
              .canOpenTrialSchedule(isTrialConfirmed && hasOwnTrialSchedule)
              .canOpenTutorTrialList(false)
              .canOpenTutorApplications(false)
              .canRejectTrial(false)
              .canCancelTutorApplication(canCancelTutorApplication)
              .tutorDemand(new TutorDemand(
                  rs.getString("demand_public_id"),
                  rs.getString("child"),
                  rs.getString("subject"),
                  rs.getString("school"),
                  rs.getString("budget"),
                  tutorDemandStatusLabel(rs.getString("demand_status")),
                  support.defaultText(rs.getString("title"), rs.getString("child") + rs.getString("subject") + "家教"),
                  support.defaultText(rs.getString("description"), "暂无描述"),
                  support.defaultText(rs.getString("address_label"), rs.getString("school")),
                  tutorPeriod(rs.getString("period_start"), rs.getString("period_end")),
                  support.splitTags(rs.getString("period_dates")),
                  new UserNickname(rs.getString("parent_nickname"), support.maskPhone(rs.getString("parent_phone"))),
                  "tutorDemand",
                  List.of()
              ))
              .build();
        },
        currentUserId,
        TUTOR_DEMAND_STATUS_CANCELLED,
        TUTOR_DEMAND_STATUS_ENDED,
        TUTOR_APPLICANT_STATUS_ENDED,
        TUTOR_APPLICANT_STATUS_CANCELLED,
        TUTOR_APPLICANT_STATUS_FORMAL_SERVICE_INVALID
    );
  }

  /**
   * 家教进行中列表归档判断：试课已结算但正式雇佣待确认时不归档（还有"重新发起正式雇佣"操作要展示），
   * 其余命中 {@link #ARCHIVED_TUTOR_CLIENT_ORDER_STATUS_KEYS} 的一律视为归档。{@link #tutorOrders}
   * 本身不做归档过滤（返回全量，供订单历史接口复用），由调用方（{@code /workspace/ongoing} 聚合层）
   * 决定是否用这个方法过滤成"进行中"视图。
   */
  public boolean isArchivedTutorOrder(ClientOrder order) {
    if (TUTOR_APPLICANT_STATUS_TRIAL_SETTLED_SERVICE_PENDING.equals(order.status())) {
      return false;
    }
    return ARCHIVED_TUTOR_CLIENT_ORDER_STATUS_KEYS.contains(order.status());
  }



  /** 家长端家教列表展示已开启家教开关、认证通过且真实提交过认证资料的学生信息。
   *  直接返回 app_user 和 tutor_certification 两张表的原始列值，不做任何加工/打码；
   *  按数据来源分成两个子对象：{@code tutor_information}（app_user 身份字段）、
   *  {@code tutor_certification}（认证资料字段），跟 {@link #tutorApplicantProfiles} 的
   *  {@code tutorInformation}/{@code tutorCertification} 保持同一套内容口径。 */
  private List<Map<String, Object>> tutorExposedStudents() {
    return jdbcTemplate.query(
        """
            SELECT u.id, u.nickname, u.phone, u.credit_score,
                   tc.subject, tc.school, tc.major, tc.gender, tc.education, tc.gpa, tc.certificate,
                   tc.real_name, tc.id_card, tc.age, tc.native_place, tc.xuexin_screenshot
            FROM app_user u
            INNER JOIN tutor_certification tc ON tc.user_id = u.id
            WHERE u.role = 'student'
              AND u.tutor_certification_status = 'normal'
              AND u.tutor_exposure_enabled = TRUE
            ORDER BY u.credit_score DESC, u.updated_at DESC, u.id DESC
            """,
        (rs, rowNum) -> {
          Map<String, Object> tutorCertification = new LinkedHashMap<>();
          tutorCertification.put("subject", rs.getString("subject"));
          tutorCertification.put("school", rs.getString("school"));
          tutorCertification.put("major", rs.getString("major"));
          tutorCertification.put("gender", rs.getString("gender"));
          tutorCertification.put("education", rs.getString("education"));
          tutorCertification.put("gpa", rs.getString("gpa"));
          tutorCertification.put("certificate", rs.getString("certificate"));
          tutorCertification.put("real_name", rs.getString("real_name"));
          tutorCertification.put("id_card", rs.getString("id_card"));
          tutorCertification.put("age", rs.getString("age"));
          tutorCertification.put("native_place", rs.getString("native_place"));
          tutorCertification.put("xuexin_screenshot", rs.getString("xuexin_screenshot"));

          Map<String, Object> tutorInformation = new LinkedHashMap<>();
          tutorInformation.put("id", rs.getLong("id"));
          tutorInformation.put("nickname", rs.getString("nickname"));
          tutorInformation.put("phone", rs.getString("phone"));
          tutorInformation.put("credit_score", rs.getInt("credit_score"));

          Map<String, Object> tutor = new LinkedHashMap<>();
          tutor.put("tutor_information", tutorInformation);
          tutor.put("tutor_certification", tutorCertification);
          return tutor;
        }
    );
  }



  /** 家长本人发布的单条家教需求的申请人列表，按 public_id + 归属家长一起过滤，避免越权查看他人申请人数据；
   *  查不到（需求不存在或不属于当前家长）统一按"需求不存在"处理，不额外暴露"存在但无权限"这种更具体的信息。
   *  只需要确认归属并拿到内部数值 id 转给 {@link #tutorApplicantProfiles}，不需要需求本身的展示字段。 */
  private List<TutorApplicantProfile> parentTutorDemandApplicants(Long parentUserId, String demandPublicId) {
    List<Long> demandIds = jdbcTemplate.query(
        """
            SELECT td.id
            FROM tutor_demand td
            WHERE td.public_id = ?
              AND td.parent_user_id = ?
              AND td.enabled = TRUE
            LIMIT 1
            """,
        (rs, rowNum) -> rs.getLong("id"),
        demandPublicId,
        parentUserId
    );
    if (demandIds.isEmpty()) {
      throw new BusinessException("TUTOR_DEMAND_NOT_FOUND", "家教需求不存在或已不可用");
    }
    return tutorApplicantProfiles(demandIds.get(0));
  }


  /** 学生端兼职列表展示家长已发布的家教需求。 */
  private List<TutorDemand> publishedTutorDemands() {
    return jdbcTemplate.query(
        """
            SELECT td.id, td.public_id, td.child, td.subject, td.school, td.budget, td.status,
                   td.title, td.description, td.address_label, td.period_start, td.period_end,
                   td.period_dates AS planned_dates,
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
            support.defaultText(rs.getString("title"), rs.getString("child") + rs.getString("subject") + "家教"),
            support.defaultText(rs.getString("description"), "暂无描述"),
            support.defaultText(rs.getString("address_label"), rs.getString("school")),
            tutorPeriod(rs.getString("period_start"), rs.getString("period_end")),
            support.splitTags(rs.getString("planned_dates")),
            new UserNickname(rs.getString("publisher_nickname"), support.maskPhone(rs.getString("publisher_phone"))),
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
                   td.title, td.description, td.address_label, td.period_start, td.period_end, td.period_dates,
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
            support.defaultText(rs.getString("title"), rs.getString("child") + rs.getString("subject") + "家教"),
            support.defaultText(rs.getString("description"), "暂无描述"),
            support.defaultText(rs.getString("address_label"), rs.getString("school")),
            tutorPeriod(rs.getString("period_start"), rs.getString("period_end")),
            support.splitTags(rs.getString("period_dates")),
            new UserNickname(rs.getString("publisher_nickname"), support.maskPhone(rs.getString("publisher_phone"))),
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
                   COALESCE(NULLIF(trial_schedule.schedule_summary, ''), '') AS trial_schedule,
                   COALESCE(NULLIF(service_schedule.schedule_summary, ''), '') AS service_schedule,
                   COALESCE(ta.service_confirmation_cancelled_by, '') AS service_confirmation_cancelled_by
            FROM tutor_applicant ta
            LEFT JOIN app_user u ON u.id = ta.applicant_user_id
            LEFT JOIN tutor_application_schedule trial_schedule
              ON trial_schedule.tutor_applicant_id = ta.id
             AND trial_schedule.stage = 'trial'
             AND trial_schedule.enabled = TRUE
            LEFT JOIN tutor_application_schedule service_schedule
              ON service_schedule.tutor_applicant_id = ta.id
             AND service_schedule.stage = 'service'
             AND service_schedule.enabled = TRUE
            WHERE ta.tutor_demand_id = ?
              AND ta.enabled = TRUE
            ORDER BY ta.hired_times DESC, ta.id
            """,
        (rs, rowNum) -> {
          return new TutorApplicant(
              rs.getString("public_id"),
              rs.getString("nickname"),
              rs.getString("school"),
              rs.getString("major"),
              rs.getString("gpa"),
              rs.getInt("hired_times"),
              rs.getString("availability"),
              rs.getString("status"),
              support.toAmount(rs.getLong("trial_fee_cents")),
              support.defaultText(rs.getString("trial_schedule"), ""),
              support.defaultText(rs.getString("service_schedule"), ""),
              rs.getString("service_confirmation_cancelled_by")
          );
        },
        tutorDemandId
    );
  }


  /** 家教招募需求下的申请人列表，含完整认证资料，供"进行中"弹窗按需求 id 加载使用；这份数据同时
   *  服务"试课申请列表"（{@code isApplicationListVisible}）和"试课/正式雇佣列表"
   *  （{@code isTrialListVisible}）两个前端视图，两者用到的状态集合互不相同，因此这里只在源头
   *  剔除两个视图都用不到的真正终态申请（已拒绝/已取消/已结束/试课已结束/正式服务已失效），
   *  不能收窄成只留某一个视图需要的状态子集，否则会把另一个视图需要的候选人一起过滤掉。
   *  申请工作流字段（受聘次数、可用时间、状态、试课/正式课安排等）取自 {@code tutor_applicant}；
   *  认证资料字段的取值方式和列名都跟 {@link #tutorExposedStudents} 保持一致，直接联查
   *  {@code tutor_certification}，不使用 {@code tutor_applicant.school/major/gpa}——这三列
   *  从提交申请起就只是占位文案，从未被真实业务写入过。 */
  private List<TutorApplicantProfile> tutorApplicantProfiles(long tutorDemandId) {
    return jdbcTemplate.query(
        """
            SELECT ta.public_id,
                   ta.applicant_user_id,
                   COALESCE(NULLIF(u.nickname, ''), '未设置昵称') AS nickname,
                   COALESCE(u.phone, '') AS phone,
                   u.credit_score,
                   ta.hired_times, ta.availability, ta.status, ta.trial_fee_cents,
                   COALESCE(NULLIF(trial_schedule.schedule_summary, ''), '') AS trial_schedule,
                   COALESCE(NULLIF(service_schedule.schedule_summary, ''), '') AS service_schedule,
                   COALESCE(ta.service_confirmation_cancelled_by, '') AS service_confirmation_cancelled_by,
                   tc.subject, tc.school, tc.major, tc.gender, tc.education, tc.gpa, tc.certificate,
                   tc.real_name, tc.id_card, tc.age, tc.native_place, tc.xuexin_screenshot
            FROM tutor_applicant ta
            LEFT JOIN app_user u ON u.id = ta.applicant_user_id
            LEFT JOIN tutor_certification tc ON tc.user_id = ta.applicant_user_id
            LEFT JOIN tutor_application_schedule trial_schedule
              ON trial_schedule.tutor_applicant_id = ta.id
             AND trial_schedule.stage = 'trial'
             AND trial_schedule.enabled = TRUE
            LEFT JOIN tutor_application_schedule service_schedule
              ON service_schedule.tutor_applicant_id = ta.id
             AND service_schedule.stage = 'service'
             AND service_schedule.enabled = TRUE
            WHERE ta.tutor_demand_id = ?
              AND ta.enabled = TRUE
              AND ta.status NOT IN (?, ?, ?, ?, ?)
            ORDER BY ta.hired_times DESC, ta.id
            """,
        (rs, rowNum) -> {
          Map<String, Object> tutorInformation = new LinkedHashMap<>();
          tutorInformation.put("id", rs.getLong("applicant_user_id"));
          tutorInformation.put("nickname", rs.getString("nickname"));
          tutorInformation.put("phone", rs.getString("phone"));
          tutorInformation.put("credit_score", rs.getInt("credit_score"));

          Map<String, Object> tutorCertification = new LinkedHashMap<>();
          tutorCertification.put("subject", rs.getString("subject"));
          tutorCertification.put("school", rs.getString("school"));
          tutorCertification.put("major", rs.getString("major"));
          tutorCertification.put("gender", rs.getString("gender"));
          tutorCertification.put("education", rs.getString("education"));
          tutorCertification.put("gpa", rs.getString("gpa"));
          tutorCertification.put("certificate", rs.getString("certificate"));
          tutorCertification.put("real_name", rs.getString("real_name"));
          tutorCertification.put("id_card", rs.getString("id_card"));
          tutorCertification.put("age", rs.getString("age"));
          tutorCertification.put("native_place", rs.getString("native_place"));
          tutorCertification.put("xuexin_screenshot", rs.getString("xuexin_screenshot"));

          return new TutorApplicantProfile(
              rs.getString("public_id"),
              rs.getInt("hired_times"),
              rs.getString("availability"),
              rs.getString("status"),
              support.toAmount(rs.getLong("trial_fee_cents")),
              support.defaultText(rs.getString("trial_schedule"), ""),
              support.defaultText(rs.getString("service_schedule"), ""),
              rs.getString("service_confirmation_cancelled_by"),
              tutorInformation,
              tutorCertification
          );
        },
        tutorDemandId,
        TUTOR_APPLICANT_STATUS_REJECTED,
        TUTOR_APPLICANT_STATUS_CANCELLED,
        TUTOR_APPLICANT_STATUS_ENDED,
        TUTOR_APPLICANT_STATUS_TRIAL_ENDED,
        TUTOR_APPLICANT_STATUS_FORMAL_SERVICE_INVALID
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
            SELECT ta.id, ta.public_id, td.public_id AS demand_public_id, ta.status
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
            rs.getString("status")
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
            SELECT id, public_id, ? AS demand_public_id, status
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
            rs.getString("status")
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
            FROM tutor_applicant ta
            JOIN tutor_application_schedule tas ON tas.tutor_applicant_id = ta.id
            WHERE ta.tutor_demand_id = ?
              AND ta.enabled = TRUE
              AND ta.status NOT IN (?, ?, ?)
              AND tas.stage = ?
              AND tas.enabled = TRUE
              AND COALESCE(NULLIF(tas.schedule_summary, ''), '') <> ''
            """,
        Integer.class,
        tutorDemandId,
        TUTOR_APPLICANT_STATUS_CANCELLED,
        TUTOR_APPLICANT_STATUS_ENDED,
        TUTOR_APPLICANT_STATUS_REJECTED,
        TUTOR_APPLICATION_SCHEDULE_STAGE_TRIAL
    );
    return count != null && count > 0;
  }


  /** 校验并标准化家长提交的结构化试课日程。 */
  private TutorTrialSchedule normalizeTutorTrialSchedule(ConfirmTutorTrialRequest request) {
    if (request == null || request.dates() == null || request.dates().isEmpty()) {
      throw new BusinessException("TUTOR_TRIAL_SCHEDULE_REQUIRED", "请先制定试课安排");
    }
    if (request.dates().size() > TUTOR_TRIAL_PARENT_MAX_DAYS) {
      throw new BusinessException("TUTOR_TRIAL_SCHEDULE_TOO_MANY_DAYS", "试课安排最多选择 3 天");
    }

    Map<LocalDate, List<TutorTrialTimeRange>> scheduleMap = new HashMap<>();
    for (ConfirmTutorTrialRequest.TrialScheduleDate scheduleDate : request.dates()) {
      if (scheduleDate == null) {
        throw new BusinessException("TUTOR_TRIAL_SCHEDULE_INVALID", "试课日期格式不正确");
      }

      LocalDate date;
      try {
        date = LocalDate.parse(support.defaultText(scheduleDate.date(), "").strip());
      } catch (DateTimeParseException exception) {
        throw new BusinessException("TUTOR_TRIAL_SCHEDULE_INVALID", "试课日期格式不正确");
      }
      if (scheduleMap.containsKey(date)) {
        throw new BusinessException("TUTOR_TRIAL_SCHEDULE_INVALID", "同一试课日期不能重复提交");
      }
      if (scheduleDate.timeRanges() == null || scheduleDate.timeRanges().isEmpty()) {
        throw new BusinessException("TUTOR_TRIAL_SCHEDULE_INVALID", "每天至少安排一个试课时间段");
      }

      List<TutorTrialTimeRange> timeRanges = new ArrayList<>();
      for (ConfirmTutorTrialRequest.TrialScheduleTimeRange timeRange : scheduleDate.timeRanges()) {
        if (timeRange == null) {
          throw new BusinessException("TUTOR_TRIAL_SCHEDULE_INVALID", "试课时间格式不正确");
        }

        LocalTime start = parseSubmittedTutorTrialTime(timeRange.start());
        LocalTime end = parseSubmittedTutorTrialTime(timeRange.end());
        if (!end.isAfter(start)) {
          throw new BusinessException("TUTOR_TRIAL_SCHEDULE_INVALID", "试课结束时间必须晚于开始时间");
        }
        timeRanges.add(new TutorTrialTimeRange(start, end));
      }
      timeRanges.sort((left, right) -> {
        int startComparison = left.start().compareTo(right.start());

        return startComparison == 0 ? left.end().compareTo(right.end()) : startComparison;
      });
      scheduleMap.put(date, timeRanges);
    }

    List<LocalDate> sortedDates = scheduleMap.keySet().stream().sorted().toList();
    List<String> scheduleLines = new ArrayList<>();
    for (LocalDate date : sortedDates) {
      List<String> ranges = scheduleMap.get(date).stream()
          .map((range) -> range.start().format(TUTOR_TRIAL_TIME_FORMATTER)
              + "-"
              + range.end().format(TUTOR_TRIAL_TIME_FORMATTER))
          .toList();
      scheduleLines.add(
          date.getYear() + "年" + date.getMonthValue() + "月" + date.getDayOfMonth() + "日 " + String.join(" ", ranges)
      );
    }

    return new TutorTrialSchedule(
        sortedDates.get(0).toString(),
        sortedDates.get(sortedDates.size() - 1).toString(),
        String.join("；", scheduleLines)
    );
  }


  /** 严格解析提交时间，禁止 DateTimeFormatter SMART 模式把 24:00 归一为次日零点。 */
  private LocalTime parseSubmittedTutorTrialTime(String timeValue) {
    Matcher matcher = TUTOR_TRIAL_TIME_PATTERN.matcher(support.defaultText(timeValue, "").strip());
    if (!matcher.matches()) {
      throw new BusinessException("TUTOR_TRIAL_SCHEDULE_INVALID", "试课时间格式不正确");
    }

    int hour = Integer.parseInt(matcher.group(1));
    int minute = Integer.parseInt(matcher.group(2));
    if (hour > 23 || minute > 59) {
      throw new BusinessException("TUTOR_TRIAL_SCHEDULE_INVALID", "试课时间格式不正确");
    }

    return LocalTime.of(hour, minute);
  }


  /** 查询学生提交的原始可用时间，供延期保留的正式日程 workflow 校验使用。 */
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
        (rs, rowNum) -> support.defaultText(rs.getString("availability"), ""),
        tutorDemandId,
        applicationId
    );
    if (rows.isEmpty()) {
      throw new BusinessException("TUTOR_APPLICATION_NOT_FOUND", "试课申请不存在或无权操作");
    }
    return rows.get(0);
  }


  /** 校验学生提交的正式家教可用时间，避免同意正式雇佣时没有可排期依据。 */
  private String requireTutorServiceAvailability(TutorWorkflowActionRequest request) {
    String availability = request == null ? "" : support.clean(request.availability());
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


  /** 校验学生提交的正式家教可用时间不能重复占用已经完成的试课时段。 */
  private void assertTutorServiceAvailabilityNotOverlappingTrialSchedule(String serviceAvailability, String trialSchedule) {
    Map<LocalDate, List<TutorTrialTimeRange>> trialScheduleMap = parseTutorTrialScheduleMap(trialSchedule);
    if (trialScheduleMap.isEmpty()) {
      return;
    }

    Map<LocalDate, List<TutorTrialTimeRange>> availabilityMap = parseTutorTrialScheduleMap(serviceAvailability);
    for (Map.Entry<LocalDate, List<TutorTrialTimeRange>> entry : availabilityMap.entrySet()) {
      List<TutorTrialTimeRange> trialRanges = trialScheduleMap.get(entry.getKey());
      if (trialRanges == null) {
        continue;
      }

      for (TutorTrialTimeRange availabilityRange : entry.getValue()) {
        boolean overlapsTrialRange = trialRanges.stream().anyMatch((trialRange) -> trialRange.overlaps(availabilityRange));
        if (overlapsTrialRange) {
          throw new BusinessException("TUTOR_SERVICE_AVAILABILITY_OVERLAPS_TRIAL", "可家教时间不能包含已经试课的时间段");
        }
      }
    }
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
    for (String line : support.defaultText(scheduleText, "").split("[；;]")) {
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


  /** 兼容旧版家教计薪文案，并收敛到当前发布表单口径。 */
  private String normalizedTutorWageMode(String wageMode) {
    String normalizedWageMode = support.defaultText(wageMode, "按小时结算");

    return switch (normalizedWageMode) {
      case "按课时结算" -> "按小时结算";
      case "按次结算" -> "按天结算";
      case "按小时结算", "按天结算", "汇总结算" -> normalizedWageMode;
      default -> "汇总结算";
    };
  }


  private boolean isTutorWageAmountRequired(String wageMode) {
    return "按小时结算".equals(wageMode) || "按天结算".equals(wageMode);
  }


  /** 生成家教兼职预算展示文案，供学生列表和家长进行中卡片共用。 */
  private String tutorWageBudgetLabel(String wageMode, long wageAmountCents, boolean trialEnabled) {
    String trialLabel = trialEnabled ? " · 需要试课" : "";

    if (!isTutorWageAmountRequired(wageMode)) {
      return wageMode + trialLabel;
    }

    String unit = "按天结算".equals(wageMode) ? "天" : "小时";

    return wageMode + " · ¥" + support.toAmount(wageAmountCents) + "/" + unit + trialLabel;
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
    long trialFeeCents = support.toTrialFeeCents(trialFee);
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


  /** 学生同意正式雇佣或重提可家教时间时，只重置正式阶段日程，保留同一申请子任务的试课历史。 */
  private void updateTutorServiceAvailabilityAndResetServiceSchedule(long applicationId, String availability, String status) {
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
    clearTutorApplicationSchedule(applicationId, TUTOR_APPLICATION_SCHEDULE_STAGE_SERVICE);
  }


  /** 写入家长提交的正式兼职日程，日程本身统一归属到申请子任务日程表。 */
  private void updateTutorApplicationServiceSchedule(long applicationId, String tutorSchedule, String status) {
    upsertTutorApplicationSchedule(applicationId, TUTOR_APPLICATION_SCHEDULE_STAGE_SERVICE, tutorSchedule, "parent");
    jdbcTemplate.update(
        """
            UPDATE tutor_applicant
            SET status = ?,
                updated_at = NOW()
            WHERE id = ?
            """,
        status,
        applicationId
    );
  }


  /** 按申请子任务和阶段查询唯一日程摘要，所有展示入口都应以该表为来源。 */
  private String tutorApplicationSchedule(long applicationId, String stage) {
    List<String> rows = jdbcTemplate.query(
        """
            SELECT COALESCE(NULLIF(schedule_summary, ''), '')
            FROM tutor_application_schedule
            WHERE tutor_applicant_id = ?
              AND stage = ?
              AND enabled = TRUE
            LIMIT 1
            """,
        (rs, rowNum) -> support.defaultText(rs.getString(1), ""),
        applicationId,
        stage
    );

    return rows.isEmpty() ? "" : rows.get(0);
  }


  /** 使用外部申请 ID 写入阶段日程，用于家长确认试课等仅持有 public_id 的流程。 */
  private void upsertTutorApplicationScheduleByPublicId(
      long demandId,
      String applicationPublicId,
      String stage,
      String scheduleStart,
      String scheduleEnd,
      String scheduleSummary,
      String createdByRole
  ) {
    int updatedRows = jdbcTemplate.update(
        """
            INSERT INTO tutor_application_schedule (
              tutor_applicant_id,
              stage,
              schedule_start,
              schedule_end,
              schedule_summary,
              created_by_role,
              enabled
            )
            SELECT id, ?, ?, ?, ?, ?, TRUE
            FROM tutor_applicant
            WHERE tutor_demand_id = ?
              AND public_id = ?
              AND enabled = TRUE
            ON CONFLICT (tutor_applicant_id, stage) DO UPDATE
            SET schedule_start = EXCLUDED.schedule_start,
                schedule_end = EXCLUDED.schedule_end,
                schedule_summary = EXCLUDED.schedule_summary,
                created_by_role = EXCLUDED.created_by_role,
                enabled = TRUE,
                updated_at = NOW()
            """,
        stage,
        scheduleStart,
        scheduleEnd,
        scheduleSummary,
        createdByRole,
        demandId,
        applicationPublicId
    );
    if (updatedRows == 0) {
      throw new BusinessException("TUTOR_APPLICATION_NOT_FOUND", "试课申请不存在或无权操作");
    }
  }


  /** 写入申请子任务阶段日程，并同步该阶段日程的起止日期。 */
  private void upsertTutorApplicationSchedule(long applicationId, String stage, String schedule, String createdByRole) {
    if (schedule.isBlank()) {
      throw new BusinessException("TUTOR_SERVICE_SCHEDULE_REQUIRED", "请先提交兼职日程");
    }
    if (parseTutorTrialScheduleMap(schedule).isEmpty()) {
      throw new BusinessException("TUTOR_SERVICE_SCHEDULE_REQUIRED", "兼职日程格式不正确");
    }

    jdbcTemplate.update(
        """
            INSERT INTO tutor_application_schedule (
              tutor_applicant_id,
              stage,
              schedule_start,
              schedule_end,
              schedule_summary,
              created_by_role,
              enabled
            )
            VALUES (?, ?, ?, ?, ?, ?, TRUE)
            ON CONFLICT (tutor_applicant_id, stage) DO UPDATE
            SET schedule_start = EXCLUDED.schedule_start,
                schedule_end = EXCLUDED.schedule_end,
                schedule_summary = EXCLUDED.schedule_summary,
                created_by_role = EXCLUDED.created_by_role,
                enabled = TRUE,
                updated_at = NOW()
            """,
        applicationId,
        stage,
        tutorScheduleStart(schedule),
        tutorScheduleEnd(schedule),
        schedule,
        createdByRole
    );
  }


  /** 清空指定阶段日程，保留记录用于审计时间戳和后续覆盖。 */
  private void clearTutorApplicationSchedule(long applicationId, String stage) {
    jdbcTemplate.update(
        """
            UPDATE tutor_application_schedule
            SET schedule_start = '',
                schedule_end = '',
                schedule_summary = '',
                enabled = FALSE,
                updated_at = NOW()
            WHERE tutor_applicant_id = ?
              AND stage = ?
            """,
        applicationId,
        stage
    );
  }


  private String tutorScheduleStart(String schedule) {
    List<LocalDate> dates = parseTutorTrialScheduleMap(schedule).keySet().stream().sorted().toList();
    return dates.isEmpty() ? "" : dates.get(0).toString();
  }


  private String tutorScheduleEnd(String schedule) {
    List<LocalDate> dates = parseTutorTrialScheduleMap(schedule).keySet().stream().sorted().toList();
    return dates.isEmpty() ? "" : dates.get(dates.size() - 1).toString();
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
            rs.getString("trial_hire_decision")
        ),
        applicationId
    );
    if (rows.isEmpty()) {
      throw new BusinessException("TUTOR_APPLICATION_NOT_FOUND", "试课申请不存在或无权操作");
    }
    return rows.get(0);
  }


  private String tutorPeriod(String periodStart, String periodEnd) {
    String start = support.defaultText(periodStart, "待定");
    String end = support.defaultText(periodEnd, "待定");
    return start + " 至 " + end;
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
      String status
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
      String trialHireDecision
  ) {
  }


  /** 已标准化的试课日程持久化字段。 */
  private record TutorTrialSchedule(String start, String end, String summary) {
  }


  /** 试课或正式课程的时间段，用于标准化日程和校验时间关系。 */
  private record TutorTrialTimeRange(LocalTime start, LocalTime end) {
    private boolean contains(TutorTrialTimeRange target) {
      return !target.start().isBefore(start) && !target.end().isAfter(end);
    }

    private boolean overlaps(TutorTrialTimeRange target) {
      return start.isBefore(target.end()) && end.isAfter(target.start());
    }
  }
}
