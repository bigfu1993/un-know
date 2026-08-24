import "./index.less";
import { CalendarClock } from "lucide-react";
import { getTutorDateKey } from "@tools/tutorCalendar";
import {
  createDefaultDaySchedule,
  formatTrialScheduleDate,
  getEnabledPeriodSummaries,
  getTrialScheduleDateKeysFromSummary,
  getTrialScheduleCalendarItems,
  getTrialSchedulePlan,
  getTrialScheduleValueFromSummary,
  trialSchedulePeriods,
  type TrialScheduleDraft,
  type TrialScheduleCalendarMarker,
  type TrialSchedulePeriodConfig,
  type TrialSchedulePeriodKey,
  type TrialSchedulePeriodState,
  type TrialScheduleValue
} from "./model";

/** 试课排期弹窗属性。 */
interface TutorTrialScheduleProps {
  availableScheduleSummary?: string;
  blockedScheduleLabel?: string;
  blockedScheduleSummary?: string;
  confirmLabel?: string;
  initialValue: TrialScheduleValue | null;
  isConfirming?: boolean;
  maxSelectedDates?: number | null;
  onClose: () => void;
  onConfirm: (value: TrialScheduleValue) => void;
  scheduleLabel?: string;
  subtitle?: string;
  title?: string;
}

