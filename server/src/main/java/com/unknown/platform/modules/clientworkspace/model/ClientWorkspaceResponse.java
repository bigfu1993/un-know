package com.unknown.platform.modules.clientworkspace.model;

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
      Boolean canOpenTutorApplications,
      Boolean canRejectTrial
  ) {
  }

  /** 兼职列表卡片摘要，承接学生兼职和商户招聘工作台展示。 */
  public record PartTimeJob(
      String id,
      String publisher,
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
      String publisherName,
      String publisherPhone,
      String acceptedUserName,
      String acceptedUserPhone,
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
      String bidderName,
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
      String name,
      String school,
      String major,
      String gpa,
      int hiredTimes,
      String availability,
      String status
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
      String publisherName,
      String publisherPhone,
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
