import type {
  ConfirmTutorTrialRequest,
  ScheduleTimeRange,
  ScheduleTimeTemplate,
  TutorTrialScheduleDate
} from "@unknown/domain";
import { parseTutorTrialSchedule } from "@tools/tutorTrial";

/** 试课排期时段标识。 */
export type TrialSchedulePeriodKey = "morning" | "afternoon" | "evening";

/** 试课排期时段配置。 */
export interface TrialSchedulePeriodConfig {
  key: TrialSchedulePeriodKey;
  label: string;
  maxTime: string;
  minTime: string;
}

/** 试课排期单个时段状态。 */
export interface TrialSchedulePeriodState {
  enabled: boolean;
  end: string;
  /** 旧排期中无法进入当前双滑块的原始起止时间，只读保留到用户主动清空。 */
  legacyRange?: ScheduleTimeRange;
  start: string;
}

/** 试课排期草稿，按日期维护每天三段时间。 */
export type TrialScheduleDraft = Record<string, Record<TrialSchedulePeriodKey, TrialSchedulePeriodState>>;

/** 试课排期提交计划，摘要只用于本地展示和修改比较。 */
export interface TrialSchedulePlan extends ConfirmTutorTrialRequest {
  summary: string;
}

/** 试课排期弹窗返回值。 */
export interface TrialScheduleValue {
  plan: TrialSchedulePlan;
  scheduleDraft: TrialScheduleDraft;
}

/** 试课三个固定时段的可排期边界。 */
export const trialSchedulePeriods: TrialSchedulePeriodConfig[] = [
  { key: "morning", label: "上午", minTime: "08:00", maxTime: "12:00" },
  { key: "afternoon", label: "下午", minTime: "12:00", maxTime: "18:00" },
  { key: "evening", label: "晚上", minTime: "18:00", maxTime: "22:00" }
];

/** 生成单日默认三段试课排期。 */
export function createDefaultDaySchedule(): Record<TrialSchedulePeriodKey, TrialSchedulePeriodState> {
  return trialSchedulePeriods.reduce(
    (daySchedule, period) => {
      return {
        ...daySchedule,
        [period.key]: {
          enabled: false,
          end: "",
          start: ""
        }
      };
    },
    {} as Record<TrialSchedulePeriodKey, TrialSchedulePeriodState>
  );
}

