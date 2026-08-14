package com.unknown.platform.modules.clientworkspace.model;

import jakarta.validation.constraints.NotBlank;

/** 家长确认家教试课安排请求。 */
public record ConfirmTutorTrialRequest(
    @NotBlank(message = "试课开始日期不能为空") String trialStart,
    @NotBlank(message = "试课结束日期不能为空") String trialEnd,
    @NotBlank(message = "试课安排不能为空") String trialHalfDay
) {
}
