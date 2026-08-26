package com.unknown.platform.modules.clientworkspace.model;

import com.unknown.platform.common.api.UserNickname;
import com.unknown.platform.modules.auth.model.ClientRole;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * 客户端工作台聚合响应，按角色返回多个模块的首页级数据。
 *
 * <p>进行中订单不再由这个聚合响应承载，改为独立的
 * {@code GET /client/workspace/ongoing} 接口，见 {@link ClientOrder}。</p>
 */
public record ClientWorkspaceResponse(
    List<PartTimeJob> partTimeJobs,
    HuntingSummary huntingSummary,
    List<HuntingTask> huntingTasks,
    List<TutorDemand> tutorDemands,
    MerchantDashboard merchantDashboard,
    List<MerchantProduct> merchantProducts,
    WalletSummary walletSummary,
    List<WalletRecord> walletRecords
) {
  /** 进行中订单或商品订单卡片摘要。 */
  public record ClientOrder(
      String id,
      ClientRole role,
      String title,
      String status,
      /** 家教主卡专用：当前活跃申请的状态 KEY，非家教品类或无活跃申请时为 null；
       *  跟 {@code status}（需求主状态 KEY）分开返回，不再由后端拼成复合展示串，
       *  由前端按需组合展示，详见 docs/家教状态模型治理建议.md。 */
      String activeApplicantStatus,
      BigDecimal amount,
      String contact,
      String detail,
      String risk,
      String amountLabel,
      String category,
      String phoneNumber,
      /** 家教卡片专用：学科，非家教品类为 null。 */
      String subject,
      /** 家教卡片专用：家教地址，非家教品类为 null。 */
      String address,
      /** 家教卡片专用：计划周期实际选中的完整日期集合，允许不连续的零散日期；非家教品类为 null。 */
      List<String> periodDates,
      BigDecimal quoteAmount,
      Integer quoteCount,
      Integer trialCount,
      String quoteActionLabel,
      String quoteId,
      Boolean canCall,
      Boolean canMessage,
      Boolean canRequestCancel,
      Boolean canRequestComplete,
      Boolean canConfirmCancel,
      Boolean canConfirmComplete,
      Boolean canRepublish,
      Boolean canAgreeTrial,
      Boolean canOpenTrialResult,
      Boolean canOpenTrialSchedule,
      Boolean canOpenTutorTrialList,
      Boolean canOpenTutorApplications,
      Boolean canRejectTrial,
      Boolean canCancelTutorApplication,
      /** 家教卡片专用：展示所需的完整需求结构（含发布方昵称、原始描述等），非家教品类为 null；
       *  不含申请人列表（{@code applicants} 恒为空），申请人详情由独立的
       *  {@code GET /workspace/ongoing/tutor} 按需查询，避免进行中列表一次性预加载。 */
      TutorDemand tutorDemand
  ) {
    /**
     * 创建 {@link ClientOrder} 构造器。
     *
     * <p>该记录字段较多（含 15 个 {@code can*} 权限位），直接使用位置参数构造极易在
     * 维护时错位传参；调用方应通过具名方法逐个赋值，未显式设置的字段保持 {@code null}，
     * 与原先直接传 {@code null} 的语义一致。</p>
     */
    public static Builder builder() {
      return new Builder();
    }

    /** {@link ClientOrder} 的可变构造器，见 {@link ClientOrder#builder()}。 */
    public static final class Builder {
      private String id;
      private ClientRole role;
      private String title;
      private String status;
      private String activeApplicantStatus;
      private BigDecimal amount;
      private String contact;
      private String detail;
      private String risk;
      private String amountLabel;
      private String category;
      private String phoneNumber;
      private String subject;
      private String address;
      private List<String> periodDates;
      private BigDecimal quoteAmount;
      private Integer quoteCount;
      private Integer trialCount;
      private String quoteActionLabel;
      private String quoteId;
      private Boolean canCall;
      private Boolean canMessage;
      private Boolean canRequestCancel;
      private Boolean canRequestComplete;
      private Boolean canConfirmCancel;
      private Boolean canConfirmComplete;
      private Boolean canRepublish;
      private Boolean canAgreeTrial;
      private Boolean canOpenTrialResult;
      private Boolean canOpenTrialSchedule;
      private Boolean canOpenTutorTrialList;
      private Boolean canOpenTutorApplications;
      private Boolean canRejectTrial;
      private Boolean canCancelTutorApplication;
      private TutorDemand tutorDemand;

      private Builder() {
      }

      public Builder id(String id) {
        this.id = id;
        return this;
      }

      public Builder role(ClientRole role) {
        this.role = role;
        return this;
      }

      public Builder title(String title) {
        this.title = title;
        return this;
      }

      public Builder status(String status) {
        this.status = status;
        return this;
      }

      public Builder activeApplicantStatus(String activeApplicantStatus) {
        this.activeApplicantStatus = activeApplicantStatus;
        return this;
      }

      public Builder amount(BigDecimal amount) {
        this.amount = amount;
        return this;
      }

      public Builder contact(String contact) {
        this.contact = contact;
        return this;
      }

      public Builder detail(String detail) {
        this.detail = detail;
        return this;
      }

      public Builder risk(String risk) {
        this.risk = risk;
        return this;
      }

      public Builder amountLabel(String amountLabel) {
        this.amountLabel = amountLabel;
        return this;
      }

      public Builder category(String category) {
        this.category = category;
        return this;
      }

      public Builder phoneNumber(String phoneNumber) {
        this.phoneNumber = phoneNumber;
        return this;
      }

      public Builder subject(String subject) {
        this.subject = subject;
        return this;
      }

      public Builder address(String address) {
        this.address = address;
        return this;
      }

      public Builder periodDates(List<String> periodDates) {
        this.periodDates = periodDates;
        return this;
      }

      public Builder quoteAmount(BigDecimal quoteAmount) {
        this.quoteAmount = quoteAmount;
        return this;
      }

      public Builder quoteCount(Integer quoteCount) {
        this.quoteCount = quoteCount;
        return this;
      }

      public Builder trialCount(Integer trialCount) {
        this.trialCount = trialCount;
        return this;
      }

      public Builder quoteActionLabel(String quoteActionLabel) {
        this.quoteActionLabel = quoteActionLabel;
        return this;
      }

      public Builder quoteId(String quoteId) {
        this.quoteId = quoteId;
        return this;
      }

      public Builder canCall(Boolean canCall) {
        this.canCall = canCall;
        return this;
      }

      public Builder canMessage(Boolean canMessage) {
        this.canMessage = canMessage;
        return this;
      }

      public Builder canRequestCancel(Boolean canRequestCancel) {
        this.canRequestCancel = canRequestCancel;
        return this;
      }

      public Builder canRequestComplete(Boolean canRequestComplete) {
        this.canRequestComplete = canRequestComplete;
        return this;
      }

      public Builder canConfirmCancel(Boolean canConfirmCancel) {
        this.canConfirmCancel = canConfirmCancel;
        return this;
      }

      public Builder canConfirmComplete(Boolean canConfirmComplete) {
        this.canConfirmComplete = canConfirmComplete;
        return this;
      }

      public Builder canRepublish(Boolean canRepublish) {
        this.canRepublish = canRepublish;
        return this;
      }

      public Builder canAgreeTrial(Boolean canAgreeTrial) {
        this.canAgreeTrial = canAgreeTrial;
        return this;
      }

      public Builder canOpenTrialResult(Boolean canOpenTrialResult) {
        this.canOpenTrialResult = canOpenTrialResult;
        return this;
      }

      public Builder canOpenTrialSchedule(Boolean canOpenTrialSchedule) {
        this.canOpenTrialSchedule = canOpenTrialSchedule;
        return this;
      }

      public Builder canOpenTutorTrialList(Boolean canOpenTutorTrialList) {
        this.canOpenTutorTrialList = canOpenTutorTrialList;
        return this;
      }

      public Builder canOpenTutorApplications(Boolean canOpenTutorApplications) {
        this.canOpenTutorApplications = canOpenTutorApplications;
        return this;
      }

      public Builder canRejectTrial(Boolean canRejectTrial) {
        this.canRejectTrial = canRejectTrial;
        return this;
      }

      public Builder canCancelTutorApplication(Boolean canCancelTutorApplication) {
        this.canCancelTutorApplication = canCancelTutorApplication;
        return this;
      }

      public Builder tutorDemand(TutorDemand tutorDemand) {
        this.tutorDemand = tutorDemand;
        return this;
      }

      /** 按当前已赋值的字段构造 {@link ClientOrder}，未设置字段保持 {@code null}。 */
      public ClientOrder build() {
        return new ClientOrder(
            id, role, title, status, activeApplicantStatus, amount, contact, detail, risk, amountLabel, category,
            phoneNumber, subject, address, periodDates, quoteAmount, quoteCount, trialCount, quoteActionLabel, quoteId,
            canCall, canMessage, canRequestCancel, canRequestComplete, canConfirmCancel,
            canConfirmComplete, canRepublish, canAgreeTrial, canOpenTrialResult, canOpenTrialSchedule,
            canOpenTutorTrialList, canOpenTutorApplications, canRejectTrial, canCancelTutorApplication, tutorDemand
        );
      }
    }
  }

  /** 兼职列表卡片摘要，承接学生兼职和商户招聘工作台展示。 */
  public record PartTimeJob(
      String id,
      UserNickname publisher,
      String title,
      String description,
      BigDecimal hourlyPay,
      String period,
      String location,
      String status,
      String requirement,
      List<String> formFields,
      String fundingState,
      String signRule
  ) {
  }

  /** 学生狩猎资格、押金、信用和上线状态摘要。 */
  public record HuntingSummary(
      String studentCertification,
      String secondVerification,
      String depositText,
      String creditText,
      String onlineStatus
  ) {
  }

  /** 委托/狩猎任务卡片，包含发布侧、服务侧和报价协商侧的展示字段。 */
  public record HuntingTask(
      String id,
      String title,
      String description,
      String mode,
      BigDecimal fee,
      String latestTime,
      String location,
      String urgency,
      String status,
      String publishTime,
      String destination,
      String requirement,
      List<String> requirementTags,
      UserNickname publisher,
      UserNickname acceptedUser,
      Boolean isMine,
      Boolean isAcceptedByMe,
      Boolean isQuotedByMe,
      BigDecimal pendingAmount,
      String pendingQuoteId,
      String pendingQuoteStatus,
      String fulfillmentAction,
      Boolean fulfillmentActionByMe,
      Boolean amountNegotiable,
      Boolean depositRequired,
      BigDecimal depositAmount,
      int quoteCount,
      List<HuntingQuote> quotes
  ) {
  }

  /** 委托报价记录，发布方可看全部，服务方仅看自己的报价协商记录。 */
  public record HuntingQuote(
      String id,
      UserNickname bidder,
      BigDecimal amount,
      BigDecimal originalAmount,
      String quoteTime,
      String status,
      Boolean isSelected
  ) {
  }

  /** 家教招募报名学生摘要。 */
  public record TutorApplicant(
      String id,
      String nickname,
      String school,
      String major,
      String gpa,
      int hiredTimes,
      String availability,
      String status,
      BigDecimal trialFee,
      String trialSchedule,
      String serviceSchedule,
      String serviceConfirmationCancelledBy
  ) {
  }

  /**
   * 试课申请候选人及其完整认证资料，供"进行中"弹窗按需求 id 查询申请人列表使用。顶层 {@code id} 是这条
   * 申请记录自己的 id（不是学生账号 id），加上申请工作流字段（跟 {@link TutorApplicant} 一致，但不含
   * school/major/gpa——{@code tutor_applicant} 表这三列只是提交申请时写入的占位文案，从未真正被业务
   * 填充过，展示这几列等于一直在展示假数据）；{@code tutorInformation}/{@code tutorCertification}
   * 是该申请人的身份和认证资料，字段口径和取值方式都跟 {@code /workspace/tutors} 保持一致，直接返回
   * app_user/tutor_certification 两张表的原始列值，不做加工/打码——申请相关数据和 tutor 本身信息按
   * 来源分离，不混在同一层级。
   */
  public record TutorApplicantProfile(
      String id,
      int hiredTimes,
      String availability,
      String status,
      BigDecimal trialFee,
      String trialSchedule,
      String serviceSchedule,
      String serviceConfirmationCancelledBy,
      Map<String, Object> tutorInformation,
      Map<String, Object> tutorCertification
  ) {
  }

  /** 家长家教招募需求摘要。 */
  public record TutorDemand(
      String id,
      String child,
      String subject,
      String school,
      String budget,
      String status,
      String title,
      String description,
      String addressLabel,
      String period,
      /** 计划周期实际选中的完整日期集合，允许不连续的零散日期；period 只是这个集合的开始至结束摘要文案。 */
      List<String> periodDates,
      UserNickname publisher,
      String sourceType,
      List<TutorApplicant> applicants
  ) {
  }

  /** 商户销售和兼职工作台统计面板。 */
  public record MerchantDashboard(
      int salesCount,
      BigDecimal salesAmount,
      int pendingDelivery,
      int delivering,
      int afterSaleMessages,
      int chatMessages,
      int views,
      int favorites,
      int orders,
      int deals,
      String afterSaleRate,
      String partTimeConversion,
      String depositStatus
  ) {
  }

  /** 商户商品卡片摘要。 */
  public record MerchantProduct(
      String id,
      String name,
      String code,
      String model,
      String category,
      BigDecimal price,
      int stock,
      int purchaseLimit,
      String status,
      String visible
  ) {
  }

  /** 钱包账户摘要，区分可提现、观察期和押金/保证金。 */
  public record WalletSummary(
      String withdrawable,
      String observation,
      String deposit,
      String withdrawMethods
  ) {
  }

  /** 钱包流水记录摘要。 */
  public record WalletRecord(
      String id,
      String type,
      String title,
      String amount,
      String status
  ) {
  }
}
