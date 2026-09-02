import type { ScheduleTimeTemplate, TutorTrialScheduleDate } from "@unknown/domain";
import { getTutorDateKey } from "@tools/tutorCalendar";
import {
  createDefaultDaySchedule,
  createTrialScheduleDayFromTemplate,
  createTrialSchedulePeriodStateForPeriod,
  formatTrialScheduleDate,
  getEnabledPeriodSummaries,
  getOccupiedTrialScheduleDraft,
  getTrialScheduleCalendarDatas,
  getTrialSchedulePlan,
  getTrialScheduleValueFromSummary,
  trialSchedulePeriods,
  type TrialScheduleDraft,
  type TrialSchedulePeriodKey,
  type TrialSchedulePeriodState,
  type TrialScheduleValue
} from "./model";

/**
 * useTrialSchedule 入参：只描述业务约束（已占用时段、天数上限、初始值），
 * 不含任何弹窗展示相关内容（标题/文案/图标）——展示层由调用方自己用 Modal 包裹
 * CalendarTime 决定，同一份业务逻辑可以套不同的弹窗外观（试课安排/正式雇佣日程）。
 */
export interface UseTrialScheduleOptions {
  blockedScheduleSummary?: string;
  initialValue: TrialScheduleValue | null;
  /** 实际课程安排的日期数量上限；null 代表不限制。 */
  maxScheduleDates?: number | null;
  /**
   * 家教需求发布时家长选择的日期集合（计划范围），始终作为参考标记回显；“在计划范围内选择”
   * 只是文字建议，不限制家长选择其它日期，也不自动计入本次实际安排。
   */
  plannedDates?: string[];
  /** 家长账号下除当前申请外仍有效的试课占用日程，命中任意范围即锁定所在完整时段。 */
  occupiedTestedDates?: TutorTrialScheduleDate[];
  /** 当前编辑的是试课还是正式课程，用于把日程数据放入对应的 CalendarPanel 数据通道。 */
  scheduleType: "arranged" | "tested";
}

/** 试课排期日历要横向拆分的分段顺序，固定按上午、下午、晚上展示。 */
const trialScheduleDataPeriods = trialSchedulePeriods.map((period) => period.key);

/** 合并同一业务通道内的已有安排和当前草稿。 */
function mergeTrialScheduleCalendarDatas(...dataGroups: CalendarPanelScheduleData[][]): CalendarPanelScheduleData[] {
  const dataMap = new Map<string, Set<string>>();

  dataGroups.forEach((datas) => {
    datas.forEach((data) => {
      const periods = dataMap.get(data.date) ?? new Set<string>();

      data.periods.forEach((period) => periods.add(period));
      dataMap.set(data.date, periods);
    });
  });

  return [...dataMap.entries()].map(([date, periods]) => ({
    date,
    periods: [...periods]
  }));
}

/**
 * 试课/正式课日程排期的完整状态与业务逻辑，不涉及任何弹窗展示。调用方用返回值驱动
 * `CalendarTime`（CalendarPanel + TimePanel 组合）和自己的确认/取消按钮；
 * `value` 为 null 时代表当前排期为空，不可提交。
 */
