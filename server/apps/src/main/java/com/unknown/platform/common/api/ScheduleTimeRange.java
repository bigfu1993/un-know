package com.unknown.platform.common.api;

/** 用户在一个预设时段内可接受安排的起止时间。 */
public record ScheduleTimeRange(
    String start,
    String end
) {
}
