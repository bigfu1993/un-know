/** 判断申请是否处于等待家长处理阶段。 */
export function isTutorApplicationPendingStatus(status?: string) {
  return Boolean(status?.includes(TutorStatus.ApplicationPending));
}

/** 判断家教试课申请是否处于家长已确认日程、等待试课确认的状态。 */
export function isTutorTrialConfirmingStatus(status?: string) {
  return Boolean(status?.includes(TutorStatus.TrialConfirming));
}

/** 判断家教试课申请是否处于试课中。 */
export function isTutorTrialingStatus(status?: string) {
  const normalizedStatus = status ?? "";

  return Boolean(
    normalizedStatus.includes(TutorStatus.Trialing) &&
      !isTutorApplicationPendingStatus(normalizedStatus) &&
      !isTutorTrialConfirmingStatus(normalizedStatus) &&
      !isTutorTrialEndConfirmingStatus(normalizedStatus)
  );
}

/** 判断家教试课申请是否处于结束试课确认中。 */
export function isTutorTrialEndConfirmingStatus(status?: string) {
  return Boolean(status?.includes(TutorStatus.TrialEndConfirming));
}

/** 判断正式雇佣是否处于学生发起结束、等待家长结算的状态。 */
export function isTutorServiceEndConfirmingStatus(status?: string) {
  return Boolean(status?.includes(TutorStatus.ServiceEndConfirming));
}

/** 兼容旧数据状态值，统一返回当前产品文案。 */
export function getTutorTrialStatusLabel(status?: string) {
  if (isTutorApplicationPendingStatus(status)) {
    return TutorStatus.ApplicationPending;
  }
  if (isTutorTrialEndConfirmingStatus(status)) {
    return TutorStatus.TrialEndConfirming;
  }
  if (isTutorTrialingStatus(status)) {
    return TutorStatus.Trialing;
  }
  if (isTutorTrialSettledServicePendingStatus(status)) {
    return TutorStatus.TrialSettledServicePending;
  }
  if (isTutorServiceConfirmingStatus(status)) {
    return TutorStatus.ServiceConfirming;
  }
  if (isTutorServiceSchedulePendingStatus(status)) {
    return TutorStatus.ServiceSchedulePending;
  }
  if (isTutorServiceEndConfirmingStatus(status)) {
    return TutorStatus.ServiceEndConfirming;
  }
  if (status?.includes(TutorStatus.DemandInProgress)) {
    return TutorStatus.DemandInProgress;
  }
  if (isTutorServiceScheduleConfirmingStatus(status) || isTutorFormalServiceStatus(status)) {
    return TutorStatus.FormalService;
  }

  return isTutorTrialConfirmingStatus(status) ? TutorStatus.TrialConfirming : status ?? "";
}

/** 判断申请是否处于试课结果处理阶段。 */
export function isTutorTrialResultProcessingStatus(status?: string) {
  return Boolean(status?.includes(TutorStatus.TrialResultProcessing));
}

/** 判断申请是否已完成试课费用确认并等待家长处理雇佣结果。 */
export function isTutorTrialSettledServicePendingStatus(status?: string) {
  return Boolean(status?.includes(TutorStatus.TrialSettledServicePending));
}

/** 判断申请是否处于正式雇佣确认阶段。 */
export function isTutorServiceConfirmingStatus(status?: string) {
  return Boolean(status?.includes(TutorStatus.ServiceConfirming));
}

/** 判断申请是否处于正式雇佣日程待家长提交阶段。 */
export function isTutorServiceSchedulePendingStatus(status?: string) {
  return Boolean(status?.includes(TutorStatus.ServiceSchedulePending));
}

/** 判断申请是否处于旧版兼职日程确认阶段。 */
export function isTutorServiceScheduleConfirmingStatus(status?: string) {
  return Boolean(status?.includes(TutorStatus.ServiceScheduleConfirming));
}

/** 判断申请是否已经进入正式雇佣。 */
export function isTutorFormalServiceStatus(status?: string) {
  const normalizedStatus = status ?? "";

  return Boolean(
    normalizedStatus === TutorStatus.FormalService ||
      normalizedStatus.includes(TutorStatus.DemandInProgress) ||
      isTutorServiceScheduleConfirmingStatus(status)
  );
}

/** 判断申请是否处于结算确认或修改阶段。 */
export function isTutorSettlementStatus(status?: string) {
  return Boolean(
    status?.includes(TutorStatus.SettlementConfirming) ||
      status?.includes(TutorStatus.SettlementRevising) ||
      status?.includes(TutorStatus.SystemSettling)
  );
}

/** 判断学生是否已拒绝正式雇佣。 */
export function isTutorServiceInvalidStatus(status?: string) {
  return Boolean(status?.includes(TutorStatus.ServiceInvalid));
}

