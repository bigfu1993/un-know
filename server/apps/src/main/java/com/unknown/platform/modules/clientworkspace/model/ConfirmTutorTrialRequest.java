package com.unknown.platform.modules.clientworkspace.model;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

/** 家长提交家教试课日程请求，起止日期和展示摘要统一由服务端派生。 */
public record ConfirmTutorTrialRequest(
    @NotEmpty(message = "试课安排不能为空")
    @Size(max = 3, message = "试课安排最多选择 3 天")
    List<@NotNull(message = "试课日期不能为空") @Valid TrialScheduleDate> dates
) {

  /** 单个试课日期及其时间段。 */
  public record TrialScheduleDate(
      @NotBlank(message = "试课日期不能为空") String date,
      @NotEmpty(message = "每天至少安排一个试课时间段")
      List<@NotNull(message = "试课时间段不能为空") @Valid TrialScheduleTimeRange> timeRanges
  ) {
  }

  /** 单个试课时间范围。 */
  public record TrialScheduleTimeRange(
      @NotBlank(message = "试课开始时间不能为空") String start,
      @NotBlank(message = "试课结束时间不能为空") String end
  ) {
  }
}