/** 将 HH:mm 时间转换为当天分钟数；格式或范围无效时返回 null。 */
function getTrialScheduleTimeMinutes(timeValue: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(timeValue);

  if (!match) {
    return null;
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  return hour <= 23 && minute <= 59 ? hour * 60 + minute : null;
}

/** 创建原子时段范围；滑块重合时保留位置但不形成有效安排。 */
export function createTrialSchedulePeriodState(start: string, end: string): TrialSchedulePeriodState {
  const startMinutes = getTrialScheduleTimeMinutes(start);
  const endMinutes = getTrialScheduleTimeMinutes(end);

  if (startMinutes === null || endMinutes === null || endMinutes < startMinutes) {
    return { enabled: false, start: "", end: "" };
  }
  if (endMinutes === startMinutes) {
    return { enabled: false, start, end };
  }
  if (endMinutes - startMinutes < 10) {
    return { enabled: false, start: "", end: "" };
  }

  return { enabled: true, start, end };
}

/** 按固定时段窗口创建范围，越界或偏离窗口十分钟刻度时统一归一化为空状态。 */
export function createTrialSchedulePeriodStateForPeriod(
  periodKey: TrialSchedulePeriodKey,
  start: string,
  end: string
): TrialSchedulePeriodState {
  const periodState = createTrialSchedulePeriodState(start, end);
  const period = trialSchedulePeriods.find((candidatePeriod) => candidatePeriod.key === periodKey);

  if (!periodState.start || !periodState.end || !period) {
    return periodState;
  }

  const startMinutes = getTrialScheduleTimeMinutes(periodState.start);
  const endMinutes = getTrialScheduleTimeMinutes(periodState.end);
  const minMinutes = getTrialScheduleTimeMinutes(period.minTime);
  const maxMinutes = getTrialScheduleTimeMinutes(period.maxTime);

  if (
    startMinutes === null ||
    endMinutes === null ||
    minMinutes === null ||
    maxMinutes === null ||
    startMinutes < minMinutes ||
    endMinutes > maxMinutes ||
    (startMinutes - minMinutes) % 10 !== 0 ||
    (endMinutes - minMinutes) % 10 !== 0
  ) {
    return createTrialSchedulePeriodState("", "");
  }

  return periodState;
}

/** 用稀疏时间模板整组覆盖单日安排，模板未包含的时段会被清空。 */
export function createTrialScheduleDayFromTemplate(
  template: ScheduleTimeTemplate
): Record<TrialSchedulePeriodKey, TrialSchedulePeriodState> {
  return trialSchedulePeriods.reduce(
    (daySchedule, period) => {
      const range = template[period.key];

      return {
        ...daySchedule,
        [period.key]: createTrialSchedulePeriodStateForPeriod(period.key, range?.start ?? "", range?.end ?? "")
      };
    },
    {} as Record<TrialSchedulePeriodKey, TrialSchedulePeriodState>
  );
}

/** 将单日安排转换为只包含有效时段的稀疏时间模板。 */
export function createScheduleTimeTemplateFromDay(
  daySchedule: Record<TrialSchedulePeriodKey, TrialSchedulePeriodState>
): ScheduleTimeTemplate {
  return trialSchedulePeriods.reduce<ScheduleTimeTemplate>((template, period) => {
    const periodState = daySchedule[period.key];

    if (periodState.legacyRange) {
      throw new Error("当前日存在历史异常时段，无法保存为模板");
    }
    if (!periodState.enabled) {
      return template;
    }

    const normalizedPeriodState = createTrialSchedulePeriodStateForPeriod(
      period.key,
      periodState.start,
      periodState.end
    );

    if (!normalizedPeriodState.enabled) {
      throw new Error("当前日存在不符合窗口十分钟刻度的时段，无法保存为模板");
    }

    return {
      ...template,
      [period.key]: {
        start: normalizedPeriodState.start,
        end: normalizedPeriodState.end
      }
    };
  }, {});
}

/** 将日期格式化为中文年月日。 */
export function formatTrialScheduleDate(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);

  return `${year}年${month}月${day}日`;
}

/** 根据当前查看日期和试课天数上限状态生成排期弹窗副标题。 */
export function getTrialScheduleSubtitle({
  activeDate,
  isActiveDatePast,
  isScheduleLimitReached,
  plannedDates
}: {
  activeDate: string;
  isActiveDatePast: boolean;
  isScheduleLimitReached: boolean;
  plannedDates: string[];
}) {
  if (isActiveDatePast) {
    return "该日期无法制定课程安排";
  }

  const messages: string[] = [];

  if (isScheduleLimitReached) {
    messages.push("试课最多安排 3 天");
  }
  if (plannedDates.length > 0 && !plannedDates.includes(activeDate)) {
    messages.push("建议在计划日程内安排课程");
  }

  return messages.length > 0 ? `${messages.join("；")}。` : "请选择试课日期和时间。";
}

/** 将时间格式化为无前导零的展示值。 */
function formatTrialScheduleTime(timeValue: string) {
  return timeValue.replace(/^0(?=\d:)/, "");
}

/** 读取已安排时段的展示范围；历史异常范围优先保留原始文字。 */
function getTrialSchedulePeriodDisplayRange(periodState: TrialSchedulePeriodState): ScheduleTimeRange | null {
  if (!periodState.enabled) {
    return null;
  }
  if (periodState.legacyRange) {
    return periodState.legacyRange;
  }
  if (periodState.start && periodState.end) {
    return { start: periodState.start, end: periodState.end };
  }

  return null;
}

/** 获取单日已经选择的结构化试课时间段。 */
function getEnabledPeriodTimeRanges(
  daySchedule: Record<TrialSchedulePeriodKey, TrialSchedulePeriodState> | undefined
): ScheduleTimeRange[] {
  if (!daySchedule) {
    return [];
  }

  return trialSchedulePeriods
    .map((period) => getTrialSchedulePeriodDisplayRange(daySchedule[period.key]))
    .filter((range): range is ScheduleTimeRange => range !== null);
}

