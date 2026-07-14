package com.unknown.platform.modules.clientworkspace.model;

/** 狩猎项目下一站响应。 */
public record HuntingProjectStopResponse(
    String inputMode,
    String area,
    String customArea,
    String etaStart,
    String etaEnd
) {
}
