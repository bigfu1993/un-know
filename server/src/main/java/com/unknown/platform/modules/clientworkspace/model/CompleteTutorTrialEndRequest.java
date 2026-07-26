package com.unknown.platform.modules.clientworkspace.model;

import java.math.BigDecimal;

/** 家长确认结束试课时的聘用决策。 */
public record CompleteTutorTrialEndRequest(
    Boolean hireTutor,
    String tutorSchedule,
    BigDecimal trialFee
) {
}
