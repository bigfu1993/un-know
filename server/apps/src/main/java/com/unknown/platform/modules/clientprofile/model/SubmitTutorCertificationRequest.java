package com.unknown.platform.modules.clientprofile.model;

import jakarta.validation.constraints.NotBlank;

/**
 * 家教认证提交请求，字段会真实持久化到 {@code tutor_certification} 表，供家长端"认证学生"列表消费。
 */
public record SubmitTutorCertificationRequest(
    @NotBlank String realName,
    @NotBlank String gender,
    @NotBlank String age,
    @NotBlank String nativePlace,
    @NotBlank String idCard,
    @NotBlank String school,
    @NotBlank String major,
    @NotBlank String subject,
    @NotBlank String education,
    String xuexinScreenshot,
    String gpa,
    String certificate
) {
}