export function useTrialSchedule({
  blockedScheduleSummary = "",
  initialValue,
  maxScheduleDates = 3,
  occupiedTestedDates = [],
  plannedDates = [],
  scheduleType
}: UseTrialScheduleOptions) {
  const today = useMemo(() => new Date(), []);
  const todayKey = getTutorDateKey(today);
  const blockedScheduleValue = useMemo(
    () => getTrialScheduleValueFromSummary(blockedScheduleSummary),
    [blockedScheduleSummary]
  );
  const occupiedScheduleDraft = useMemo(
    () => getOccupiedTrialScheduleDraft(occupiedTestedDates),
    [occupiedTestedDates]
  );
  const blockedScheduleDraft = useMemo<TrialScheduleDraft>(() => {
    const summaryScheduleDraft = blockedScheduleValue?.scheduleDraft ?? {};
    const blockedDates = new Set([...Object.keys(summaryScheduleDraft), ...Object.keys(occupiedScheduleDraft)]);

    return [...blockedDates].reduce<TrialScheduleDraft>((scheduleDraft, dateKey) => {
      const daySchedule = createDefaultDaySchedule();

      trialSchedulePeriods.forEach((period) => {
        daySchedule[period.key] =
          occupiedScheduleDraft[dateKey]?.[period.key] ??
          summaryScheduleDraft[dateKey]?.[period.key] ??
          daySchedule[period.key];
      });

      return { ...scheduleDraft, [dateKey]: daySchedule };
    }, {});
  }, [blockedScheduleValue, occupiedScheduleDraft]);
  /** 发布计划日期始终回显，但不参与可选范围、天数上限或实际安排计算。 */
  const normalizedPlannedDates = useMemo(() => [...new Set(plannedDates)].sort(), [plannedDates]);
  const [activeDate, setActiveDate] = useState(todayKey);
  const [scheduleDraft, setScheduleDraft] = useState<TrialScheduleDraft>(() => initialValue?.scheduleDraft ?? {});
  const activeDaySchedule = scheduleDraft[activeDate] ?? createDefaultDaySchedule();
  const activeDateHasSchedule = getEnabledPeriodSummaries(activeDaySchedule).length > 0;
  const isActiveDatePast = activeDate < todayKey;
  const schedulePlan = getTrialSchedulePlan(scheduleDraft);
  /** 实际安排日期从结构化计划派生，不再维护独立日期状态。 */
  const scheduledDates = schedulePlan?.dates.map(({ date }) => date) ?? [];
  const isActiveDateScheduled = scheduledDates.includes(activeDate);
  const isScheduleLimitReached =
    maxScheduleDates !== null && scheduledDates.length >= maxScheduleDates && !isActiveDateScheduled;
  const scheduleDatas = useMemo(() => getTrialScheduleCalendarDatas(scheduleDraft), [scheduleDraft]);
  const blockedTestedDatas = useMemo(
    () => getTrialScheduleCalendarDatas(blockedScheduleDraft),
    [blockedScheduleDraft]
  );
  const testedDatas = useMemo(
    () =>
      scheduleType === "tested"
        ? mergeTrialScheduleCalendarDatas(blockedTestedDatas, scheduleDatas)
        : blockedTestedDatas,
    [blockedTestedDatas, scheduleDatas, scheduleType]
  );
  const arrangedDatas = useMemo(
    () => (scheduleType === "arranged" ? scheduleDatas : []),
    [scheduleDatas, scheduleType]
  );
  /** 判断指定日期是否已经过去或受天数上限限制，禁止新增排期。 */
  function isDateDisabledForNewSchedule(dateKey: string) {
    const isScheduledDate = scheduledDates.includes(dateKey);
    const isPastDate = dateKey < todayKey;
    const isOverMaxScheduleDates =
      maxScheduleDates !== null && scheduledDates.length >= maxScheduleDates && !isScheduledDate;

    return isPastDate || isOverMaxScheduleDates;
  }

  /** 判断指定时段是否已被试课日程占用，正式雇佣可用时间不能重复选择。 */
  function isPeriodBlockedBySchedule(dateKey: string, periodKey: TrialSchedulePeriodKey) {
    const blockedPeriodState = blockedScheduleDraft[dateKey]?.[periodKey];

    return Boolean(
      blockedPeriodState?.enabled &&
      (blockedPeriodState.legacyRange || (blockedPeriodState.start && blockedPeriodState.end))
    );
  }

  /** 同步单日排期，实际安排日期由有效时间段实时派生。 */
  function syncDaySchedule(dateKey: string, nextDaySchedule: Record<TrialSchedulePeriodKey, TrialSchedulePeriodState>) {
    const nextDateHasSchedule = getEnabledPeriodSummaries(nextDaySchedule).length > 0;
    const nextDateHasDraft = trialSchedulePeriods.some((period) => {
      const periodState = nextDaySchedule[period.key];

      return Boolean(periodState.legacyRange || periodState.start || periodState.end);
    });
    const isNewScheduleDate = !scheduledDates.includes(dateKey);

    if (nextDateHasSchedule && isNewScheduleDate && isDateDisabledForNewSchedule(dateKey)) {
      return;
    }

    setScheduleDraft((currentDraft) => {
      if (!nextDateHasDraft) {
        const nextDraft = { ...currentDraft };
        delete nextDraft[dateKey];

        return nextDraft;
      }

      return { ...currentDraft, [dateKey]: nextDaySchedule };
    });
  }

  /** 移除一组日期的全部排期，并同步已安排日期列表。 */
  function clearDaySchedules(dateKeys: string[]) {
    if (dateKeys.length === 0) {
      return;
    }

    const dateKeySet = new Set(dateKeys);

    setScheduleDraft((currentDraft) => {
      const nextDraft = { ...currentDraft };
      dateKeySet.forEach((dateKey) => {
        delete nextDraft[dateKey];
      });

      return nextDraft;
    });
  }

  /** 移除指定日期的全部排期。 */
  function clearDaySchedule(dateKey: string) {
    clearDaySchedules([dateKey]);
  }

  /** 移除指定日期下所有试课时段安排，默认作用于当前查看日期。 */
  function handleClearDaySchedule(dateKey: string = activeDate) {
    if (dateKey < todayKey) {
      return;
    }

    clearDaySchedule(dateKey);
  }

  /** 原子更新某个时段的起止范围；重合滑块保留位置但不计为有效安排。 */
  function handleChangePeriodRange(periodKey: TrialSchedulePeriodKey, start: string, end: string) {
    if (isDateDisabledForNewSchedule(activeDate) || isPeriodBlockedBySchedule(activeDate, periodKey)) {
      return;
    }

    const currentDaySchedule = scheduleDraft[activeDate] ?? createDefaultDaySchedule();

    syncDaySchedule(activeDate, {
      ...currentDaySchedule,
      [periodKey]: createTrialSchedulePeriodStateForPeriod(periodKey, start, end)
    });
  }

  /**
   * 把一次日历点击或拖拽手势涉及的日期同步为模板安排：最终选中的日期整组覆盖为模板，
   * 取消选中的日期清空。试课拖拽超过剩余名额时按日期顺序截取到上限；过去日期和占用冲突
   * 在写入前统一校验，避免同一次手势部分生效。
   */
  function applyScheduleTimeTemplateToDates(
    nextScheduledDates: string[],
    changedDateKeys: string[],
    template: ScheduleTimeTemplate
  ): { ok: boolean; reason?: string } {
    const requestedScheduledDateSet = new Set(nextScheduledDates);
    const nextScheduledDateSet = new Set(scheduledDates);
    const changedDateKeySet = new Set(changedDateKeys);
    const acceptedChangedDateKeys: string[] = [];

    if (changedDateKeys.some((dateKey) => dateKey < todayKey)) {
      return { ok: false, reason: "当前日期不可安排" };
    }

    changedDateKeys.forEach((dateKey) => {
      if (!requestedScheduledDateSet.has(dateKey)) {
        nextScheduledDateSet.delete(dateKey);
        acceptedChangedDateKeys.push(dateKey);
      }
    });
    [...requestedScheduledDateSet]
      .filter((dateKey) => changedDateKeySet.has(dateKey))
      .sort()
      .forEach((dateKey) => {
        if (
          nextScheduledDateSet.has(dateKey) ||
          maxScheduleDates === null ||
          nextScheduledDateSet.size < maxScheduleDates
        ) {
          nextScheduledDateSet.add(dateKey);
          acceptedChangedDateKeys.push(dateKey);
        }
      });

    const datesApplyingTemplate = acceptedChangedDateKeys.filter((dateKey) => nextScheduledDateSet.has(dateKey));

    if (acceptedChangedDateKeys.length === 0) {
      return {
        ok: false,
        reason: maxScheduleDates === null ? "没有可更新的课程日期" : `试课最多安排 ${maxScheduleDates} 天`
      };
    }
    if (
      datesApplyingTemplate.some((dateKey) =>
        trialSchedulePeriods.some(
          (period) => template[period.key] && isPeriodBlockedBySchedule(dateKey, period.key)
        )
      )
    ) {
      return { ok: false, reason: "模板包含已占用时段" };
    }

    setScheduleDraft((currentDraft) => {
      const nextDraft = { ...currentDraft };

      acceptedChangedDateKeys.forEach((dateKey) => {
        if (nextScheduledDateSet.has(dateKey)) {
          nextDraft[dateKey] = createTrialScheduleDayFromTemplate(template);
        } else {
          delete nextDraft[dateKey];
        }
      });

      return nextDraft;
    });

    return { ok: true };
  }

  /** 清空某个时段的自定义时间并取消该时段安排。 */
  function handleClearPeriod(periodKey: TrialSchedulePeriodKey) {
    if (isActiveDatePast || isPeriodBlockedBySchedule(activeDate, periodKey)) {
      return;
    }

    const currentDaySchedule = scheduleDraft[activeDate] ?? createDefaultDaySchedule();

    syncDaySchedule(activeDate, {
      ...currentDaySchedule,
      [periodKey]: {
        enabled: false,
        end: "",
        start: ""
      }
    });
  }

  /** 按 TimePanel 需要的形状，把当前查看日期的三个时段状态和禁用态算好传给它，具体业务规则不下沉进组件。 */
  const periods: TimePanelPeriodItem[] = trialSchedulePeriods.map((period) => {
    const periodState = activeDaySchedule[period.key];
    const isPeriodUnavailable = isPeriodBlockedBySchedule(activeDate, period.key);

    return {
      enabled: periodState.enabled,
      end: periodState.end,
      isClearDisabled:
        isActiveDatePast || isPeriodUnavailable || (!periodState.legacyRange && !periodState.start && !periodState.end),
      isTimeInputDisabled:
        Boolean(periodState.legacyRange) || isDateDisabledForNewSchedule(activeDate) || isPeriodUnavailable,
      isUnavailable: isPeriodUnavailable,
      key: period.key,
      label: period.label,
      legacyRange: periodState.legacyRange,
      maxTime: period.maxTime,
      minTime: period.minTime,
      start: periodState.start
    };
  });

  return {
    activeDate,
    activeDateHasSchedule,
    activeDaySchedule,
    activeDateLabel: formatTrialScheduleDate(activeDate),
    applyScheduleTimeTemplateToDates,
    isActiveDatePast,
    isScheduleLimitReached,
    arrangedDatas,
    arrangedPeriods: arrangedDatas.length > 0 ? trialScheduleDataPeriods : [],
    isScheduleDragLocked: maxScheduleDates !== null && scheduledDates.length >= maxScheduleDates,
    maxScheduleDates,
    onChangePeriodRange: handleChangePeriodRange,
    onClearDaySchedule: () => handleClearDaySchedule(),
    onClearPeriod: handleClearPeriod,
    periods,
    plannedDates: normalizedPlannedDates,
    scheduledDates,
    setActiveDate,
    testedDatas,
    testedPeriods: testedDatas.length > 0 ? trialScheduleDataPeriods : [],
    value: schedulePlan ? { plan: schedulePlan, scheduleDraft } : null
  };
}

/** useTrialSchedule 的返回值形状，供 CalendarTime 等消费方标注类型。 */
export type TrialScheduleState = ReturnType<typeof useTrialSchedule>;
