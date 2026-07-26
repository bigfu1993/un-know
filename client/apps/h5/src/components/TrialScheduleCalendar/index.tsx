import "./index.less";
import { getTutorCalendarCells, getTutorDateKey, getTutorMonthKey } from "@tools/tutorCalendar";

/** 试课日历横向三段时段。 */
export type TrialScheduleCalendarPeriod = "morning" | "afternoon" | "evening";

/** 试课日历单日排期。 */
export interface TrialScheduleCalendarItem {
  date: string;
  labelPeriods?: TrialScheduleCalendarPeriod[];
  periods: TrialScheduleCalendarPeriod[];
}

/** 试课日历组件属性。 */
export interface TrialScheduleCalendarProps {
  activeDate?: string;
  initialDate?: string;
  maxSelectedDates?: number | null;
  onActiveDateChange?: (dateKey: string) => void;
  onDayDoubleClick?: (dateKey: string, selectableDateKeys: string[]) => void;
  onSelectedDatesChange?: (selectedDates: string[]) => void;
  rangeStartDate?: string | null;
  scheduleItems: TrialScheduleCalendarItem[];
  selectableDates?: string[];
  selectedDates: string[];
  showScheduleLabel?: boolean;
}

/** 试课日历时段与样式的映射。 */
const trialCalendarPeriods: TrialScheduleCalendarPeriod[] = ["morning", "afternoon", "evening"];

/** 试课日历，按上午、下午、晚上三段横向展示日期排期。 */
export function TrialScheduleCalendar({
  activeDate,
  initialDate,
  maxSelectedDates = 3,
  onActiveDateChange,
  onDayDoubleClick,
  rangeStartDate,
  scheduleItems,
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
  /** 最近一次日期点击记录，用于兼容 H5 触屏双击和桌面双击。 */
  const lastDateClickRef = useRef<{ dateKey: string; time: number } | null>(null);

  /** 切换日历月份并把当前焦点日期移动到新月份第一天。 */
  function handleChangeMonth(offset: number) {
    const [year, month] = viewMonth.split("-").map(Number);
    const nextDate = new Date(year, month - 1 + offset, 1);
    const nextMonth = getTutorMonthKey(nextDate);
    const nextActiveDate = `${nextMonth}-01`;

    setViewMonth(nextMonth);
    onActiveDateChange?.(nextActiveDate);
  }

  /** 单击日期切换当前查看日期；仅调用方传入双击回调时才启用批量选择。 */
  function handleSelectDate(dateKey: string, clickTime: number) {
    onActiveDateChange?.(dateKey);
    if (!onDayDoubleClick) {
      return;
    }

    const lastDateClick = lastDateClickRef.current;
    if (lastDateClick?.dateKey === dateKey && clickTime - lastDateClick.time <= 360) {
      lastDateClickRef.current = null;
      onDayDoubleClick?.(dateKey, selectableDateKeys);
      return;
    }

    lastDateClickRef.current = { dateKey, time: clickTime };
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
              className={`trial-schedule-calendar__day ${activeDate === dateKey ? "active" : ""} ${rangeStartDate === dateKey ? "range-start" : ""} ${dateKey === todayKey ? "today" : ""} ${isSelected ? "selected" : ""} ${isOverMaxSelectedDates ? "limited" : ""} ${periodSet?.has("morning") ? "has-morning" : ""} ${periodSet?.has("afternoon") ? "has-afternoon" : ""} ${periodSet?.has("evening") ? "has-evening" : ""}`}
              disabled={isOutsideSelectableDates}
              key={dateKey}
              onClick={(event) => handleSelectDate(dateKey, event.timeStamp)}
              type="button"
            >
              {trialCalendarPeriods.map((period) => (
                <span className={`trial-schedule-calendar__period ${period}`} key={period}>
                  {scheduleEntry?.labelPeriods.has(period) ||
                  (!scheduleEntry?.hasCustomLabelPeriods && showScheduleLabel && periodSet?.has(period)) ? (
                    <span className="trial-schedule-calendar__period-label">课</span>
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
