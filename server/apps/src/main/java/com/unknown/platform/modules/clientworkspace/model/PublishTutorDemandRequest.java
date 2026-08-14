package com.unknown.platform.modules.clientworkspace.model;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;
import java.util.List;

/** 家长发布家教需求请求，承接 H5 发布表单中的完整招募信息。 */
public record PublishTutorDemandRequest(
    @NotBlank(message = "家教标题不能为空") String title,
    String description,
    @NotBlank(message = "家教学科不能为空") String subject,
    @NotBlank(message = "家教地址不能为空") String addressId,
    @NotBlank(message = "家教地址不能为空") String addressLabel,
    String childId,
    String childName,
    @NotBlank(message = "家教周期开始日期不能为空") String periodStart,
    @NotBlank(message = "家教周期结束日期不能为空") String periodEnd,
    Boolean trialEnabled,
    String trialDuration,
    @DecimalMin("0.00") BigDecimal wageAmount,
    String wageMode,
    List<String> schoolTags,
    String requirement
) {
}
