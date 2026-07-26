import { parseTutorTrialSchedule } from "@tools/tutorTrial";

/** 试课排期时段标识。 */
export type TrialSchedulePeriodKey = "morning" | "afternoon" | "evening";

/** 试课排期时段配置。 */
export interface TrialSchedulePeriodConfig {
  defaultEnd: string;
  defaultStart: string;
  key: TrialSchedulePeriodKey;
  label: string;
}

/** 试课排期单个时段状态。 */
export interface TrialSchedulePeriodState {
  enabled: boolean;
  end: string;
  start: string;
}

/** 试课排期草稿，按日期维护每天三段时间。 */
export type TrialScheduleDraft = Record<string, Record<TrialSchedulePeriodKey, TrialSchedulePeriodState>>;

/** 试课排期提交计划。 */
export interface TrialSchedulePlan {
  summary: string;
  trialEnd: string;
  trialHalfDay: string;
  trialStart: string;
}

/** 试课排期弹窗返回值。 */
export interface TrialScheduleValue {
  plan: TrialSchedulePlan;
  scheduleDraft: TrialScheduleDraft;
  selectedDates: string[];
}

/** 试课日历单元格的时段与文字标记数据。 */
export interface TrialScheduleCalendarMarker {
  date: string;
  labelPeriods?: TrialSchedulePeriodKey[];
  periods: TrialSchedulePeriodKey[];
}

/** 试课默认可选时段。 */
export const trialSchedulePeriods: TrialSchedulePeriodConfig[] = [
  { defaultEnd: "11:00", defaultStart: "09:00", key: "morning", label: "上午" },
  { defaultEnd: "17:00", defaultStart: "14:00", key: "afternoon", label: "下午" },
  { defaultEnd: "21:00", defaultStart: "18:00", key: "evening", label: "晚上" }
];

/** 生成单日默认三段试课排期。 */
export function createDefaultDaySchedule(): Record<TrialSchedulePeriodKey, TrialSchedulePeriodState> {
  return trialSchedulePeriods.reduce((daySchedule, period) => {
    return {
      ...daySchedule,
      [period.key]: {
        enabled: false,
        end: "",
        start: ""
      }
    };
  }, {} as Record<TrialSchedulePeriodKey, TrialSchedulePeriodState>);
}

/** 将日期格式化为中文年月日。 */
export function formatTrialScheduleDate(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);

  return `${year}年${month}月${day}日`;
}

/** 将时间格式化为无前导零的展示值。 */
function formatTrialScheduleTime(timeValue: string) {
  return timeValue.replace(/^0(?=\d:)/, "");
}

/** 获取单日已经选择的试课时段时间。 */
export function getEnabledPeriodSummaries(daySchedule: Record<TrialSchedulePeriodKey, TrialSchedulePeriodState> | undefined) {
  if (!daySchedule) {
    return [];
  }

  return trialSchedulePeriods
    .map((period) => daySchedule[period.key])
    .filter((periodState) => periodState.enabled && periodState.start && periodState.end)
    .map((periodState) => `${formatTrialScheduleTime(periodState.start)}-${formatTrialScheduleTime(periodState.end)}`);
}

/** 将试课草稿转换为试课日历可消费的日程列表。 */
export function getTrialScheduleCalendarItems(
  selectedDates: string[],
  scheduleDraft: TrialScheduleDraft,
  options: { showPeriodLabel?: boolean } = {}
): TrialScheduleCalendarMarker[] {
  return selectedDates.map((dateKey) => ({
    date: dateKey,
    labelPeriods: options.showPeriodLabel
      ? trialSchedulePeriods
          .filter((period) => {
            const periodState = scheduleDraft[dateKey]?.[period.key];

            return Boolean(periodState?.enabled && periodState.start && periodState.end);
          })
          .map((period) => period.key)
      : undefined,
    periods: trialSchedulePeriods
      .filter((period) => {
        const periodState = scheduleDraft[dateKey]?.[period.key];

        return Boolean(periodState?.enabled && periodState.start && periodState.end);
      })
      .map((period) => period.key)
  }));
}

/** 基于试课排期草稿生成后端兼容的试课计划。 */
export function getTrialSchedulePlan(selectedDates: string[], scheduleDraft: TrialScheduleDraft): TrialSchedulePlan | null {
  const arrangedDates = selectedDates
    .filter((dateKey) => getEnabledPeriodSummaries(scheduleDraft[dateKey]).length > 0)
    .sort();

  if (arrangedDates.length === 0) {
    return null;
  }

  const summary = arrangedDates
    .map((dateKey) => `${formatTrialScheduleDate(dateKey)} ${getEnabledPeriodSummaries(scheduleDraft[dateKey]).join(" ")}`)
    .join("；");

  return {
    summary,
    trialEnd: arrangedDates[arrangedDates.length - 1],
    trialHalfDay: summary,
    trialStart: arrangedDates[0]
  };
}

/** 将试课安排摘要按日期拆分为独立展示行。 */
export function getTrialScheduleSummaryLines(summary: string) {
  return summary.split("；").filter(Boolean);
}

/** 从试课时间摘要中提取可选日期 key，供家长排期按学生可用日期限制。 */
export function getTrialScheduleDateKeysFromSummary(summary: string) {
  return [...new Set(parseTutorTrialSchedule(summary).map((scheduleLine) => scheduleLine.date).filter(Boolean))].sort();
}

/** 根据时间段开始时间归入上午、下午或晚上。 */
function getTrialSchedulePeriodKey(timeRange: string): TrialSchedulePeriodKey {
  const startHour = Number(timeRange.split(":")[0]);

  if (startHour < 12) {
    return "morning";
  }

  return startHour < 18 ? "afternoon" : "evening";
}

/** 将时间补齐为 time input 可识别的 HH:mm 格式。 */
function normalizeTrialInputTime(timeValue: string) {
  const [hour, minute] = timeValue.split(":");

  return `${hour.padStart(2, "0")}:${minute}`;
}

/** 将服务端试课时间摘要转换为弹窗草稿。 */
export function getTrialScheduleValueFromSummary(summary: string): TrialScheduleValue | null {
  const scheduleDraft = parseTutorTrialSchedule(summary).reduce((draft, scheduleLine) => {
    if (!scheduleLine.date) {
      return draft;
    }

    const daySchedule = draft[scheduleLine.date] ?? createDefaultDaySchedule();

    scheduleLine.times.forEach((timeRange) => {
      const [start, end] = timeRange.split("-");
      const periodKey = getTrialSchedulePeriodKey(timeRange);

      daySchedule[periodKey] = {
        enabled: Boolean(start && end),
        end: normalizeTrialInputTime(end),
        start: normalizeTrialInputTime(start)
      };
    });

    return { ...draft, [scheduleLine.date]: daySchedule };
  }, {} as TrialScheduleDraft);
  const selectedDates = Object.keys(scheduleDraft).sort();
  const plan = getTrialSchedulePlan(selectedDates, scheduleDraft);

  return plan ? { plan, scheduleDraft, selectedDates } : null;
}
