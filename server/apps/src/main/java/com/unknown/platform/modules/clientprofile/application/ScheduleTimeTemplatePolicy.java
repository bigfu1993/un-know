package com.unknown.platform.modules.clientprofile.application;

import com.unknown.platform.common.api.ScheduleTimeRange;
import com.unknown.platform.common.api.ScheduleTimeTemplate;
import com.unknown.platform.common.exception.BusinessException;
import java.time.DateTimeException;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.format.ResolverStyle;

/** 用户时间模板的服务端保存约束，防止不符合业务窗口的时间进入持久化数据。 */
public final class ScheduleTimeTemplatePolicy {
  private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm")
      .withResolverStyle(ResolverStyle.STRICT);

  private ScheduleTimeTemplatePolicy() {
  }

  /**
   * 校验用户提交的时间模板包含至少一个合法时段，并且每个时段符合所属时间窗口。
   *
   * @param template 待保存的时间模板
   */
  public static void validateForSave(ScheduleTimeTemplate template) {
    if (template == null || template.isEmpty()) {
      throw new BusinessException("SCHEDULE_TIME_TEMPLATE_INVALID", "时间模板格式不正确");
    }
    validateRange(template.morning(), LocalTime.of(8, 0), LocalTime.of(12, 0));
    validateRange(template.afternoon(), LocalTime.of(12, 0), LocalTime.of(18, 0));
    validateRange(template.evening(), LocalTime.of(18, 0), LocalTime.of(22, 0));
  }

  private static void validateRange(ScheduleTimeRange range, LocalTime periodStart, LocalTime periodEnd) {
    if (range == null) {
      return;
    }

    try {
      LocalTime start = LocalTime.parse(range.start(), TIME_FORMATTER);
      LocalTime end = LocalTime.parse(range.end(), TIME_FORMATTER);
      boolean isTenMinuteBoundary = start.getMinute() % 10 == 0 && end.getMinute() % 10 == 0;
      boolean isWithinPeriod = !start.isBefore(periodStart) && !end.isAfter(periodEnd);
      if (!isTenMinuteBoundary || !isWithinPeriod || !end.isAfter(start)) {
        throw new BusinessException("SCHEDULE_TIME_TEMPLATE_INVALID", "时间模板格式不正确");
      }
    } catch (DateTimeException | NullPointerException exception) {
      throw new BusinessException("SCHEDULE_TIME_TEMPLATE_INVALID", "时间模板格式不正确");
    }
  }
}