/** 合并学生可选时间背景和家长已安排课程文字标记。 */
function mergeTrialScheduleCalendarMarkers(
  ...markerGroups: TrialScheduleCalendarMarker[][]
): TrialScheduleCalendarMarker[] {
  const markerMap = new Map<
    string,
    {
      labelPeriods: Set<TrialSchedulePeriodKey>;
      periods: Set<TrialSchedulePeriodKey>;
    }
  >();

  markerGroups.forEach((items) => {
    items.forEach((item) => {
      const marker = markerMap.get(item.date) ?? {
        labelPeriods: new Set<TrialSchedulePeriodKey>(),
        periods: new Set<TrialSchedulePeriodKey>()
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

/** 试课安排弹窗，复用课程日历的月份网格生成逻辑。 */
export function TutorTrialSchedule({
  availableScheduleSummary = "",
  blockedScheduleLabel = "试",
  blockedScheduleSummary = "",
  confirmLabel = "确认",
  initialValue,
  isConfirming = false,
  maxSelectedDates = 3,
  onClose,
  onConfirm,
  scheduleLabel = "试",
  subtitle = "最多选择 3 天，设置每天可试课时间。",
  title = "试课安排"
}: TutorTrialScheduleProps) {
  const today = useMemo(() => new Date(), []);
  const todayKey = getTutorDateKey(today);
  const selectableDates = useMemo(() => getTrialScheduleDateKeysFromSummary(availableScheduleSummary), [availableScheduleSummary]);
  const selectableDateSet = useMemo(() => new Set(selectableDates), [selectableDates]);
  const availableScheduleValue = useMemo(() => getTrialScheduleValueFromSummary(availableScheduleSummary), [availableScheduleSummary]);
  const availableScheduleDraft = availableScheduleValue?.scheduleDraft ?? {};
  const blockedScheduleValue = useMemo(() => getTrialScheduleValueFromSummary(blockedScheduleSummary), [blockedScheduleSummary]);
  const blockedScheduleDraft = blockedScheduleValue?.scheduleDraft ?? {};
  const hasSelectableDateLimit = selectableDateSet.size > 0;
  const hasAvailableScheduleLimit = Boolean(availableScheduleSummary.trim() && availableScheduleValue);
  const initialSelectedDate = initialValue?.selectedDates[0] ?? selectableDates[0] ?? blockedScheduleValue?.selectedDates[0] ?? todayKey;
  const [selectedDate, setSelectedDate] = useState(initialSelectedDate);
  const [selectedDates, setSelectedDates] = useState<string[]>(() => initialValue?.selectedDates ?? []);
  const [scheduleDraft, setScheduleDraft] = useState<TrialScheduleDraft>(() => initialValue?.scheduleDraft ?? {});
  const selectedDaySchedule = scheduleDraft[selectedDate] ?? createDefaultDaySchedule();
  const selectedDateHasSchedule = getEnabledPeriodSummaries(selectedDaySchedule).length > 0;
  const hasSelectedDate = selectedDates.includes(selectedDate);
  const isScheduleLimitReached =
    maxSelectedDates !== null && maxSelectedDates !== undefined && selectedDates.length >= maxSelectedDates && !hasSelectedDate;
  const isOutsideSelectableDates = hasSelectableDateLimit && !selectableDateSet.has(selectedDate) && !hasSelectedDate;
  const schedulePlan = getTrialSchedulePlan(selectedDates, scheduleDraft);
  const availableScheduleItems = useMemo(
    () =>
      hasAvailableScheduleLimit && availableScheduleValue
        ? getTrialScheduleCalendarItems(availableScheduleValue.selectedDates, availableScheduleValue.scheduleDraft)
        : [],
    [availableScheduleValue, hasAvailableScheduleLimit]
  );
  const arrangedScheduleItems = useMemo(
    () => getTrialScheduleCalendarItems(selectedDates, scheduleDraft, { showPeriodLabel: hasAvailableScheduleLimit }),
    [hasAvailableScheduleLimit, scheduleDraft, selectedDates]
  );
  const blockedScheduleItems = useMemo(
    () =>
      blockedScheduleValue
        ? getTrialScheduleCalendarItems(blockedScheduleValue.selectedDates, blockedScheduleValue.scheduleDraft, {
            showPeriodLabel: true
          })
        : [],
    [blockedScheduleValue]
  );
  const scheduleItems = useMemo(
    () => mergeTrialScheduleCalendarMarkers(availableScheduleItems, blockedScheduleItems, arrangedScheduleItems),
    [arrangedScheduleItems, availableScheduleItems, blockedScheduleItems]
  );
  const calendarScheduleLabel = blockedScheduleItems.length > 0 ? blockedScheduleLabel : scheduleLabel;

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

  /** 同步单日排期，并按配置的天数上限和可选日期范围维护可提交日期。 */
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

  /** 移除一组日期的全部排期，并同步可提交日期列表。 */
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

  /** 点击时段名称时切换该时段安排，未选中则填入快捷默认时间，已选中则取消安排。 */
  function handleTogglePeriodPreset(period: TrialSchedulePeriodConfig) {
    if (isDateDisabledForNewSchedule(selectedDate)) {
      return;
    }

    const currentDaySchedule = scheduleDraft[selectedDate] ?? createDefaultDaySchedule();
    const currentPeriodState = currentDaySchedule[period.key];
    const availablePeriodState = availableScheduleDraft[selectedDate]?.[period.key];

    if (currentPeriodState.enabled) {
      handleClearPeriod(period.key);
      return;
    }
    if (isPeriodOutsideAvailableSchedule(selectedDate, period.key) || isPeriodBlockedBySchedule(selectedDate, period.key)) {
      return;
    }

    syncDaySchedule(selectedDate, {
      ...currentDaySchedule,
      [period.key]: {
        enabled: true,
        end: hasAvailableScheduleLimit && availablePeriodState ? availablePeriodState.end : period.defaultEnd,
        start: hasAvailableScheduleLimit && availablePeriodState ? availablePeriodState.start : period.defaultStart
      }
    });
  }

  /** 全选指定日期允许的上午、下午、晚上时段，默认作用于当前查看日期。 */
  function handleSelectFullDaySchedule(dateKey: string = selectedDate) {
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
  function handleClearDaySchedule(dateKey: string = selectedDate) {
    clearDaySchedule(dateKey);
  }

  /** 编辑模式下单击日期直接切换选中：当天已有排期则移除，未排期则按可选时段全选，直接复用编辑区"全选/移除当日安排"的动作。 */
  function handleToggleDaySchedule(dateKey: string) {
    if (selectedDates.includes(dateKey)) {
      handleClearDaySchedule(dateKey);
      return;
    }

    handleSelectFullDaySchedule(dateKey);
  }

  /** 自定义某个时段的开始或结束时间，两个时间均存在时自动计入安排。 */
  function handleChangePeriodTime(periodKey: TrialSchedulePeriodKey, field: "end" | "start", value: string) {
    if (hasAvailableScheduleLimit || isDateDisabledForNewSchedule(selectedDate) || isPeriodBlockedBySchedule(selectedDate, periodKey)) {
      return;
    }

    const currentDaySchedule = scheduleDraft[selectedDate] ?? createDefaultDaySchedule();
    const nextPeriodState = {
      ...currentDaySchedule[periodKey],
      [field]: value
    };

    syncDaySchedule(selectedDate, {
      ...currentDaySchedule,
      [periodKey]: {
        ...nextPeriodState,
        enabled: Boolean(nextPeriodState.start && nextPeriodState.end)
      }
    });
  }

  /** 清空某个时段的自定义时间并取消该时段安排。 */
  function handleClearPeriod(periodKey: TrialSchedulePeriodKey) {
    const currentDaySchedule = scheduleDraft[selectedDate] ?? createDefaultDaySchedule();

    syncDaySchedule(selectedDate, {
      ...currentDaySchedule,
      [periodKey]: {
        enabled: false,
        end: "",
        start: ""
      }
    });
  }

  /** 确认试课安排并返回上层业务弹窗。 */
  function handleConfirmSchedule() {
    if (!schedulePlan) {
      return;
    }

    onConfirm({
      plan: schedulePlan,
      scheduleDraft,
      selectedDates: [...selectedDates].sort()
    });
  }

  return (
    <Modal
      ariaLabel={title}
      icon={<CalendarClock size={18} />}
      onClose={onClose}
      panelClassName="trial-schedule-sheet mx-auto grid max-h-[min(82vh,700px)] max-w-[540px] gap-[12px] overflow-hidden px-[14px] pb-[calc(14px+env(safe-area-inset-bottom))] pt-[14px]"
      title={
        <>
          <strong>{title}</strong>
          <span>{subtitle}</span>
        </>
      }
    >
        <div className="trial-schedule-body grid gap-[12px] overflow-auto pr-[2px]">
          <TrialScheduleCalendar
            activeDate={selectedDate}
            initialDate={initialSelectedDate}
            maxSelectedDates={maxSelectedDates}
            mode={hasAvailableScheduleLimit ? "view" : "edit"}
            onActiveDateChange={setSelectedDate}
            onToggleDate={handleToggleDaySchedule}
            scheduleItems={scheduleItems}
            scheduleLabel={calendarScheduleLabel}
            selectableDates={selectableDates}
            selectedDates={selectedDates}
            showScheduleLabel={false}
          />

          <div className="trial-schedule-editor grid gap-[10px]">
            <div className="trial-schedule-editor-header flex items-center justify-between gap-[10px]">
              <strong>{formatTrialScheduleDate(selectedDate)}</strong>
              {selectedDateHasSchedule ? (
                <button className="text-button" onClick={() => handleClearDaySchedule()} title="点击重置当日安排" type="button">
                  移除当日安排
                </button>
              ) : isOutsideSelectableDates || isScheduleLimitReached ? (
                <span>
                  {isOutsideSelectableDates
                    ? "请选择学生可试课日期"
                    : isScheduleLimitReached
                      ? `最多安排 ${maxSelectedDates} 天`
                      : ""}
                </span>
              ) : getSelectablePeriodsForDate(selectedDate).length === 0 ? (
                <span>已试课时段不可选</span>
              ) : (
                <button className="text-button" onClick={() => handleSelectFullDaySchedule()} type="button">
                  全选
                </button>
              )}
            </div>
            {trialSchedulePeriods.map((period) => {
              const periodState = selectedDaySchedule[period.key];
              const isPeriodSelected = periodState.enabled;
              const isPeriodUnavailable =
                isPeriodOutsideAvailableSchedule(selectedDate, period.key) || isPeriodBlockedBySchedule(selectedDate, period.key);

              return (
                <div className={`trial-schedule-row ${isPeriodSelected ? "selected" : ""} ${isPeriodUnavailable ? "unavailable" : ""}`} key={period.key}>
                  <button
                    className="trial-schedule-toggle"
                    disabled={(isDateDisabledForNewSchedule(selectedDate) && !isPeriodSelected) || (isPeriodUnavailable && !isPeriodSelected)}
                    onClick={() => handleTogglePeriodPreset(period)}
                    type="button"
                  >
                    <strong>{period.label}</strong>
                  </button>
                  <div className="trial-schedule-time-fields">
                    <input
                      aria-label={`${period.label}开始时间`}
                      disabled={
                        hasAvailableScheduleLimit ||
                        isDateDisabledForNewSchedule(selectedDate) ||
                        isPeriodSelected ||
                        isPeriodUnavailable
                      }
                      onChange={(event) => handleChangePeriodTime(period.key, "start", event.target.value)}
                      type="time"
                      value={periodState.start}
                    />
                    <span>至</span>
                    <input
                      aria-label={`${period.label}结束时间`}
                      disabled={
                        hasAvailableScheduleLimit ||
                        isDateDisabledForNewSchedule(selectedDate) ||
                        isPeriodSelected ||
                        isPeriodUnavailable
                      }
                      onChange={(event) => handleChangePeriodTime(period.key, "end", event.target.value)}
                      type="time"
                      value={periodState.end}
                    />
                    <button
                      className="trial-schedule-clear-button"
                      disabled={!periodState.start && !periodState.end}
                      onClick={() => handleClearPeriod(period.key)}
                      type="button"
                    >
                      清空
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="sheet-actions grid grid-cols-2 gap-[8px]">
          <button className="ghost-button min-h-[38px] px-[10px] py-[8px]" onClick={onClose} type="button">
            取消
          </button>
          <button
            className="primary-button min-h-[38px] px-[10px] py-[8px] text-white disabled:text-[var(--h5-subtle)]"
            disabled={!schedulePlan || isConfirming}
            onClick={handleConfirmSchedule}
            type="button"
          >
            {confirmLabel}
          </button>
        </div>
    </Modal>
  );
}
