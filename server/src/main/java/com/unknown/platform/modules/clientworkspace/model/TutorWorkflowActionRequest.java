package com.unknown.platform.modules.clientworkspace.model;

import java.math.BigDecimal;

/** 家教流程动作请求，按流程图节点推进申请、试课、正式雇佣和结算状态。 */
public record TutorWorkflowActionRequest(
    String action,
    String tutorSchedule,
    String availability,
    String reasonType,
    Boolean continueRecruiting,
    Boolean hireTutor,
    BigDecimal trialFee
) {
}
