package com.unknown.platform.modules.clientworkspace.model;

/** 家长确认结束试课时的聘用决策。 */
public record CompleteTutorTrialEndRequest(
    Boolean hireTutor,
    String tutorSchedule
) {
}