/** 判断申请是否处于不可继续操作的终态。 */
export function isTutorTerminalStatus(status?: string) {
  return [
    TutorStatus.Cancelled,
    TutorStatus.Ended,
    TutorStatus.TrialEnded,
    TutorStatus.Rejected,
    TutorStatus.ServiceInvalid
  ].some((item) => status?.includes(item));
}

/** 判断申请是否应进入家长端试课列表。 */
export function isTutorTrialListStatus(status?: string) {
  return (
    isTutorTrialConfirmingStatus(status) ||
    isTutorTrialingStatus(status) ||
    isTutorTrialEndConfirmingStatus(status) ||
    isTutorTrialResultProcessingStatus(status) ||
    isTutorTrialSettledServicePendingStatus(status) ||
    isTutorServiceConfirmingStatus(status) ||
    isTutorServiceSchedulePendingStatus(status) ||
    isTutorServiceScheduleConfirmingStatus(status) ||
    isTutorFormalServiceStatus(status) ||
    isTutorServiceEndConfirmingStatus(status) ||
    isTutorSettlementStatus(status) ||
    isTutorServiceInvalidStatus(status)
  );
}

/** 判断申请是否应保留在家长端试课申请列表。 */
export function isTutorApplicationListStatus(status?: string) {
  return isTutorApplicationPendingStatus(status) && !isTutorTerminalStatus(status);
}

/** 试课日程在进行中卡片详情中的分隔标记。 */
export const tutorTrialScheduleDetailMarker = "试课安排：";

/** 正式雇佣课程安排在进行中卡片详情中的分隔标记。 */
export const tutorServiceScheduleDetailMarker = "课程安排：";

/** 试课申请中学生可试课时间在进行中卡片详情中的分隔标记。 */
export const tutorTrialAvailabilityDetailMarker = "可试课时间：";

/** 正式雇佣阶段学生可家教时间在进行中卡片详情中的分隔标记。 */
export const tutorServiceAvailabilityDetailMarker = "可家教时间：";

/** 试课结算金额在进行中卡片详情中的分隔标记。 */
export const tutorTrialFeeDetailMarker = "试课结算金额：";

/** 正式雇佣结算金额在进行中卡片详情中的分隔标记。 */
export const tutorServiceFeeDetailMarker = "结算金额：";

/** 解析后的单日试课日程。 */
export interface TutorTrialScheduleLine {
  date: string;
  line: string;
  times: string[];
}

/** 将中文日期转为日期 key，便于复用试课日历组件。 */
export function getTutorTrialDateKeyFromLine(line: string) {
  const matchedDate = line.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);

  if (!matchedDate) {
    return "";
  }

  const [, year, month, day] = matchedDate;

  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

/** 将试课安排摘要拆成逐日展示行。 */
export function getTutorTrialScheduleLines(summary?: string) {
  return (summary ?? "")
    .split("；")
    .map((line) => line.trim())
    .filter(Boolean);
}

/** 解析试课安排摘要中的日期与时间段。 */
export function parseTutorTrialSchedule(summary?: string): TutorTrialScheduleLine[] {
  return getTutorTrialScheduleLines(summary).map((line) => ({
    date: getTutorTrialDateKeyFromLine(line),
    line,
    times: line.match(/\d{1,2}:\d{2}-\d{1,2}:\d{2}/g) ?? []
  }));
}

/** 从进行中卡片详情里按指定标记提取片段，避免不同阶段日程互相吞并。 */
function getTutorDetailSegment(detail: string | undefined, marker: string, endMarkers: string[]) {
  const markerIndex = detail?.indexOf(marker) ?? -1;

  if (!detail || markerIndex < 0) {
    return "";
  }

  const segmentText = detail.slice(markerIndex + marker.length);
  const endMarkerIndexes = endMarkers
    .map((endMarker) => segmentText.indexOf(` · ${endMarker}`))
    .filter((index) => index >= 0);
  const endMarkerIndex = endMarkerIndexes.length > 0 ? Math.min(...endMarkerIndexes) : -1;

  return (endMarkerIndex >= 0 ? segmentText.slice(0, endMarkerIndex) : segmentText).trim();
}

/** 从进行中卡片详情里提取试课安排摘要。 */
export function getTutorTrialScheduleSummaryFromOrderDetail(detail?: string) {
  return getTutorDetailSegment(detail, tutorTrialScheduleDetailMarker, [tutorServiceScheduleDetailMarker]);
}

/** 从进行中卡片详情里提取正式课程安排摘要。 */
export function getTutorServiceScheduleSummaryFromOrderDetail(detail?: string) {
  return getTutorDetailSegment(detail, tutorServiceScheduleDetailMarker, [tutorTrialScheduleDetailMarker]);
}

