import { getTutorDateKey } from "@tools/tutorCalendar";
import {
  createDefaultDaySchedule,
  formatTrialScheduleDate,
  getEnabledPeriodSummaries,
  getTrialScheduleCalendarItems,
  getTrialSchedulePlan,
  getTrialScheduleValueFromSummary,
  trialSchedulePeriods,
  type TrialScheduleDraft,
  type TrialSchedulePeriodConfig,
  type TrialSchedulePeriodKey,
  type TrialSchedulePeriodState,
  type TrialScheduleValue
} from "./model";

/**
 * useTrialSchedule 入参：只描述业务约束（学生可试课范围、已占用时段、天数上限、初始值），
 * 不含任何弹窗展示相关内容（标题/文案/图标）——展示层由调用方自己用 Modal 包裹
 * CalendarTime 决定，同一份业务逻辑可以套不同的弹窗外观（试课安排/正式雇佣日程）。
 */
export interface UseTrialScheduleOptions {
  availableScheduleSummary?: string;
  blockedScheduleLabel?: string;
  blockedScheduleSummary?: string;
  initialValue: TrialScheduleValue | null;
  maxSelectedDates?: number | null;
  /**
   * 家教需求发布时家长选择的日期集合（计划范围），始终作为参考标记回显；“在计划范围内选择”
   * 只是文字建议，不限制家长选择其它日期，也不自动计入本次实际安排。
   */
  plannedDates?: string[];
  scheduleLabel?: string;
}

/** 试课排期日历要横向拆分的分段顺序，固定按上午、下午、晚上展示。 */
const trialScheduleMarkerPeriods = trialSchedulePeriods.map((period) => period.key);

/** 合并学生可选时间背景和家长已安排课程文字标记。 */
function mergeTrialScheduleCalendarMarkers(...markerGroups: CalendarPanelMarker[][]): CalendarPanelMarker[] {
  const markerMap = new Map<
    string,
    {
      labelPeriods: Set<string>;
      periods: Set<string>;
    }
  >();

  markerGroups.forEach((items) => {
    items.forEach((item) => {
      const marker = markerMap.get(item.date) ?? {
        labelPeriods: new Set<string>(),
        periods: new Set<string>()
      };

      item.periods.forEach((period) => marker.periods.add(period));
      item.labelPeriods?.forEach((period) => marker.labelPeriods.add(period));
      markerMap.set(item.date, marker);
    });
  });

  return [...markerMap.entries()].map(([date, marker]) => ({
    date,
    labelPeriods: [...marker.labelPeriods],
    periods: [...marker.periods]
  }));
}

/**
 * 试课/正式课日程排期的完整状态与业务逻辑，不涉及任何弹窗展示。调用方用返回值驱动
 * `CalendarTime`（CalendarPanel + TimePanel 组合）和自己的确认/取消按钮；
 * `value` 为 null 时代表当前排期为空，不可提交。
 */
