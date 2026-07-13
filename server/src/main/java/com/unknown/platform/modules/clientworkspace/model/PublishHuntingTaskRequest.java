package com.unknown.platform.modules.clientworkspace.model;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.List;

/** 委托发布请求，承接 H5 发布弹窗中的委托和回收表单。 */
public record PublishHuntingTaskRequest(
    @NotBlank @Size(max = 160) String title,
    @DecimalMin("0.00") BigDecimal amount,
    Boolean amountNegotiable,
    @Size(max = 500) String description,
    @NotBlank @Size(max = 80) String latestTime,
    @Size(max = 160) String destination,
    @Size(max = 160) String location,
    @Size(max = 500) String requirement,
    List<String> requirementTags,
    Boolean depositRequired,
    @DecimalMin("0.00") BigDecimal depositAmount,
    @NotBlank @Size(max = 32) String type
) {
}
