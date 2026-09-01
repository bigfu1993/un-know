import "./TutorCalendar.less";

/** 家教课程日历任务数据。 */
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
  calendarTasks: TutorCalendarTask[];
  onClose: () => void;
}

/** 正式课程日历固定按上午、下午两段展示。 */
const arrangedPeriods = ["am", "pm"];

/**
 * 家教课程日历弹窗：日历网格复用 ScheduleCalendar 的 CalendarPanel（分段标记能力，上午/下午两段），
 * 只保留当天详情列表这部分自己的展示逻辑，不再重复实现月份网格、翻页和空格子这些 CalendarPanel
 * 已经提供的能力。
 */
export function TutorCalendar({ calendarTasks, onClose }: TutorCalendarProps) {
  const [activeDate, setActiveDate] = useState(getDefaultTutorScheduleDate);
  const activeDateTasks = calendarTasks.filter((task) => task.date === activeDate);
  /** 按日期归并正式课程分段，使用 arranged 数据通道，不产生试课角标。 */
  const arrangedDatas = useMemo<CalendarPanelScheduleData[]>(() => {
    const dateSet = new Set(calendarTasks.map((task) => task.date));

    return [...dateSet].map((date) => ({
      date,
      periods: calendarTasks.filter((task) => task.date === date).map((task) => task.period)
    }));
  }, [calendarTasks]);

  return (
    <Modal
      ariaLabel="家教课程日历"
      icon={<CalendarClock size={18} />}
      onClose={onClose}
      panelClassName="tutor-calendar-sheet mx-auto grid max-h-[90vh] max-w-[540px] gap-[14px] overflow-auto px-[14px] pb-[calc(18px+env(safe-area-inset-bottom))] pt-[16px]"
      panelElement="div"
      title={
        <>
          <strong>课程日历</strong>
          <span>按上午、下午半天展示家教任务。</span>
        </>
      }
    >
      <CalendarPanel
        activeDate={activeDate}
        arrangedDatas={arrangedDatas}
        arrangedPeriods={arrangedPeriods}
        mode="view"
        onActiveDateChange={setActiveDate}
      />

      <div className="tutor-calendar-detail grid gap-[8px]">
        <div className="card-title flex items-center justify-between gap-[10px]">
          <CalendarClock size={18} />
          <div className="tutor-calendar-detail-title-copy">
            <strong>{activeDate}</strong>
            <span>当日家教详情</span>
          </div>
        </div>
        {activeDateTasks.length > 0 ? (
          activeDateTasks.map((task) => (
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
          <p className="notice p-[10px] text-[var(--h5-warning)]">当天暂无家教任务。</p>
        )}
      </div>
    </Modal>
  );
}
