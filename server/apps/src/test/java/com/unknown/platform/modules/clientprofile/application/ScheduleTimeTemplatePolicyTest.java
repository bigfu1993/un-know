package com.unknown.platform.modules.clientprofile.application;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.unknown.platform.common.api.ScheduleTimeRange;
import com.unknown.platform.common.api.ScheduleTimeTemplate;
import com.unknown.platform.common.exception.BusinessException;
import org.junit.jupiter.api.Test;

class ScheduleTimeTemplatePolicyTest {

  @Test
  void acceptsSparseTemplateOnTenMinuteBoundaries() {
    ScheduleTimeTemplate template = new ScheduleTimeTemplate(
        new ScheduleTimeRange("08:30", "11:20"),
        null,
        new ScheduleTimeRange("19:00", "21:30")
    );

    assertDoesNotThrow(() -> ScheduleTimeTemplatePolicy.validateForSave(template));
  }

  @Test
  void rejectsNonTenMinuteValue() {
    ScheduleTimeTemplate template = new ScheduleTimeTemplate(
        new ScheduleTimeRange("08:05", "11:20"), null, null
    );

    assertInvalid(template);
  }

  @Test
  void rejectsRangeWithSeconds() {
    ScheduleTimeTemplate template = new ScheduleTimeTemplate(
        new ScheduleTimeRange("08:00:00", "11:20"), null, null
    );

    assertInvalid(template);
  }

  @Test
  void rejectsRangeWithFractionalSeconds() {
    ScheduleTimeTemplate template = new ScheduleTimeTemplate(
        new ScheduleTimeRange("08:00:00.001", "11:20"), null, null
    );

    assertInvalid(template);
  }

  @Test
  void rejectsRangeOutsideItsPeriodWindow() {
    ScheduleTimeTemplate template = new ScheduleTimeTemplate(
        new ScheduleTimeRange("07:50", "11:20"), null, null
    );

    assertInvalid(template);
  }

  @Test
  void rejectsEqualRange() {
    ScheduleTimeTemplate template = new ScheduleTimeTemplate(
        new ScheduleTimeRange("08:00", "08:00"), null, null
    );

    assertInvalid(template);
  }

  @Test
  void rejectsEmptyTemplate() {
    assertInvalid(new ScheduleTimeTemplate(null, null, null));
  }

  private void assertInvalid(ScheduleTimeTemplate template) {
    BusinessException error = assertThrows(
        BusinessException.class,
        () -> ScheduleTimeTemplatePolicy.validateForSave(template)
    );
    assertEquals("SCHEDULE_TIME_TEMPLATE_INVALID", error.code());
  }
}
