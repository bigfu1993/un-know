/** 学生已提交试课申请、等待家长处理时的展示状态。 */
export const TUTOR_APPLICATION_PENDING_STATUS = "申请试课中";

/** 家长已提交试课安排后，学生端等待确认流程的展示状态。 */
export const TUTOR_TRIAL_CONFIRMING_STATUS = "试课日程确认中";

/** 家长已提交试课安排后的旧版展示状态。 */
export const TUTOR_TRIAL_CONFIRMING_LEGACY_STATUS = "试课确认中";

/** 学生已确认家长安排后，试课正在进行的展示状态。 */
export const TUTOR_TRIALING_STATUS = "试课中";

/** 学生提交结束试课后，等待家长确认的展示状态。 */
export const TUTOR_TRIAL_END_CONFIRMING_STATUS = "结束试课确认中";

/** 家长处理试课是否正式雇佣时的展示状态。 */
export const TUTOR_TRIAL_RESULT_PROCESSING_STATUS = "试课结果处理";

/** 家长已发起正式雇佣，等待学生确认的展示状态。 */
export const TUTOR_SERVICE_CONFIRMING_STATUS = "家教服务确认中";

/** 学生同意正式雇佣后，等待家长提交兼职日程的展示状态。 */
export const TUTOR_SERVICE_SCHEDULE_PENDING_STATUS = "兼职日程待提交";

/** 家长提交兼职日程后，等待学生确认的展示状态。 */
export const TUTOR_SERVICE_SCHEDULE_CONFIRMING_STATUS = "兼职日程确认中";

/** 双方确认兼职日程后的正式家教服务状态。 */
export const TUTOR_FORMAL_SERVICE_STATUS = "正式家教服务";

/** 旧版正式家教服务状态。 */
export const TUTOR_FORMAL_SERVICE_LEGACY_STATUS = "家教进行中";

/** 家教或试课结算等待学生确认的展示状态。 */
export const TUTOR_SETTLEMENT_CONFIRMING_STATUS = "结算确认中";

/** 学生要求修改结算金额后的展示状态。 */
export const TUTOR_SETTLEMENT_REVISING_STATUS = "结算修改中";

/** 家教系统计算结算金额时的展示状态。 */
export const TUTOR_SYSTEM_SETTLING_STATUS = "系统结算中";

/** 家长不正式雇佣且继续发布后的试课终态。 */
export const TUTOR_TRIAL_ENDED_STATUS = "试课已结束";

/** 学生已确认试课费用，等待家长确认是否正式雇佣的状态。 */
export const TUTOR_TRIAL_SETTLED_SERVICE_PENDING_STATUS = "试课已结算+雇佣确认中";

/** 家长拒绝试课后的学生端失效状态。 */
export const TUTOR_REJECTED_STATUS = "已失效";

/** 旧版拒绝试课状态。 */
export const TUTOR_REJECTED_LEGACY_STATUS = "已拒绝";

/** 学生拒绝正式雇佣后的终态。 */
export const TUTOR_SERVICE_INVALID_STATUS = "正式雇佣失效";

/** 判断申请是否处于等待家长处理阶段，并兼容迁移前状态。 */
export function isTutorApplicationPendingStatus(status?: string) {
  return Boolean(
    status?.includes(TUTOR_APPLICATION_PENDING_STATUS) || status?.includes("等待家长确认试课")
  );
}

/** 判断家教试课申请是否处于家长已确认日程、等待试课确认的状态。 */
export function isTutorTrialConfirmingStatus(status?: string) {
  return Boolean(
    status?.includes(TUTOR_TRIAL_CONFIRMING_STATUS) ||
      status?.includes(TUTOR_TRIAL_CONFIRMING_LEGACY_STATUS) ||
      status?.includes("试课已确认")
  );
}

/** 判断家教试课申请是否处于试课中。 */
export function isTutorTrialingStatus(status?: string) {
  const normalizedStatus = status ?? "";

  return Boolean(
    normalizedStatus.includes(TUTOR_TRIALING_STATUS) &&
      !isTutorApplicationPendingStatus(normalizedStatus) &&
      !isTutorTrialConfirmingStatus(normalizedStatus) &&
      !isTutorTrialEndConfirmingStatus(normalizedStatus)
  );
}

/** 判断家教试课申请是否处于结束试课确认中。 */
export function isTutorTrialEndConfirmingStatus(status?: string) {
  return Boolean(status?.includes(TUTOR_TRIAL_END_CONFIRMING_STATUS));
}

/** 兼容旧数据状态值，统一返回当前产品文案。 */
export function getTutorTrialStatusLabel(status?: string) {
  if (isTutorApplicationPendingStatus(status)) {
    return TUTOR_APPLICATION_PENDING_STATUS;
  }
  if (isTutorTrialEndConfirmingStatus(status)) {
    return TUTOR_TRIAL_END_CONFIRMING_STATUS;
  }
  if (isTutorTrialingStatus(status)) {
    return TUTOR_TRIALING_STATUS;
  }

  return isTutorTrialConfirmingStatus(status) ? TUTOR_TRIAL_CONFIRMING_STATUS : status ?? "";
}

/** 判断申请是否处于试课结果处理阶段。 */
export function isTutorTrialResultProcessingStatus(status?: string) {
  return Boolean(status?.includes(TUTOR_TRIAL_RESULT_PROCESSING_STATUS));
}

