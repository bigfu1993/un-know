package com.unknown.platform.modules.clientprofile.model;

/** 家教资料公开开关请求，开启后家长端可看到学生家教信息。 */
public record UpdateTutorExposureRequest(boolean enabled) {
}
