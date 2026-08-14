package com.unknown.platform.modules.clientworkspace.model;

import jakarta.validation.constraints.NotBlank;
import java.util.List;

/** 创建狩猎项目请求，系统根据当前区域和下一站动线匹配推荐委托。 */
public record CreateHuntingProjectRequest(
    @NotBlank(message = "当前所在区域不能为空") String currentArea,
    List<HuntingProjectStopRequest> nextStops
) {
}
