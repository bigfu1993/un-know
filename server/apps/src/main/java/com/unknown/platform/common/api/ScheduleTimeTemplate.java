package com.unknown.platform.common.api;

import com.fasterxml.jackson.annotation.JsonInclude;

/** 用户按早、中、晚维护的可排期时间模板。 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ScheduleTimeTemplate(
    ScheduleTimeRange morning,
    ScheduleTimeRange afternoon,
    ScheduleTimeRange evening
) {

  /** 判断模板是否未配置任一可用时段。 */
  public boolean isEmpty() {
    return morning == null && afternoon == null && evening == null;
  }
}
