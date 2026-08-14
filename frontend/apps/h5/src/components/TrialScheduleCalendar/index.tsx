import "./index.less";
import { getTutorCalendarCells, getTutorDateKey, getTutorMonthKey } from "@tools/tutorCalendar";

/** 试课日历横向三段时段。 */
export type TrialScheduleCalendarPeriod = "morning" | "afternoon" | "evening";

/** 日历交互模式：查看模式只切换查看焦点；编辑模式单击直接选中/取消选中日期。 */
export type TrialScheduleCalendarMode = "edit" | "view";

/** 试课日历单日排期。 */
export interface TrialScheduleCalendarItem {
  date: string;
  labelPeriods?: TrialScheduleCalendarPeriod[];
  periodLabels?: Partial<Record<TrialScheduleCalendarPeriod, string>>;
  periods: TrialScheduleCalendarPeriod[];
}

/** 试课日历组件属性。 */
export interface TrialScheduleCalendarProps {
  activeDate?: string;
  initialDate?: string;
  maxSelectedDates?: number | null;
  /** 日历交互模式：查看模式只切换查看焦点，不做选中交互；编辑模式单击直接选中/取消选中日期。 */
  mode: TrialScheduleCalendarMode;
  onActiveDateChange?: (dateKey: string) => void;
  /**
   * 双击日期时触发，用于连续区间这类需要"两步确定起止"的场景；与 onToggleDate 互斥使用，
   * 传入后单击不再直接触发 onToggleDate，只切换查看焦点，避免双击的第一下被误判成单击选中。
   */
  onDayDoubleClick?: (dateKey: string, selectableDateKeys: string[]) => void;
  /** 编辑模式下单击日期时触发；查看模式和传了 onDayDoubleClick 时都不会触发。具体选中/取消选中对应什么业务动作由调用方决定。 */
  onToggleDate?: (dateKey: string, selectableDateKeys: string[]) => void;
  /** 待确认的范围起点日期（调用方自行维护"双击两次确定区间"流程），用于展示背景变色动画。 */
  rangeStartDate?: string | null;
  scheduleItems: TrialScheduleCalendarItem[];
  scheduleLabel?: string;
  selectableDates?: string[];
  selectedDates: string[];
  showScheduleLabel?: boolean;
}

/** 试课日历时段与样式的映射。 */
const trialCalendarPeriods: TrialScheduleCalendarPeriod[] = ["morning", "afternoon", "evening"];

/** H5 双击日期的最长间隔，兼容移动端连续轻点和桌面双击。 */
const trialCalendarDoubleClickDelay = 420;

/** 原生 dblclick 与连续 click 识别之间的去重窗口。 */
const trialCalendarDoubleClickDedupDelay = 120;

