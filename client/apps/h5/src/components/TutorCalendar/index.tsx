/** 家教课程日历任务数据。 */
import "./index.less";

export interface TutorCalendarTask {
  date: string;
  duration: string;
  id: string;
  location: string;
  period: "am" | "pm";
  subject: string;
  time: string;
  title: string;
}

/** 家教课程日历弹窗属性。 */
export interface TutorCalendarDialogProps {
  initialDate?: string;
  onClose: () => void;
  tasks: TutorCalendarTask[];
}

/** 获取日历使用的日期字符串。 */
function getTutorDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/** 获取日历使用的月份字符串。 */
function getTutorMonthKey(date: Date) {
  return getTutorDateKey(date).slice(0, 7);
}

/** 生成指定月份的日历网格。 */
function getTutorCalendarCells(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  const firstDay = new Date(year, month - 1, 1);
  const totalDays = new Date(year, month, 0).getDate();
  const leadingEmptyCells = firstDay.getDay();
  const emptyCells = Array.from({ length: leadingEmptyCells }, () => null);
  const dayCells = Array.from({ length: totalDays }, (_, index) => {
    const day = String(index + 1).padStart(2, "0");

    return `${monthKey}-${day}`;
  });

  return [...emptyCells, ...dayCells];
}

/** 家教课程日历弹窗，通过传入的家教任务数据渲染日期标记和当天详情。 */
export function TutorCalendarDialog({ initialDate, onClose, tasks }: TutorCalendarDialogProps) {
  const today = useMemo(() => new Date(), []);
  const todayKey = getTutorDateKey(today);
  const initialSelectedDate = initialDate ?? todayKey;
  const [viewMonth, setViewMonth] = useState(() => initialSelectedDate.slice(0, 7) || getTutorMonthKey(today));
  const [selectedDate, setSelectedDate] = useState(initialSelectedDate);
  const calendarCells = getTutorCalendarCells(viewMonth);
  const selectedDateTasks = tasks.filter((task) => task.date === selectedDate);
  const monthTitle = `${viewMonth.split("-")[0]}年${Number(viewMonth.split("-")[1])}月`;

  /** 切换日历月份并默认选中新月份第一天。 */
  function handleChangeMonth(offset: number) {
    const [year, month] = viewMonth.split("-").map(Number);
    const nextDate = new Date(year, month - 1 + offset, 1);
    const nextMonth = getTutorMonthKey(nextDate);

    setViewMonth(nextMonth);
    setSelectedDate(`${nextMonth}-01`);
  }

  return (
    <section className="checkout-sheet" aria-label="家教课程日历">
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet-panel tutor-calendar-sheet mx-auto grid max-h-[90vh] max-w-[540px] gap-[14px] overflow-auto px-[14px] pb-[calc(18px+env(safe-area-inset-bottom))] pt-[16px]">
        <div className="card-title flex items-center justify-between gap-[10px]">
          <CalendarClock size={18} />
          <div>
            <strong>课程日历</strong>
            <span>按上午、下午半天展示家教任务。</span>
          </div>
          <button className="icon-only grid h-[34px] w-[34px] place-items-center text-[#475466]" onClick={onClose} type="button" aria-label="关闭">
            <XCircle size={20} />
          </button>
        </div>

        <div className="tutor-calendar-toolbar flex items-center justify-between gap-[10px]">
          <button className="ghost-button px-[10px] py-[8px]" onClick={() => handleChangeMonth(-1)} type="button">
            上月
          </button>
          <strong>{monthTitle}</strong>
          <button className="ghost-button px-[10px] py-[8px]" onClick={() => handleChangeMonth(1)} type="button">
            下月
          </button>
        </div>

        <div className="tutor-calendar-weekdays grid">
          {["日", "一", "二", "三", "四", "五", "六"].map((weekday) => (
            <span key={weekday}>{weekday}</span>
          ))}
        </div>
        <div className="tutor-calendar-grid grid">
          {calendarCells.map((dateKey, index) => {
            const dayTasks = dateKey ? tasks.filter((task) => task.date === dateKey) : [];
            const hasMorningTask = dayTasks.some((task) => task.period === "am");
            const hasAfternoonTask = dayTasks.some((task) => task.period === "pm");
            const dayNumber = dateKey ? Number(dateKey.slice(-2)) : "";

            return dateKey ? (
              <button
                className={`tutor-calendar-day ${dateKey === selectedDate ? "selected" : ""} ${dateKey === todayKey ? "today" : ""} ${hasMorningTask ? "has-am" : ""} ${hasAfternoonTask ? "has-pm" : ""}`}
                key={dateKey}
                onClick={() => setSelectedDate(dateKey)}
                type="button"
              >
                <span className="tutor-calendar-half am" />
                <span className="tutor-calendar-half pm" />
                <strong>{dayNumber}</strong>
              </button>
            ) : (
              <span className="tutor-calendar-day empty" key={`empty-${index}`} />
            );
          })}
        </div>

        <div className="tutor-calendar-detail grid gap-[8px]">
          <div className="card-title flex items-center justify-between gap-[10px]">
            <CalendarClock size={18} />
            <div>
              <strong>{selectedDate}</strong>
              <span>当日家教详情</span>
            </div>
          </div>
          {selectedDateTasks.length > 0 ? (
            selectedDateTasks.map((task) => (
              <article className="tutor-calendar-task p-[10px]" key={task.id}>
                <strong>{task.title}</strong>
                <span>
                  {task.time} · {task.location}
                </span>
                <span>
                  {task.subject} · {task.duration}
                </span>
              </article>
            ))
          ) : (
            <p className="notice p-[10px] text-[#61420d]">当天暂无家教任务。</p>
          )}
        </div>
      </div>
    </section>
  );
}