/** 从进行中卡片详情里提取学生可试课或可家教时间，供重新提交日期时回填。 */
export function getTutorTrialAvailabilitySummaryFromOrderDetail(detail?: string) {
  const trialMarkerIndex = detail?.indexOf(tutorTrialAvailabilityDetailMarker) ?? -1;
  const serviceMarkerIndex = detail?.indexOf(tutorServiceAvailabilityDetailMarker) ?? -1;
  const markerIndex = serviceMarkerIndex >= 0 ? serviceMarkerIndex : trialMarkerIndex;
  const markerLength = serviceMarkerIndex >= 0 ? tutorServiceAvailabilityDetailMarker.length : tutorTrialAvailabilityDetailMarker.length;

  if (!detail || markerIndex < 0) {
    return "";
  }

  const availabilityText = detail.slice(markerIndex + markerLength);
  const feeMarkerIndex = availabilityText.indexOf(` · ${tutorTrialFeeDetailMarker}`);
  const serviceFeeMarkerIndex = availabilityText.indexOf(` · ${tutorServiceFeeDetailMarker}`);
  const scheduleMarkerIndex = availabilityText.indexOf(` · ${tutorTrialScheduleDetailMarker}`);
  const serviceScheduleMarkerIndex = availabilityText.indexOf(` · ${tutorServiceScheduleDetailMarker}`);
  const endMarkerIndexes = [feeMarkerIndex, serviceFeeMarkerIndex, scheduleMarkerIndex, serviceScheduleMarkerIndex].filter((index) => index >= 0);
  const endMarkerIndex = endMarkerIndexes.length > 0 ? Math.min(...endMarkerIndexes) : -1;

  return (endMarkerIndex >= 0 ? availabilityText.slice(0, endMarkerIndex) : availabilityText).trim();
}

/** 从进行中卡片详情里提取学生需要确认的试课费用。 */
export function getTutorTrialFeeSummaryFromOrderDetail(detail?: string) {
  const trialMarkerIndex = detail?.indexOf(tutorTrialFeeDetailMarker) ?? -1;
  const serviceMarkerIndex = detail?.indexOf(tutorServiceFeeDetailMarker) ?? -1;
  const markerIndex = serviceMarkerIndex >= 0 ? serviceMarkerIndex : trialMarkerIndex;
  const markerLength = serviceMarkerIndex >= 0 ? tutorServiceFeeDetailMarker.length : tutorTrialFeeDetailMarker.length;

  if (!detail || markerIndex < 0) {
    return "";
  }

  const feeText = detail.slice(markerIndex + markerLength);
  const scheduleMarkerIndex = feeText.indexOf(` · ${tutorTrialScheduleDetailMarker}`);
  const serviceScheduleMarkerIndex = feeText.indexOf(` · ${tutorServiceScheduleDetailMarker}`);
  const endMarkerIndexes = [scheduleMarkerIndex, serviceScheduleMarkerIndex].filter((index) => index >= 0);
  const endMarkerIndex = endMarkerIndexes.length > 0 ? Math.min(...endMarkerIndexes) : -1;

  return (endMarkerIndex >= 0 ? feeText.slice(0, endMarkerIndex) : feeText).trim();
}

/** 清理学生端进行中家教卡片详情，避免直接展示流程标记和长时间范围全文。 */
export function getTutorTrialOrderDisplayDetail(detail?: string) {
  const scheduleMarkerIndex = detail?.indexOf(tutorTrialScheduleDetailMarker) ?? -1;
  const serviceScheduleMarkerIndex = detail?.indexOf(tutorServiceScheduleDetailMarker) ?? -1;
  const feeMarkerIndex = detail?.indexOf(tutorTrialFeeDetailMarker) ?? -1;
  const serviceFeeMarkerIndex = detail?.indexOf(tutorServiceFeeDetailMarker) ?? -1;
  const trialAvailabilityMarkerIndex = detail?.indexOf(tutorTrialAvailabilityDetailMarker) ?? -1;
  const serviceAvailabilityMarkerIndex = detail?.indexOf(tutorServiceAvailabilityDetailMarker) ?? -1;
  const markerIndexes = [
    scheduleMarkerIndex,
    serviceScheduleMarkerIndex,
    feeMarkerIndex,
    serviceFeeMarkerIndex,
    trialAvailabilityMarkerIndex,
    serviceAvailabilityMarkerIndex
  ].filter((index) => index >= 0);
  const visibleEndIndex = markerIndexes.length > 0 ? Math.min(...markerIndexes) : -1;
  const visibleDetail = visibleEndIndex >= 0 ? detail?.slice(0, visibleEndIndex).replace(/\s*·\s*$/, "") : detail;

  return (visibleDetail ?? "").replace(/^试课申请\s*·\s*/, "").replace(/^正式雇佣\s*·\s*/, "");
}
