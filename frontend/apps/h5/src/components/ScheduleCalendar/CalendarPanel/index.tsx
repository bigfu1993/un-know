import "./index.less";
import { getTutorCalendarCells, getTutorDateKey, getTutorMonthKey } from "@tools/tutorCalendar";
import { Moon, Sun, Sunrise } from "lucide-react";

/** 日历交互模式：查看模式只切换查看焦点；编辑模式下单击已查看的日期切换计划状态，并支持按住滑动批量调整计划日期。 */
export type CalendarPanelMode = "edit" | "view";

/**
 * 单个日期格子内的日程分段数据；试课和正式课程共用该结构，通过不同 Props 保持业务语义独立。
 */
export interface CalendarPanelScheduleData {
  date: string;
  /** 命中的分段 key 列表，决定这一天哪几段显示日程底色。 */
  periods: string[];
}

/** 日期面板日历组件属性；只负责月份网格、查看/计划编辑交互以及试课/正式课程日程分段展示。 */
export interface CalendarPanelProps {
  activeDate?: string;
  /** 按日期维护的正式课程数据；存在数据时展示时段，但不产生试课角标。 */
  arrangedDatas?: CalendarPanelScheduleData[];
  /** 正式课程数据的分段 key 顺序。 */
  arrangedPeriods?: string[];
  /** 日历交互模式：查看模式只切换查看焦点；编辑模式下单击已查看日期切换计划状态，也支持按住滑动批量调整计划日期。 */
  mode: CalendarPanelMode;
  onActiveDateChange?: (dateKey: string) => void;
  /**
   * 编辑模式下触发：单击"已查看"的日期时触发一次；按住滑动结束时，对本次滑动扫过的每个日期各触发一次
   * （落在最终范围内但还没计划的会加入计划，滑动扫过但最终落在范围外、且原本已计划的会移出计划）。
   * 查看模式和单击未查看的日期都不会触发。因为滑动结束时可能连续触发多次，调用方需要用函数式
   * setState 更新计划日期列表，不能依赖闭包里的旧值。
   */
  onToggleDate?: (dateKey: string, selectableDateKeys: string[]) => void;
  /**
   * 计划日期：发布家教时作为编辑数据源，后续试课安排时作为只读参考回显；对应格子统一附加 planned 类。
   */
  plannedDates?: string[];
  /** 按日期维护的试课数据；日期存在对应数据时在日期数字右上角显示“试”。 */
  testedDatas?: CalendarPanelScheduleData[];
  /** 试课数据的分段 key 顺序。 */
  testedPeriods?: string[];
}

/** 将日程数组转换为按日期索引的分段集合，避免渲染每个日期时重复遍历。 */
function createScheduleDataMap(datas: CalendarPanelScheduleData[]) {
  return new Map(datas.map((data) => [data.date, new Set(data.periods)]));
}

/** 按上午、下午、晚上的业务语义返回对应图标，未知 key 按分段顺序兜底。 */
function getSchedulePeriodIcon(period: string, periodIndex: number) {
  if (period === "morning" || period === "am") {
    return Sunrise;
  }
  if (period === "afternoon" || period === "pm") {
    return Sun;
  }
  if (period === "evening") {
    return Moon;
  }

  return [Sunrise, Sun, Moon][periodIndex % 3];
}

/** 拖拽滑动过程中的即时状态，只用 ref 保存，避免 window 事件监听器闭包读到过期值。 */
interface CalendarPanelDragState {
  /** 当前指针经过的日期。 */
  currentDate: string | null;
  /** 按住开始调整计划范围的起点日期，非空代表计划范围手势正在进行。 */
  startDate: string | null;
  /** 本次滑动全程经过的最大日期（起点和途经的每个日期取最大值）。 */
  touchedMaxDate: string | null;
  /** 本次滑动全程经过的最小日期（起点和途经的每个日期取最小值）。 */
  touchedMinDate: string | null;
}

const initialDragState: CalendarPanelDragState = {
  currentDate: null,
  startDate: null,
  touchedMaxDate: null,
  touchedMinDate: null
};

