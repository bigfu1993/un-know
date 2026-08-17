/** 家教课程日历任务数据。 */
import "./index.less";
import { getTutorCalendarCells, getTutorDateKey, getTutorMonthKey } from "@tools/tutorCalendar";

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
export interface TutorCalendarProps {
  initialDate?: string;
  onClose: () => void;
  tasks: TutorCalendarTask[];
}

/** 家教课程日历弹窗，通过传入的家教任务数据渲染日期标记和当天详情。 */
export function TutorCalendar({ initialDate, onClose, tasks }: TutorCalendarProps) {
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
    <Modal
      ariaLabel="家教课程日历"
      onClose={onClose}
      panelClassName="tutor-calendar-sheet mx-auto grid max-h-[90vh] max-w-[540px] gap-[14px] overflow-auto px-[14px] pb-[calc(18px+env(safe-area-inset-bottom))] pt-[16px]"
      panelElement="div"
    >
      <div className="card-title flex items-center justify-between gap-[10px]">
        <CalendarClock size={18} />
        <div className="tutor-calendar-title-copy">
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
          <div className="tutor-calendar-detail-title-copy">
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
    </Modal>
  );
}
