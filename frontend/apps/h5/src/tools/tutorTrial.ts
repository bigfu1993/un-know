/** 判断字符串是否是 TutorApplicantStatus 的合法 KEY。 */
function isTutorApplicantStatusKey(status?: string): status is TutorApplicantStatus {
  return Boolean(status) && (Object.values(TutorApplicantStatus) as string[]).includes(status as string);
}

/** 判断字符串是否是 TutorDemandStatus 的合法 KEY。 */
function isTutorDemandStatusKey(status?: string): status is TutorDemandStatus {
  return Boolean(status) && (Object.values(TutorDemandStatus) as string[]).includes(status as string);
}

/**
 * 以下 isTutorXxxStatus 系列判断函数的入参可能来自三种真实来源（详见
 * docs/家教状态模型治理建议.md）：学生视角 order.status（TutorApplicantStatus KEY）、
 * 家长候选人列表 candidate.status（TutorApplicantStatus KEY）、家长聚合卡片 order.status
 * （TutorDemandStatus KEY）。状态值已经 KEY 化，这里统一用精确匹配，不再需要 `.includes()`
 * 子串匹配和相应的排除逻辑。
 */

/** 判断申请是否处于等待家长处理阶段。 */
export function isTutorApplicationPendingStatus(status?: string) {
  return status === TutorApplicantStatus.ApplicationPending;
}

/** 判断家教试课申请是否处于家长已确认日程、等待试课确认的状态。 */
export function isTutorTrialConfirmingStatus(status?: string) {
  return status === TutorApplicantStatus.TrialConfirming;
}

/** 判断家教试课申请是否处于试课中。 */
export function isTutorTrialingStatus(status?: string) {
  return status === TutorApplicantStatus.Trialing;
}

/** 判断家教试课申请是否处于结束试课确认中。 */
export function isTutorTrialEndConfirmingStatus(status?: string) {
  return status === TutorApplicantStatus.TrialEndConfirming;
}

/** 判断正式雇佣是否处于学生发起结束、等待家长结算的状态。 */
export function isTutorServiceEndConfirmingStatus(status?: string) {
  return status === TutorApplicantStatus.ServiceEndConfirming;
}

/** 把状态 KEY（申请细分状态或需求主状态）转换成中文展示文案；查不到表时原样返回，
 *  兼容非家教状态或空值。 */
export function getTutorTrialStatusLabel(status?: string): string {
  if (!status) {
    return "";
  }
  if (isTutorApplicantStatusKey(status)) {
    return tutorApplicantStatusLabel[status];
  }
  if (isTutorDemandStatusKey(status)) {
    return tutorDemandStatusLabel[status];
  }

  return status;
}

/** 判断申请是否处于试课结果处理阶段。 */
export function isTutorTrialResultProcessingStatus(status?: string) {
  return status === TutorApplicantStatus.TrialResultProcessing;
}

/** 判断申请是否已完成试课费用确认并等待家长处理雇佣结果。 */
export function isTutorTrialSettledServicePendingStatus(status?: string) {
  return status === TutorApplicantStatus.TrialSettledServicePending;
}

/** 判断申请是否处于正式雇佣确认阶段。 */
export function isTutorServiceConfirmingStatus(status?: string) {
  return status === TutorApplicantStatus.ServiceConfirming;
}

/** 判断申请是否处于正式雇佣日程待家长提交阶段。 */
export function isTutorServiceSchedulePendingStatus(status?: string) {
  return status === TutorApplicantStatus.ServiceSchedulePending;
}

/** 判断申请是否处于旧版兼职日程确认阶段，只在历史数据里出现。 */
export function isTutorServiceScheduleConfirmingStatus(status?: string) {
  return status === TutorApplicantStatus.ServiceScheduleConfirming;
}

/** 判断申请是否已经进入正式雇佣；家长聚合卡片的需求状态"进行中"（TutorDemandStatus.InProgress）
 *  也归一到这个节点，跟申请细分状态的正式雇佣是同一个业务含义。 */
export function isTutorFormalServiceStatus(status?: string) {
  return status === TutorApplicantStatus.FormalService
    || status === TutorDemandStatus.InProgress
    || isTutorServiceScheduleConfirmingStatus(status);
}

/** 判断申请是否处于结算确认或修改阶段。 */
export function isTutorSettlementStatus(status?: string) {
  return status === TutorApplicantStatus.SettlementConfirming
    || status === TutorApplicantStatus.SettlementRevising
    || status === TutorApplicantStatus.SystemSettling;
}

/** 判断学生是否已拒绝正式雇佣。 */
export function isTutorServiceInvalidStatus(status?: string) {
  return status === TutorApplicantStatus.ServiceInvalid;
}

/** 判断申请是否处于不可继续操作的终态。 */
export function isTutorTerminalStatus(status?: string) {
  return (
    status === TutorApplicantStatus.Cancelled ||
    status === TutorApplicantStatus.Ended ||
    status === TutorApplicantStatus.TrialEnded ||
    status === TutorApplicantStatus.Rejected ||
    status === TutorApplicantStatus.ServiceInvalid
  );
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

/** 判断申请是否应保留在家长端试课申请列表；后端接口已在源头剔除终态申请
 *  （见 TutorWorkspaceAppService#tutorApplicantProfiles），这里不再重复判断终态。 */
export function isTutorApplicationListStatus(status?: string) {
  return isTutorApplicationPendingStatus(status);
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
