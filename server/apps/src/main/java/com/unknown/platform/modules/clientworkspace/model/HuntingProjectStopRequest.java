package com.unknown.platform.modules.clientworkspace.model;

/** 狩猎项目下一站区域信息，支持下拉区域和自定义区域两种模式。 */
public record HuntingProjectStopRequest(
    String inputMode,
    String area,
    String customArea,
    String etaStart,
    String etaEnd
) {
}