export function useTrialSchedule({
  availableScheduleSummary = "",
  blockedScheduleLabel = "试",
  blockedScheduleSummary = "",
  initialValue,
  maxSelectedDates = 3,
  plannedDates = [],
  scheduleLabel = "试"
}: UseTrialScheduleOptions) {
  const today = useMemo(() => new Date(), []);
  const todayKey = getTutorDateKey(today);
  const availableScheduleValue = useMemo(() => getTrialScheduleValueFromSummary(availableScheduleSummary), [availableScheduleSummary]);
  const availableScheduleDraft = availableScheduleValue?.scheduleDraft ?? {};
  const blockedScheduleValue = useMemo(() => getTrialScheduleValueFromSummary(blockedScheduleSummary), [blockedScheduleSummary]);
  const blockedScheduleDraft = blockedScheduleValue?.scheduleDraft ?? {};
  /** 只有候选人真实提交过可试课时间才需要锁定具体时刻只读展示；需求发布日期只有"哪天"没有"几点"，
   *  不应该锁死时间输入，家长仍要能在允许的日期内自由挑选具体时段。 */
  const hasAvailableScheduleLimit = Boolean(availableScheduleSummary.trim() && availableScheduleValue);
  const selectableDates = useMemo(
    () => (hasAvailableScheduleLimit && availableScheduleValue ? availableScheduleValue.selectedDates : []),
    [availableScheduleValue, hasAvailableScheduleLimit]
  );
  const selectableDateSet = useMemo(() => new Set(selectableDates), [selectableDates]);
  const hasSelectableDateLimit = selectableDateSet.size > 0;
  /** 发布计划日期始终回显，但不参与可选范围、天数上限或实际安排计算。 */
  const normalizedPlannedDates = useMemo(() => [...new Set(plannedDates)].sort(), [plannedDates]);
  const initialActiveDate =
    initialValue?.selectedDates[0] ??
    normalizedPlannedDates[0] ??
    selectableDates[0] ??
    blockedScheduleValue?.selectedDates[0] ??
    todayKey;
  const [activeDate, setActiveDate] = useState(initialActiveDate);
  /** 当前弹窗草稿选中的试课日期，提交时写入 TrialScheduleValue.selectedDates。 */
  const [selectedDates, setSelectedDates] = useState<string[]>(() => initialValue?.selectedDates ?? []);
  const [scheduleDraft, setScheduleDraft] = useState<TrialScheduleDraft>(() => initialValue?.scheduleDraft ?? {});
  const activeDaySchedule = scheduleDraft[activeDate] ?? createDefaultDaySchedule();
  const activeDateHasSchedule = getEnabledPeriodSummaries(activeDaySchedule).length > 0;
  const isActiveDateSelected = selectedDates.includes(activeDate);
  const isScheduleLimitReached =
    maxSelectedDates !== null &&
    maxSelectedDates !== undefined &&
    selectedDates.length >= maxSelectedDates &&
    !isActiveDateSelected;
  const isOutsideSelectableDates = hasSelectableDateLimit && !selectableDateSet.has(activeDate) && !isActiveDateSelected;
  const schedulePlan = getTrialSchedulePlan(selectedDates, scheduleDraft);
  const availableMarkers = useMemo(
    () =>
      hasAvailableScheduleLimit && availableScheduleValue
        ? getTrialScheduleCalendarItems(availableScheduleValue.selectedDates, availableScheduleValue.scheduleDraft)
        : [],
    [availableScheduleValue, hasAvailableScheduleLimit]
  );
  const selectedMarkers = useMemo(
    () => getTrialScheduleCalendarItems(selectedDates, scheduleDraft, { showPeriodLabel: hasAvailableScheduleLimit }),
    [hasAvailableScheduleLimit, scheduleDraft, selectedDates]
  );
  const blockedMarkers = useMemo(
    () =>
      blockedScheduleValue
        ? getTrialScheduleCalendarItems(blockedScheduleValue.selectedDates, blockedScheduleValue.scheduleDraft, {
            showPeriodLabel: true
          })
        : [],
    [blockedScheduleValue]
  );
  const markers = useMemo(
    () => mergeTrialScheduleCalendarMarkers(availableMarkers, blockedMarkers, selectedMarkers),
    [availableMarkers, blockedMarkers, selectedMarkers]
  );
  const markerFallbackLabel = blockedMarkers.length > 0 ? blockedScheduleLabel : scheduleLabel;
  /** 判断指定日期是否受可选范围或天数上限限制，禁止新增排期。 */
  function isDateDisabledForNewSchedule(dateKey: string) {
    const isSelectedDate = selectedDates.includes(dateKey);
    const isOverMaxSelectedDates =
      maxSelectedDates !== null && maxSelectedDates !== undefined && selectedDates.length >= maxSelectedDates && !isSelectedDate;
    const isOutsideSelectableDate = hasSelectableDateLimit && !selectableDateSet.has(dateKey) && !isSelectedDate;

    return isOverMaxSelectedDates || isOutsideSelectableDate;
  }

  /** 判断当前排期是否受学生提交的可试课时段约束。 */
  function isPeriodOutsideAvailableSchedule(dateKey: string, periodKey: TrialSchedulePeriodKey) {
    if (!hasAvailableScheduleLimit) {
      return false;
    }

    const availablePeriodState = availableScheduleDraft[dateKey]?.[periodKey];

    return !availablePeriodState?.enabled || !availablePeriodState.start || !availablePeriodState.end;
  }

  /** 判断指定时段是否已被试课日程占用，正式雇佣可用时间不能重复选择。 */
  function isPeriodBlockedBySchedule(dateKey: string, periodKey: TrialSchedulePeriodKey) {
    const blockedPeriodState = blockedScheduleDraft[dateKey]?.[periodKey];

    return Boolean(blockedPeriodState?.enabled && blockedPeriodState.start && blockedPeriodState.end);
  }

  /** 获取指定日期内允许选择的试课时段。 */
  function getSelectablePeriodsForDate(dateKey: string) {
    return trialSchedulePeriods.filter(
      (period) => !isPeriodOutsideAvailableSchedule(dateKey, period.key) && !isPeriodBlockedBySchedule(dateKey, period.key)
    );
  }

  /** 生成单击选中日期时使用的默认排期。 */
  function createRangeSelectedDaySchedule(dateKey: string, currentDaySchedule = createDefaultDaySchedule()) {
    const selectablePeriods = getSelectablePeriodsForDate(dateKey);

    if (selectablePeriods.length === 0) {
      return null;
    }

    return selectablePeriods.reduce((daySchedule, period) => {
      const currentPeriodState = currentDaySchedule[period.key];
      const availablePeriodState = availableScheduleDraft[dateKey]?.[period.key];

      return {
        ...daySchedule,
        [period.key]: {
          enabled: true,
          end: currentPeriodState.end || (hasAvailableScheduleLimit && availablePeriodState ? availablePeriodState.end : period.defaultEnd),
          start: currentPeriodState.start || (hasAvailableScheduleLimit && availablePeriodState ? availablePeriodState.start : period.defaultStart)
        }
      };
    }, currentDaySchedule);
  }

  /** 同步单日排期，并按配置的天数上限和可选日期范围维护已安排日期。 */
  function syncDaySchedule(dateKey: string, nextDaySchedule: Record<TrialSchedulePeriodKey, TrialSchedulePeriodState>) {
    const nextDateHasSchedule = getEnabledPeriodSummaries(nextDaySchedule).length > 0;
    const isNewScheduleDate = !selectedDates.includes(dateKey);

    if (nextDateHasSchedule && isNewScheduleDate && isDateDisabledForNewSchedule(dateKey)) {
      return;
    }

    setScheduleDraft((currentDraft) => {
      if (!nextDateHasSchedule) {
        const nextDraft = { ...currentDraft };
        delete nextDraft[dateKey];

        return nextDraft;
      }

      return { ...currentDraft, [dateKey]: nextDaySchedule };
    });
    setSelectedDates((currentDates) => {
      if (nextDateHasSchedule) {
        return [...new Set([...currentDates, dateKey])].sort();
      }

      return currentDates.filter((currentDateKey) => currentDateKey !== dateKey);
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
    setSelectedDates((currentDates) => currentDates.filter((currentDateKey) => !dateKeySet.has(currentDateKey)));
  }

  /** 移除指定日期的全部排期。 */
  function clearDaySchedule(dateKey: string) {
    clearDaySchedules([dateKey]);
  }

  /** 点击时段名称时切换该时段安排，未安排则填入快捷默认时间，已安排则取消安排。 */
  function handleTogglePeriodPreset(period: TrialSchedulePeriodConfig) {
    if (isDateDisabledForNewSchedule(activeDate)) {
      return;
    }

    const currentDaySchedule = scheduleDraft[activeDate] ?? createDefaultDaySchedule();
    const currentPeriodState = currentDaySchedule[period.key];
    const availablePeriodState = availableScheduleDraft[activeDate]?.[period.key];

    if (currentPeriodState.enabled) {
      handleClearPeriod(period.key);
      return;
    }
    if (isPeriodOutsideAvailableSchedule(activeDate, period.key) || isPeriodBlockedBySchedule(activeDate, period.key)) {
      return;
    }

    syncDaySchedule(activeDate, {
      ...currentDaySchedule,
      [period.key]: {
        enabled: true,
        end: hasAvailableScheduleLimit && availablePeriodState ? availablePeriodState.end : period.defaultEnd,
        start: hasAvailableScheduleLimit && availablePeriodState ? availablePeriodState.start : period.defaultStart
      }
    });
  }

  /** 全选指定日期允许的上午、下午、晚上时段，默认作用于当前查看日期。 */
  function handleSelectFullDaySchedule(dateKey: string = activeDate) {
    if (isDateDisabledForNewSchedule(dateKey)) {
      return;
    }

    const nextDaySchedule = createRangeSelectedDaySchedule(dateKey, scheduleDraft[dateKey] ?? createDefaultDaySchedule());

    if (!nextDaySchedule) {
      return;
    }

    syncDaySchedule(dateKey, nextDaySchedule);
  }

  /** 移除指定日期下所有试课时段安排，默认作用于当前查看日期。 */
  function handleClearDaySchedule(dateKey: string = activeDate) {
    clearDaySchedule(dateKey);
  }

  /** 编辑模式下单击日期直接切换安排：当天已有排期则移除，未排期则按可选时段全选，直接复用编辑区"全选/移除当日安排"的动作。 */
  function handleToggleDaySchedule(dateKey: string) {
    if (selectedDates.includes(dateKey)) {
      handleClearDaySchedule(dateKey);
      return;
    }

    handleSelectFullDaySchedule(dateKey);
  }

  /** 自定义某个时段的开始或结束时间，两个时间均存在时自动计入安排。 */
  function handleChangePeriodTime(periodKey: TrialSchedulePeriodKey, field: "end" | "start", value: string) {
    if (hasAvailableScheduleLimit || isDateDisabledForNewSchedule(activeDate) || isPeriodBlockedBySchedule(activeDate, periodKey)) {
      return;
    }

    const currentDaySchedule = scheduleDraft[activeDate] ?? createDefaultDaySchedule();
    const nextPeriodState = {
      ...currentDaySchedule[periodKey],
      [field]: value
    };

    syncDaySchedule(activeDate, {
      ...currentDaySchedule,
      [periodKey]: {
        ...nextPeriodState,
        enabled: Boolean(nextPeriodState.start && nextPeriodState.end)
      }
    });
  }

  /** 清空某个时段的自定义时间并取消该时段安排。 */
  function handleClearPeriod(periodKey: TrialSchedulePeriodKey) {
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
    const isPeriodSelected = periodState.enabled;
    const isPeriodUnavailable =
      isPeriodOutsideAvailableSchedule(activeDate, period.key) || isPeriodBlockedBySchedule(activeDate, period.key);

    return {
      enabled: isPeriodSelected,
      end: periodState.end,
      isClearDisabled: !periodState.start && !periodState.end,
      isTimeInputDisabled:
        hasAvailableScheduleLimit || isDateDisabledForNewSchedule(activeDate) || isPeriodSelected || isPeriodUnavailable,
      isToggleDisabled: (isDateDisabledForNewSchedule(activeDate) && !isPeriodSelected) || (isPeriodUnavailable && !isPeriodSelected),
      isUnavailable: isPeriodUnavailable,
      key: period.key,
      label: period.label,
      start: periodState.start
    };
  });

  return {
    activeDate,
    activeDateHasSchedule,
    activeDateLabel: formatTrialScheduleDate(activeDate),
    hasNoSelectablePeriods: getSelectablePeriodsForDate(activeDate).length === 0,
    isOutsideSelectableDates,
    isScheduleLimitReached,
    markerFallbackLabel,
    markerPeriods: trialScheduleMarkerPeriods,
    markers,
    maxSelectedDates,
    mode: (hasAvailableScheduleLimit ? "view" : "edit") as CalendarPanelMode,
    onChangePeriodTime: (periodKey: string, field: "start" | "end", value: string) =>
      handleChangePeriodTime(periodKey as TrialSchedulePeriodKey, field, value),
    onClearDaySchedule: () => handleClearDaySchedule(),
    onClearPeriod: (periodKey: string) => handleClearPeriod(periodKey as TrialSchedulePeriodKey),
    onSelectFullDaySchedule: () => handleSelectFullDaySchedule(),
    onToggleDate: handleToggleDaySchedule,
    onTogglePeriod: (periodKey: string) => {
      const period = trialSchedulePeriods.find((candidatePeriod) => candidatePeriod.key === periodKey);

      if (period) {
        handleTogglePeriodPreset(period);
      }
    },
    periods,
    plannedDates: normalizedPlannedDates,
    selectableDates,
    selectedDates,
    setActiveDate,
    value: schedulePlan ? { plan: schedulePlan, scheduleDraft, selectedDates: [...selectedDates].sort() } : null
  };
}

/** useTrialSchedule 的返回值形状，供 CalendarTime 等消费方标注类型。 */
export type TrialScheduleState = ReturnType<typeof useTrialSchedule>;
