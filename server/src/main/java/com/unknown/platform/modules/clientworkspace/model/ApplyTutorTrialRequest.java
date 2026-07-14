package com.unknown.platform.modules.clientworkspace.model;

/** 学生申请家教试课请求，当前只保留备注，学生身份由登录态确定。 */
public record ApplyTutorTrialRequest(String message) {
}
