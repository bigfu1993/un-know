package com.unknown.platform.modules.clientworkspace.model;

import java.util.List;

/** 狩猎项目响应，包含项目状态、推荐数量和下一站动线。 */
public record HuntingProjectResponse(
    String id,
    String currentArea,
    String status,
    int matchedCount,
    List<HuntingProjectStopResponse> nextStops
) {
}