/** 获取单日已经选择的试课时段展示文案。 */
export function getEnabledPeriodSummaries(
  daySchedule: Record<TrialSchedulePeriodKey, TrialSchedulePeriodState> | undefined
) {
  return getEnabledPeriodTimeRanges(daySchedule).map(
    (range) => `${formatTrialScheduleTime(range.start)}-${formatTrialScheduleTime(range.end)}`
  );
}

/** 将试课草稿转换为 CalendarPanel 可消费的日程分段数据。 */
export function getTrialScheduleCalendarDatas(
  scheduleDraft: TrialScheduleDraft
): CalendarPanelScheduleData[] {
  return Object.keys(scheduleDraft)
    .sort()
    .flatMap((dateKey) => {
      const periods = trialSchedulePeriods
        .filter((period) => {
          const periodState = scheduleDraft[dateKey]?.[period.key];

          return Boolean(periodState && getTrialSchedulePeriodDisplayRange(periodState));
        })
        .map((period) => period.key);

      return periods.length > 0 ? [{ date: dateKey, periods }] : [];
    });
}

/** 将家长账号下已占用的结构化试课日程转换为三段完整锁定状态。 */
export function getOccupiedTrialScheduleDraft(occupiedTestedDates: TutorTrialScheduleDate[]): TrialScheduleDraft {
  return occupiedTestedDates.reduce<TrialScheduleDraft>((scheduleDraft, scheduleDate) => {
    const daySchedule = scheduleDraft[scheduleDate.date] ?? createDefaultDaySchedule();

    scheduleDate.timeRanges.forEach((timeRange) => {
      const startMinutes = getTrialScheduleTimeMinutes(timeRange.start);
      const endMinutes = getTrialScheduleTimeMinutes(timeRange.end);

      if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
        return;
      }

      trialSchedulePeriods.forEach((period) => {
        const minMinutes = getTrialScheduleTimeMinutes(period.minTime);
        const maxMinutes = getTrialScheduleTimeMinutes(period.maxTime);

        if (
          minMinutes !== null &&
          maxMinutes !== null &&
          startMinutes < maxMinutes &&
          endMinutes > minMinutes
        ) {
          daySchedule[period.key] = {
            enabled: true,
            end: period.maxTime,
            start: period.minTime
          };
        }
      });
    });

    return { ...scheduleDraft, [scheduleDate.date]: daySchedule };
  }, {});
}

/** 基于试课排期草稿生成结构化试课提交计划。 */
export function getTrialSchedulePlan(
  scheduleDraft: TrialScheduleDraft
): TrialSchedulePlan | null {
  const scheduledDates = Object.keys(scheduleDraft)
    .filter((dateKey) => getEnabledPeriodSummaries(scheduleDraft[dateKey]).length > 0)
    .sort();

  if (scheduledDates.length === 0) {
    return null;
  }

  const dates: TutorTrialScheduleDate[] = scheduledDates.map((date) => ({
    date,
    timeRanges: getEnabledPeriodTimeRanges(scheduleDraft[date])
  }));
  const summary = dates
    .map(({ date, timeRanges }) =>
      `${formatTrialScheduleDate(date)} ${timeRanges
        .map((range) => `${formatTrialScheduleTime(range.start)}-${formatTrialScheduleTime(range.end)}`)
        .join(" ")}`
    )
    .join("；");

  return {
    dates,
    summary
  };
}

/** 将试课安排摘要按日期拆分为独立展示行。 */
export function getTrialScheduleSummaryLines(summary: string) {
  return summary.split("；").filter(Boolean);
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
      const normalizedStart = normalizeTrialInputTime(start);
      const normalizedEnd = normalizeTrialInputTime(end);
      const periodState = createTrialSchedulePeriodStateForPeriod(periodKey, normalizedStart, normalizedEnd);

      daySchedule[periodKey] = periodState.enabled
        ? periodState
        : {
            enabled: true,
            end: "",
            legacyRange: { end, start },
            start: ""
          };
    });

    return { ...draft, [scheduleLine.date]: daySchedule };
  }, {} as TrialScheduleDraft);
  const plan = getTrialSchedulePlan(scheduleDraft);

  return plan ? { plan, scheduleDraft } : null;
}
