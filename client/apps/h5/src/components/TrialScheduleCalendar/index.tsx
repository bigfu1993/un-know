import "./index.less";
import { getTutorCalendarCells, getTutorDateKey, getTutorMonthKey } from "@tools/tutorCalendar";

/** 试课日历横向三段时段。 */
export type TrialScheduleCalendarPeriod = "morning" | "afternoon" | "evening";

/** 试课日历单日排期。 */
export interface TrialScheduleCalendarItem {
  date: string;
  periods: TrialScheduleCalendarPeriod[];
}

/** 试课日历组件属性。 */
export interface TrialScheduleCalendarProps {
  activeDate?: string;
  initialDate?: string;
  maxSelectedDates?: number;
  onActiveDateChange?: (dateKey: string) => void;
  onSelectedDatesChange?: (selectedDates: string[]) => void;
  scheduleItems: TrialScheduleCalendarItem[];
  selectedDates: string[];
}

/** 试课日历时段与样式的映射。 */
const trialCalendarPeriods: TrialScheduleCalendarPeriod[] = ["morning", "afternoon", "evening"];

/** 试课日历，按上午、下午、晚上三段横向展示日期排期。 */
export function TrialScheduleCalendar({
  activeDate,
  initialDate,
  maxSelectedDates = 3,
  onActiveDateChange,
  scheduleItems,
  selectedDates
}: TrialScheduleCalendarProps) {
  const today = useMemo(() => new Date(), []);
  const todayKey = getTutorDateKey(today);
  const initialSelectedDate = activeDate ?? initialDate ?? selectedDates[0] ?? todayKey;
  const [viewMonth, setViewMonth] = useState(() => initialSelectedDate.slice(0, 7) || getTutorMonthKey(today));
  const calendarCells = getTutorCalendarCells(viewMonth);
  const monthTitle = `${viewMonth.split("-")[0]}年${Number(viewMonth.split("-")[1])}月`;
  const scheduleMap = useMemo(() => {
    return new Map(scheduleItems.map((item) => [item.date, new Set(item.periods)]));
  }, [scheduleItems]);
  const selectedDateSet = useMemo(() => new Set(selectedDates), [selectedDates]);

  /** 切换日历月份并把当前焦点日期移动到新月份第一天。 */
  function handleChangeMonth(offset: number) {
    const [year, month] = viewMonth.split("-").map(Number);
    const nextDate = new Date(year, month - 1 + offset, 1);
    const nextMonth = getTutorMonthKey(nextDate);
    const nextActiveDate = `${nextMonth}-01`;

    setViewMonth(nextMonth);
    onActiveDateChange?.(nextActiveDate);
  }

  /** 点击日期仅切换查看焦点，排期是否存在由外层时段草稿决定。 */
  function handleSelectDate(dateKey: string) {
    onActiveDateChange?.(dateKey);
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

          const periodSet = scheduleMap.get(dateKey);
          const isSelected = selectedDateSet.has(dateKey) || Boolean(periodSet);
          const isDisabled = !isSelected && selectedDates.length >= maxSelectedDates;
          const dayNumber = Number(dateKey.slice(-2));

          return (
            <button
              className={`trial-schedule-calendar__day ${activeDate === dateKey ? "active" : ""} ${dateKey === todayKey ? "today" : ""} ${isSelected ? "selected" : ""} ${periodSet?.has("morning") ? "has-morning" : ""} ${periodSet?.has("afternoon") ? "has-afternoon" : ""} ${periodSet?.has("evening") ? "has-evening" : ""}`}
              disabled={isDisabled}
              key={dateKey}
              onClick={() => handleSelectDate(dateKey)}
              type="button"
            >
              {trialCalendarPeriods.map((period) => (
                <span className={`trial-schedule-calendar__period ${period}`} key={period} />
              ))}
              <strong>{dayNumber}</strong>
            </button>
          );
        })}
      </div>
    </div>
  );
}