/** 判断申请是否已完成试课费用确认并等待家长处理雇佣结果。 */
export function isTutorTrialSettledServicePendingStatus(status?: string) {
  return Boolean(status?.includes(TUTOR_TRIAL_SETTLED_SERVICE_PENDING_STATUS));
}

/** 判断申请是否处于正式雇佣确认阶段。 */
export function isTutorServiceConfirmingStatus(status?: string) {
  return Boolean(status?.includes(TUTOR_SERVICE_CONFIRMING_STATUS));
}

/** 判断申请是否处于兼职日程待提交阶段。 */
export function isTutorServiceSchedulePendingStatus(status?: string) {
  return Boolean(status?.includes(TUTOR_SERVICE_SCHEDULE_PENDING_STATUS));
}

/** 判断申请是否处于兼职日程确认阶段。 */
export function isTutorServiceScheduleConfirmingStatus(status?: string) {
  return Boolean(status?.includes(TUTOR_SERVICE_SCHEDULE_CONFIRMING_STATUS));
}

/** 判断申请是否已经进入正式家教服务。 */
export function isTutorFormalServiceStatus(status?: string) {
  return Boolean(status?.includes(TUTOR_FORMAL_SERVICE_STATUS) || status?.includes(TUTOR_FORMAL_SERVICE_LEGACY_STATUS));
}

/** 判断申请是否处于结算确认或修改阶段。 */
export function isTutorSettlementStatus(status?: string) {
  return Boolean(
    status?.includes(TUTOR_SETTLEMENT_CONFIRMING_STATUS) ||
      status?.includes(TUTOR_SETTLEMENT_REVISING_STATUS) ||
      status?.includes(TUTOR_SYSTEM_SETTLING_STATUS)
  );
}

/** 判断学生是否已拒绝正式雇佣。 */
export function isTutorServiceInvalidStatus(status?: string) {
  return Boolean(status?.includes(TUTOR_SERVICE_INVALID_STATUS));
}

/** 判断申请是否处于不可继续操作的终态。 */
export function isTutorTerminalStatus(status?: string) {
  return [
    "已取消",
    "已结束",
    TUTOR_TRIAL_ENDED_STATUS,
    TUTOR_REJECTED_STATUS,
    TUTOR_REJECTED_LEGACY_STATUS,
    TUTOR_SERVICE_INVALID_STATUS
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

/** 试课申请中学生可试课时间在进行中卡片详情中的分隔标记。 */
export const tutorTrialAvailabilityDetailMarker = "可试课时间：";

/** 正式雇佣阶段学生可家教时间在进行中卡片详情中的分隔标记。 */
export const tutorServiceAvailabilityDetailMarker = "可家教时间：";

/** 试课结算金额在进行中卡片详情中的分隔标记。 */
export const tutorTrialFeeDetailMarker = "试课结算金额：";

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

/** 从进行中卡片详情里提取试课安排摘要。 */
export function getTutorTrialScheduleSummaryFromOrderDetail(detail?: string) {
  const markerIndex = detail?.indexOf(tutorTrialScheduleDetailMarker) ?? -1;

  if (!detail || markerIndex < 0) {
    return "";
  }

  return detail.slice(markerIndex + tutorTrialScheduleDetailMarker.length).trim();
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
  const scheduleMarkerIndex = availabilityText.indexOf(` · ${tutorTrialScheduleDetailMarker}`);
  const endMarkerIndexes = [feeMarkerIndex, scheduleMarkerIndex].filter((index) => index >= 0);
  const endMarkerIndex = endMarkerIndexes.length > 0 ? Math.min(...endMarkerIndexes) : -1;

  return (endMarkerIndex >= 0 ? availabilityText.slice(0, endMarkerIndex) : availabilityText).trim();
}

/** 从进行中卡片详情里提取学生需要确认的试课费用。 */
export function getTutorTrialFeeSummaryFromOrderDetail(detail?: string) {
  const markerIndex = detail?.indexOf(tutorTrialFeeDetailMarker) ?? -1;

  if (!detail || markerIndex < 0) {
    return "";
  }

  const feeText = detail.slice(markerIndex + tutorTrialFeeDetailMarker.length);
  const scheduleMarkerIndex = feeText.indexOf(` · ${tutorTrialScheduleDetailMarker}`);

  return (scheduleMarkerIndex >= 0 ? feeText.slice(0, scheduleMarkerIndex) : feeText).trim();
}

/** 清理学生端进行中家教卡片详情，避免直接展示流程标记和长时间范围全文。 */
export function getTutorTrialOrderDisplayDetail(detail?: string) {
  const scheduleMarkerIndex = detail?.indexOf(tutorTrialScheduleDetailMarker) ?? -1;
  const feeMarkerIndex = detail?.indexOf(tutorTrialFeeDetailMarker) ?? -1;
  const trialAvailabilityMarkerIndex = detail?.indexOf(tutorTrialAvailabilityDetailMarker) ?? -1;
  const serviceAvailabilityMarkerIndex = detail?.indexOf(tutorServiceAvailabilityDetailMarker) ?? -1;
  const markerIndexes = [
    scheduleMarkerIndex,
    feeMarkerIndex,
    trialAvailabilityMarkerIndex,
    serviceAvailabilityMarkerIndex
  ].filter((index) => index >= 0);
  const visibleEndIndex = markerIndexes.length > 0 ? Math.min(...markerIndexes) : -1;
  const visibleDetail = visibleEndIndex >= 0 ? detail?.slice(0, visibleEndIndex).replace(/\s*·\s*$/, "") : detail;

  return (visibleDetail ?? "").replace(/^试课申请\s*·\s*/, "");
}