/** 试课日历，按上午、下午、晚上三段横向展示日期排期。 */
export function TrialScheduleCalendar({
  activeDate,
  initialDate,
  maxSelectedDates = 3,
  mode,
  onActiveDateChange,
  onDayDoubleClick,
  onToggleDate,
  rangeStartDate = null,
  scheduleItems,
  scheduleLabel = "课",
  selectableDates,
  selectedDates,
  showScheduleLabel = false
}: TrialScheduleCalendarProps) {
  const today = useMemo(() => new Date(), []);
  const todayKey = getTutorDateKey(today);
  const initialSelectedDate = activeDate ?? initialDate ?? selectedDates[0] ?? todayKey;
  const [viewMonth, setViewMonth] = useState(() => initialSelectedDate.slice(0, 7) || getTutorMonthKey(today));
  const calendarCells = useMemo(() => getTutorCalendarCells(viewMonth), [viewMonth]);
  const monthTitle = `${viewMonth.split("-")[0]}年${Number(viewMonth.split("-")[1])}月`;
  const scheduleMap = useMemo(() => {
    return new Map(
      scheduleItems.map((item) => [
        item.date,
        {
          hasCustomLabelPeriods: item.labelPeriods !== undefined,
          labelPeriods: new Set(item.labelPeriods ?? []),
          periodLabels: new Map(
            Object.entries(item.periodLabels ?? {}) as Array<[TrialScheduleCalendarPeriod, string]>
          ),
          periods: new Set(item.periods)
        }
      ])
    );
  }, [scheduleItems]);
  const selectedDateSet = useMemo(() => new Set(selectedDates), [selectedDates]);
  const selectableDateSet = useMemo(() => new Set(selectableDates ?? []), [selectableDates]);
  const hasSelectableDateLimit = selectableDateSet.size > 0;
  const selectableDateKeys = useMemo(() => {
    return calendarCells
      .filter((dateKey): dateKey is string => Boolean(dateKey))
      .filter((dateKey) => !hasSelectableDateLimit || selectableDateSet.has(dateKey));
  }, [calendarCells, hasSelectableDateLimit, selectableDateSet]);
  /** 最近一次日期点击记录，用于兼容 H5 触屏双击和桌面双击；只在传了 onDayDoubleClick 时使用。 */
  const lastDateClickRef = useRef<{ dateKey: string; time: number } | null>(null);
  /** 最近一次已触发的双击记录，用于避免桌面端原生 dblclick 重复触发。 */
  const lastDoubleClickRef = useRef<{ dateKey: string; time: number } | null>(null);

  /** 切换日历月份并把当前焦点日期移动到新月份第一天。 */
  function handleChangeMonth(offset: number) {
    const [year, month] = viewMonth.split("-").map(Number);
    const nextDate = new Date(year, month - 1 + offset, 1);
    const nextMonth = getTutorMonthKey(nextDate);
    const nextActiveDate = `${nextMonth}-01`;

    setViewMonth(nextMonth);
    onActiveDateChange?.(nextActiveDate);
  }

  /** 双击日期交给调用方决定范围选择行为，去重避免原生 dblclick 和连续 click 识别重复触发。 */
  function handleDoubleClickDate(dateKey: string, currentTime: number) {
    if (!onDayDoubleClick) {
      return;
    }

    const lastDoubleClick = lastDoubleClickRef.current;

    if (lastDoubleClick?.dateKey === dateKey && currentTime - lastDoubleClick.time <= trialCalendarDoubleClickDedupDelay) {
      return;
    }

    lastDateClickRef.current = null;
    lastDoubleClickRef.current = { dateKey, time: currentTime };
    onActiveDateChange?.(dateKey);
    onDayDoubleClick(dateKey, selectableDateKeys);
  }

  /**
   * 单击日期：传了 onDayDoubleClick 时只切换查看焦点，并通过连续点击识别 H5 双击；
   * 否则查看模式只切换查看焦点，编辑模式在切换查看焦点的同时直接触发选中/取消选中。
   */
  function handleSelectDate(dateKey: string, currentTime: number) {
    if (onDayDoubleClick) {
      const lastDateClick = lastDateClickRef.current;

      if (lastDateClick?.dateKey === dateKey && currentTime - lastDateClick.time <= trialCalendarDoubleClickDelay) {
        handleDoubleClickDate(dateKey, currentTime);
        return;
      }

      lastDateClickRef.current = { dateKey, time: currentTime };
      onActiveDateChange?.(dateKey);
      return;
    }

    onActiveDateChange?.(dateKey);

    if (mode === "edit") {
      onToggleDate?.(dateKey, selectableDateKeys);
    }
  }

  return (
    <div className="trial-schedule-calendar" aria-label="试课日历">
      <div className="trial-schedule-calendar__toolbar flex items-center justify-between gap-[10px]">
        <button className="ghost-button px-[10px] py-[8px]" onClick={() => handleChangeMonth(-1)} type="button">
          上月
        </button>
        <strong>{monthTitle}</strong>
        <button className="ghost-button px-[10px] py-[8px]" onClick={() => handleChangeMonth(1)} type="button">
          下月
        </button>
      </div>

      <div className="trial-schedule-calendar__weekdays grid">
        {["日", "一", "二", "三", "四", "五", "六"].map((weekday) => (
          <span key={weekday}>{weekday}</span>
        ))}
      </div>

      <div className="trial-schedule-calendar__grid grid">
        {calendarCells.map((dateKey, index) => {
          if (!dateKey) {
            return <span className="trial-schedule-calendar__day empty" key={`empty-${index}`} />;
          }

          const scheduleEntry = scheduleMap.get(dateKey);
          const periodSet = scheduleEntry?.periods;
          const isSelected = selectedDateSet.has(dateKey);
          const isOverMaxSelectedDates =
            maxSelectedDates !== null && maxSelectedDates !== undefined && selectedDates.length >= maxSelectedDates && !isSelected;
          const isOutsideSelectableDates = hasSelectableDateLimit && !selectableDateSet.has(dateKey);
          const dayNumber = Number(dateKey.slice(-2));

          return (
            <button
              className={`trial-schedule-calendar__day ${activeDate === dateKey ? "active" : ""} ${dateKey === todayKey ? "today" : ""} ${isSelected ? "selected" : ""} ${dateKey === rangeStartDate ? "range-start" : ""} ${isOverMaxSelectedDates ? "limited" : ""} ${periodSet?.has("morning") ? "has-morning" : ""} ${periodSet?.has("afternoon") ? "has-afternoon" : ""} ${periodSet?.has("evening") ? "has-evening" : ""}`}
              disabled={isOutsideSelectableDates}
              key={dateKey}
              onClick={(event) => handleSelectDate(dateKey, event.timeStamp)}
              onDoubleClick={(event) => handleDoubleClickDate(dateKey, event.timeStamp)}
              type="button"
            >
              {trialCalendarPeriods.map((period) => (
                <span className={`trial-schedule-calendar__period ${period}`} key={period}>
                  {scheduleEntry?.periodLabels.get(period) ? (
                    <span className="trial-schedule-calendar__period-label">{scheduleEntry.periodLabels.get(period)}</span>
                  ) : scheduleEntry?.labelPeriods.has(period) ||
                  (!scheduleEntry?.hasCustomLabelPeriods && showScheduleLabel && periodSet?.has(period)) ? (
                    <span className="trial-schedule-calendar__period-label">{scheduleLabel}</span>
                  ) : null}
                </span>
              ))}
              <strong>{dayNumber}</strong>
            </button>
          );
        })}
      </div>
    </div>
  );
}