/** 日期面板日历：展示月份网格、查看/计划编辑交互以及试课和正式课程的分时段状态。 */
export function CalendarPanel({
  activeDate,
  arrangedDatas = [],
  arrangedPeriods = [],
  mode,
  onActiveDateChange,
  onToggleDate,
  plannedDates = [],
  testedDatas = [],
  testedPeriods = []
}: CalendarPanelProps) {
  const today = useMemo(() => new Date(), []);
  const todayKey = getTutorDateKey(today);
  const initialActiveDate = activeDate ?? plannedDates[0] ?? todayKey;
  const [viewMonth, setViewMonth] = useState(() => initialActiveDate.slice(0, 7) || getTutorMonthKey(today));
  const calendarCells = useMemo(() => getTutorCalendarCells(viewMonth), [viewMonth]);
  const monthTitle = `${viewMonth.split("-")[0]}年${Number(viewMonth.split("-")[1])}月`;
  const arrangedDataMap = useMemo(() => createScheduleDataMap(arrangedDatas), [arrangedDatas]);
  const testedDataMap = useMemo(() => createScheduleDataMap(testedDatas), [testedDatas]);
  /** 两类日程使用同一日期格分段，按调用方顺序去重后统一渲染。 */
  const schedulePeriods = useMemo(
    () => [...new Set([...testedPeriods, ...arrangedPeriods])],
    [arrangedPeriods, testedPeriods]
  );
  /** 计划日期索引同时驱动发布编辑态和后续试课计划回显。 */
  const plannedDateSet = useMemo(() => new Set(plannedDates), [plannedDates]);
  const selectableDateKeys = useMemo(
    () => calendarCells.filter((dateKey): dateKey is string => Boolean(dateKey)),
    [calendarCells]
  );
  /** 拖拽滑动状态的可渲染镜像；随手势推进同步更新，用于计算实时预览。 */
  const [dragState, setDragState] = useState<CalendarPanelDragState>(initialDragState);
  /** 标记刚发生过滑动，用于抑制滑动松开后紧跟的一次单击，避免被当成普通点击重复处理。 */
  const justDraggedRef = useRef(false);
  /**
   * 和 dragState 同步更新的镜像值，供 window 事件监听器读取。监听器是在滑动开始那一刻的
   * 渲染里创建的闭包，之后不会随 state 更新而重新创建，必须靠 ref 才能在松手那一刻读到
   * 滑动过程中最新的经过日期和扫过范围，而不是滑动开始时的旧值。
   */
  const dragStateRef = useRef(initialDragState);
  /** 保存滑动结束时需要用到的最新回调和数据，避免闭包读到滑动开始时的旧值。 */
  const latestRef = useRef({ onToggleDate, plannedDateSet, selectableDateKeys });

  useEffect(() => {
    latestRef.current = { onToggleDate, plannedDateSet, selectableDateKeys };
  }, [onToggleDate, plannedDateSet, selectableDateKeys]);

  /** 本次滑动全程经过的日期范围（起点和途经的每个日期的并集），这些日期的显示状态完全交给本次滑动控制。 */
  const dragTouchedDateSet = useMemo(() => {
    const { touchedMaxDate, touchedMinDate } = dragState;

    if (!touchedMinDate || !touchedMaxDate) {
      return new Set<string>();
    }

    return new Set(selectableDateKeys.filter((dateKey) => dateKey >= touchedMinDate && dateKey <= touchedMaxDate));
  }, [dragState, selectableDateKeys]);
  /** 当前指针位置对应的实时范围，扫过但不在最终范围内的日期实时显示为未计划。 */
  const dragLiveRangeDateSet = useMemo(() => {
    const { currentDate, startDate } = dragState;

    if (!startDate || !currentDate) {
      return new Set<string>();
    }

    const [rangeMinDateKey, rangeMaxDateKey] = [startDate, currentDate].sort();

    return new Set(selectableDateKeys.filter((dateKey) => dateKey >= rangeMinDateKey && dateKey <= rangeMaxDateKey));
  }, [dragState, selectableDateKeys]);

  /** 松开滑动手势后按最终范围同步本次扫过日期的计划状态。 */
  function handleDragEnd() {
    const { currentDate, startDate, touchedMaxDate, touchedMinDate } = dragStateRef.current;

    if (!startDate) {
      return;
    }

    if (currentDate && currentDate !== startDate && touchedMinDate && touchedMaxDate) {
      justDraggedRef.current = true;

      const [rangeMinDateKey, rangeMaxDateKey] = [startDate, currentDate].sort();
      const {
        onToggleDate: latestOnToggleDate,
        plannedDateSet: latestPlannedDateSet,
        selectableDateKeys: latestSelectableDateKeys
      } = latestRef.current;

      latestSelectableDateKeys
        .filter((dateKey) => dateKey >= touchedMinDate && dateKey <= touchedMaxDate)
        .filter((dateKey) => {
          const shouldBePlanned = dateKey >= rangeMinDateKey && dateKey <= rangeMaxDateKey;

          return shouldBePlanned !== latestPlannedDateSet.has(dateKey);
        })
        .forEach((dateKey) => latestOnToggleDate?.(dateKey, latestSelectableDateKeys));
    }

    dragStateRef.current = initialDragState;
    setDragState(initialDragState);
  }

  /** 按住单元格开始滑动调整计划范围；只在编辑模式下生效，查看模式按住不会有任何效果。 */
  function handleDragStart(dateKey: string) {
    if (mode !== "edit") {
      return;
    }

    const nextDragState: CalendarPanelDragState = {
      currentDate: dateKey,
      startDate: dateKey,
      touchedMaxDate: dateKey,
      touchedMinDate: dateKey
    };

    dragStateRef.current = nextDragState;
    setDragState(nextDragState);
  }

  useEffect(() => {
    if (!dragState.startDate) {
      return;
    }

    function handlePointerMove(event: PointerEvent) {
      const elementUnderPointer = document.elementFromPoint(event.clientX, event.clientY);
      const dayElement = elementUnderPointer?.closest<HTMLElement>("[data-date-key]");
      const dateKey = dayElement?.dataset.dateKey;

      if (!dateKey || dateKey === dragStateRef.current.currentDate) {
        return;
      }

      const { touchedMaxDate, touchedMinDate } = dragStateRef.current;
      const nextDragState: CalendarPanelDragState = {
        ...dragStateRef.current,
        currentDate: dateKey,
        touchedMaxDate: touchedMaxDate && touchedMaxDate > dateKey ? touchedMaxDate : dateKey,
        touchedMinDate: touchedMinDate && touchedMinDate < dateKey ? touchedMinDate : dateKey
      };

      dragStateRef.current = nextDragState;
      setDragState(nextDragState);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handleDragEnd);
    window.addEventListener("pointercancel", handleDragEnd);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handleDragEnd);
      window.removeEventListener("pointercancel", handleDragEnd);
    };
  }, [dragState.startDate]);

  /** 切换日历月份并把当前焦点日期移动到新月份第一天。 */
  function handleChangeMonth(offset: number) {
    const [year, month] = viewMonth.split("-").map(Number);
    const nextDate = new Date(year, month - 1 + offset, 1);
    const nextMonth = getTutorMonthKey(nextDate);
    const nextActiveDate = `${nextMonth}-01`;

    setViewMonth(nextMonth);
    onActiveDateChange?.(nextActiveDate);
  }

  /** 单击未查看的日期只切换查看焦点；编辑模式下单击已查看的日期才触发安排/取消安排；滑动刚结束的这次单击会被跳过。 */
  function handleSelectDate(dateKey: string) {
    if (justDraggedRef.current) {
      justDraggedRef.current = false;
      return;
    }

    const wasViewingClickedDate = activeDate === dateKey;

    onActiveDateChange?.(dateKey);

    if (mode === "edit" && wasViewingClickedDate) {
      onToggleDate?.(dateKey, selectableDateKeys);
    }
  }

  return (
    <div className="calendar-panel" aria-label="日期面板日历">
      <div className="calendar-panel__toolbar flex items-center justify-between gap-[10px]">
        <button className="ghost-button py-[8px]" onClick={() => handleChangeMonth(-1)} type="button">
          上月
        </button>
        <strong>{monthTitle}</strong>
        <button className="ghost-button py-[8px]" onClick={() => handleChangeMonth(1)} type="button">
          下月
        </button>
      </div>

      <div className="calendar-panel__weekdays grid">
        {["日", "一", "二", "三", "四", "五", "六"].map((weekday) => (
          <span key={weekday}>{weekday}</span>
        ))}
      </div>

      <div className={`calendar-panel__grid grid ${mode === "edit" ? "edit-mode" : ""}`}>
        {calendarCells.map((dateKey, index) => {
          if (!dateKey) {
            return <span className="calendar-panel__day empty" key={`empty-${index}`} />;
          }

          /** 本次滑动扫过的日期由实时范围决定计划状态，其它日期保持外部传入状态。 */
          const isPlannedDate = dragTouchedDateSet.has(dateKey)
            ? dragLiveRangeDateSet.has(dateKey)
            : plannedDateSet.has(dateKey);
          const isPastDate = dateKey < todayKey;
          const dayNumber = Number(dateKey.slice(-2));
          const arrangedDataEntry = arrangedDataMap.get(dateKey);
          const testedDataEntry = testedDataMap.get(dateKey);

          return (
            <button
              className={`calendar-panel__day ${activeDate === dateKey ? "active" : ""} ${dateKey === todayKey ? "today" : ""} ${isPastDate ? "past" : ""} ${isPlannedDate ? "planned" : ""}`}
              data-date-key={dateKey}
              key={dateKey}
              onClick={() => handleSelectDate(dateKey)}
              onPointerDown={() => handleDragStart(dateKey)}
              type="button"
            >
              {schedulePeriods.map((period, periodIndex) => {
                const hasPeriod = Boolean(
                  testedDataEntry?.has(period) || arrangedDataEntry?.has(period)
                );
                const PeriodIcon = getSchedulePeriodIcon(period, periodIndex);

                return (
                  <span
                    className={`calendar-panel__period calendar-panel__period--${periodIndex % 3} ${hasPeriod ? "has-data" : ""}`}
                    key={period}
                    style={{
                      height: `${100 / schedulePeriods.length}%`,
                      top: `${(periodIndex / schedulePeriods.length) * 100}%`
                    }}
                  >
                    {hasPeriod ? (
                      <PeriodIcon aria-hidden="true" className="calendar-panel__period-icon" size={9} />
                    ) : null}
                  </span>
                );
              })}
              <strong className="calendar-panel__day-number">
                {dayNumber}
                {testedDataEntry ? <span className="calendar-panel__day-badge">试</span> : null}
              </strong>
            </button>
          );
        })}
      </div>
    </div>
  );
}
