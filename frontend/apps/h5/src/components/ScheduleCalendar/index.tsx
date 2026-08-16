import "./index.less";
import { getTutorCalendarCells, getTutorDateKey, getTutorMonthKey } from "@tools/tutorCalendar";

/** 日历交互模式：查看模式只切换查看焦点；编辑模式下单击已查看的日期切换选中/取消选中。 */
export type ScheduleCalendarMode = "edit" | "view";

/** 日期面板日历组件属性；只负责月份网格和查看/选中/范围起点交互，不承载具体业务时段展示。 */
export interface ScheduleCalendarProps {
  activeDate?: string;
  maxSelectedDates?: number | null;
  /** 日历交互模式：查看模式只切换查看焦点，不做选中交互；编辑模式下单击已查看的日期才切换选中/取消选中。 */
  mode: ScheduleCalendarMode;
  onActiveDateChange?: (dateKey: string) => void;
  /** 编辑模式下单击"已查看"的日期时触发；查看模式和单击未查看的日期都不会触发。具体选中/取消选中对应什么业务动作由调用方决定。 */
  onToggleDate?: (dateKey: string, selectableDateKeys: string[]) => void;
  /** 待确认的范围起点日期（调用方自行维护对应流程），用于展示背景变色动画。 */
  rangeStartDate?: string | null;
  selectableDates?: string[];
  selectedDates: string[];
}

/** 纯日期面板日历：只展示月份网格和查看/选中/范围起点三态交互，不承载时段等具体业务展示，供需要更轻量日历的场景复用。 */
export function ScheduleCalendar({
  activeDate,
  maxSelectedDates = null,
  mode,
  onActiveDateChange,
  onToggleDate,
  rangeStartDate = null,
  selectableDates,
  selectedDates
}: ScheduleCalendarProps) {
  const today = useMemo(() => new Date(), []);
  const todayKey = getTutorDateKey(today);
  const initialSelectedDate = activeDate ?? selectedDates[0] ?? todayKey;
  const [viewMonth, setViewMonth] = useState(() => initialSelectedDate.slice(0, 7) || getTutorMonthKey(today));
  const calendarCells = useMemo(() => getTutorCalendarCells(viewMonth), [viewMonth]);
  const monthTitle = `${viewMonth.split("-")[0]}年${Number(viewMonth.split("-")[1])}月`;
  const selectedDateSet = useMemo(() => new Set(selectedDates), [selectedDates]);
  const selectableDateSet = useMemo(() => new Set(selectableDates ?? []), [selectableDates]);
  const hasSelectableDateLimit = selectableDateSet.size > 0;
  const selectableDateKeys = useMemo(() => {
    return calendarCells
      .filter((dateKey): dateKey is string => Boolean(dateKey))
      .filter((dateKey) => !hasSelectableDateLimit || selectableDateSet.has(dateKey));
  }, [calendarCells, hasSelectableDateLimit, selectableDateSet]);

  /** 切换日历月份并把当前焦点日期移动到新月份第一天。 */
  function handleChangeMonth(offset: number) {
    const [year, month] = viewMonth.split("-").map(Number);
    const nextDate = new Date(year, month - 1 + offset, 1);
    const nextMonth = getTutorMonthKey(nextDate);
    const nextActiveDate = `${nextMonth}-01`;

    setViewMonth(nextMonth);
    onActiveDateChange?.(nextActiveDate);
  }

  /** 单击未查看的日期只切换查看焦点；编辑模式下单击已查看的日期才触发选中/取消选中。 */
  function handleSelectDate(dateKey: string) {
    const wasViewingClickedDate = activeDate === dateKey;

    onActiveDateChange?.(dateKey);

    if (mode === "edit" && wasViewingClickedDate) {
      onToggleDate?.(dateKey, selectableDateKeys);
    }
  }

  return (
    <div className="schedule-calendar" aria-label="日期面板日历">
      <div className="schedule-calendar__toolbar flex items-center justify-between gap-[10px]">
        <button className="ghost-button px-[10px] py-[8px]" onClick={() => handleChangeMonth(-1)} type="button">
          上月
        </button>
        <strong>{monthTitle}</strong>
        <button className="ghost-button px-[10px] py-[8px]" onClick={() => handleChangeMonth(1)} type="button">
          下月
        </button>
      </div>

      <div className="schedule-calendar__weekdays grid">
        {["日", "一", "二", "三", "四", "五", "六"].map((weekday) => (
          <span key={weekday}>{weekday}</span>
        ))}
      </div>

      <div className="schedule-calendar__grid grid">
        {calendarCells.map((dateKey, index) => {
          if (!dateKey) {
            return <span className="schedule-calendar__day empty" key={`empty-${index}`} />;
          }

          const isSelected = selectedDateSet.has(dateKey);
          const isOverMaxSelectedDates =
            maxSelectedDates !== null && maxSelectedDates !== undefined && selectedDates.length >= maxSelectedDates && !isSelected;
          const isOutsideSelectableDates = hasSelectableDateLimit && !selectableDateSet.has(dateKey);
          const isPastDate = dateKey < todayKey;
          const dayNumber = Number(dateKey.slice(-2));

          return (
            <button
              className={`schedule-calendar__day ${activeDate === dateKey ? "active" : ""} ${dateKey === todayKey ? "today" : ""} ${isSelected ? "selected" : ""} ${dateKey === rangeStartDate ? "range-start" : ""} ${isOverMaxSelectedDates ? "limited" : ""} ${isPastDate ? "past" : ""}`}
              disabled={isOutsideSelectableDates}
              key={dateKey}
              onClick={() => handleSelectDate(dateKey)}
              type="button"
            >
              <strong>{dayNumber}</strong>
            </button>
          );
        })}
      </div>
    </div>
  );
}
