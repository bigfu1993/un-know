package com.unknown.platform.modules.clientworkspace.model;

import com.unknown.platform.modules.auth.model.ClientRole;
import java.math.BigDecimal;
import java.util.List;

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
  public record ClientOrder(
      String id,
      ClientRole role,
      String title,
      String status,
      BigDecimal amount,
      String contact,
      String detail,
      String risk
  ) {
  }

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

  public record HuntingSummary(
      String studentCertification,
      String secondVerification,
      String depositText,
      String creditText,
      String onlineStatus
  ) {
  }

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
      Boolean amountNegotiable
  ) {
  }

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

  public record TutorDemand(
      String id,
      String child,
      String subject,
      String school,
      String budget,
      String status,
      List<TutorApplicant> applicants
  ) {
  }

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

  public record WalletSummary(
      String withdrawable,
      String observation,
      String deposit,
      String withdrawMethods
  ) {
  }

  public record WalletRecord(
      String id,
      String type,
      String title,
      String amount,
      String status
  ) {
  }
}
