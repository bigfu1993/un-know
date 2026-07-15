/** 家长已提交试课安排后，学生端等待确认流程的展示状态。 */
export const TUTOR_TRIAL_CONFIRMING_STATUS = "试课确认中";

/** 学生已确认家长安排后，试课正在进行的展示状态。 */
export const TUTOR_TRIALING_STATUS = "试课中";

/** 学生提交结束试课后，等待家长确认的展示状态。 */
export const TUTOR_TRIAL_END_CONFIRMING_STATUS = "结束试课确认中";

/** 判断家教试课申请是否处于家长已确认日程、等待试课确认的状态。 */
export function isTutorTrialConfirmingStatus(status?: string) {
  return Boolean(status?.includes(TUTOR_TRIAL_CONFIRMING_STATUS) || status?.includes("试课已确认"));
}

/** 判断家教试课申请是否处于试课中。 */
export function isTutorTrialingStatus(status?: string) {
  return Boolean(status?.includes(TUTOR_TRIALING_STATUS));
}

/** 判断家教试课申请是否处于结束试课确认中。 */
export function isTutorTrialEndConfirmingStatus(status?: string) {
  return Boolean(status?.includes(TUTOR_TRIAL_END_CONFIRMING_STATUS));
}

/** 兼容旧数据状态值，统一返回当前产品文案。 */
export function getTutorTrialStatusLabel(status?: string) {
  if (isTutorTrialEndConfirmingStatus(status)) {
    return TUTOR_TRIAL_END_CONFIRMING_STATUS;
  }
  if (isTutorTrialingStatus(status)) {
    return TUTOR_TRIALING_STATUS;
  }

  return isTutorTrialConfirmingStatus(status) ? TUTOR_TRIAL_CONFIRMING_STATUS : status ?? "";
}

/** 判断申请是否应进入家长端试课列表。 */
export function isTutorTrialListStatus(status?: string) {
  return isTutorTrialingStatus(status) || isTutorTrialEndConfirmingStatus(status);
}

/** 判断申请是否应保留在家长端试课申请列表。 */
export function isTutorApplicationListStatus(status?: string) {
  return !isTutorTrialListStatus(status) && !["已取消", "已结束", "已拒绝", "家教进行中"].some((item) => status?.includes(item));
}

/** 试课日程在进行中卡片详情中的分隔标记。 */
export const tutorTrialScheduleDetailMarker = "试课安排：";

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

/** 清理学生端进行中家教卡片详情，避免直接展示流程标记和试课安排全文。 */
export function getTutorTrialOrderDisplayDetail(detail?: string) {
  const scheduleMarkerIndex = detail?.indexOf(tutorTrialScheduleDetailMarker) ?? -1;
  const visibleDetail = scheduleMarkerIndex >= 0 ? detail?.slice(0, scheduleMarkerIndex).replace(/\s*·\s*$/, "") : detail;

  return (visibleDetail ?? "").replace(/^试课申请\s*·\s*/, "");
}
