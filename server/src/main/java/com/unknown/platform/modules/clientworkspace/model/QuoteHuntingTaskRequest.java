package com.unknown.platform.modules.clientworkspace.model;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

/** 服务方提交委托协商报价的请求体。 */
public record QuoteHuntingTaskRequest(
    @NotNull(message = "报价金额不能为空")
    @DecimalMin(value = "0.01", message = "报价金额必须大于 0")
    BigDecimal amount
) {
}
