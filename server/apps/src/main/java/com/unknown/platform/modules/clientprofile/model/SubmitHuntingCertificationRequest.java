package com.unknown.platform.modules.clientprofile.model;

import jakarta.validation.constraints.NotBlank;

/**
 * 狩猎认证提交请求，当前阶段仅用表单字段触发服务端审核中状态。
 */
public record SubmitHuntingCertificationRequest(
    @NotBlank String realName,
    @NotBlank String gender,
    @NotBlank String age,
    @NotBlank String nativePlace,
    @NotBlank String idCard,
    @NotBlank String school,
    @NotBlank String major
) {
}
