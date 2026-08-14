package com.unknown.platform.modules.clientworkspace.model;

import com.unknown.platform.common.api.UserNickname;
import com.unknown.platform.modules.auth.model.ClientRole;
import java.math.BigDecimal;
import java.util.List;

/** 客户端工作台聚合响应，按角色返回多个模块的首页级数据。 */
public record ClientWorkspaceResponse(
    List<ClientOrder> orders,
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
      BigDecimal amount,
      String contact,
      String detail,
      String risk,
      String amountLabel,
      String category,
      String phoneNumber,
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
      Boolean canCancelTutorApplication
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
      private BigDecimal amount;
      private String contact;
      private String detail;
      private String risk;
      private String amountLabel;
      private String category;
      private String phoneNumber;
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

      /** 按当前已赋值的字段构造 {@link ClientOrder}，未设置字段保持 {@code null}。 */
      public ClientOrder build() {
        return new ClientOrder(
            id, role, title, status, amount, contact, detail, risk, amountLabel, category,
            phoneNumber, quoteAmount, quoteCount, trialCount, quoteActionLabel, quoteId,
            canCall, canMessage, canRequestCancel, canRequestComplete, canConfirmCancel,
            canConfirmComplete, canRepublish, canAgreeTrial, canOpenTrialResult, canOpenTrialSchedule,
            canOpenTutorTrialList, canOpenTutorApplications, canRejectTrial, canCancelTutorApplication
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
