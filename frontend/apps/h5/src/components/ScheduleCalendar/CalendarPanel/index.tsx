import "./index.less";
import { getTutorCalendarCells, getTutorDateKey, getTutorMonthKey } from "@tools/tutorCalendar";

/** 日历交互模式：查看模式只切换查看焦点；编辑模式下单击已查看的日期切换选中/取消选中，并支持按住滑动批量选中。 */
export type CalendarPanelMode = "edit" | "view";

/** 日期面板日历组件属性；只负责月份网格和查看/选中/范围起点交互，不承载具体业务时段展示。 */
export interface CalendarPanelProps {
  activeDate?: string;
  maxSelectedDates?: number | null;
  /** 日历交互模式：查看模式只切换查看焦点，不做选中交互；编辑模式下单击已查看的日期才切换选中/取消选中，也支持按住滑动批量选中。 */
  mode: CalendarPanelMode;
  onActiveDateChange?: (dateKey: string) => void;
  /**
   * 编辑模式下触发：单击"已查看"的日期时触发一次；按住滑动结束时，对本次滑动扫过的每个日期各触发一次
   * （落在最终范围内但还没选中的会被选中，滑动扫过但最终落在范围外、且原本已选中的会被取消选中）。
   * 查看模式和单击未查看的日期都不会触发。具体选中/取消选中对应什么业务动作由调用方决定；
   * 因为滑动结束时可能连续触发多次，调用方需要用函数式 setState 更新选中列表，不能依赖闭包里的旧值。
   */
  onToggleDate?: (dateKey: string, selectableDateKeys: string[]) => void;
  /** 待确认的范围起点日期（调用方自行维护对应流程），用于展示背景变色动画。 */
  rangeStartDate?: string | null;
  selectableDates?: string[];
  selectedDates: string[];
}

/** 拖拽滑动过程中的即时状态，只用 ref 保存，避免 window 事件监听器闭包读到过期值。 */
interface CalendarPanelDragState {
  /** 当前指针经过的日期。 */
  currentDate: string | null;
  /** 按住开始滑动的起点日期，非空代表正在滑动选择中。 */
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

/** 纯日期面板日历：只展示月份网格和查看/选中/范围起点三态交互，不承载时段等具体业务展示，供需要更轻量日历的场景复用。 */
export function CalendarPanel({
  activeDate,
  maxSelectedDates = null,
  mode,
  onActiveDateChange,
  onToggleDate,
  rangeStartDate = null,
  selectableDates,
  selectedDates
}: CalendarPanelProps) {
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
  const latestRef = useRef({ onToggleDate, selectableDateKeys, selectedDateSet });

  useEffect(() => {
    latestRef.current = { onToggleDate, selectableDateKeys, selectedDateSet };
  }, [onToggleDate, selectableDateKeys, selectedDateSet]);

  /** 本次滑动全程经过的日期范围（起点和途经的每个日期的并集），这些日期的显示状态完全交给本次滑动控制。 */
  const dragTouchedDateSet = useMemo(() => {
    const { touchedMaxDate, touchedMinDate } = dragState;

    if (!touchedMinDate || !touchedMaxDate) {
      return new Set<string>();
    }

    return new Set(selectableDateKeys.filter((dateKey) => dateKey >= touchedMinDate && dateKey <= touchedMaxDate));
  }, [dragState, selectableDateKeys]);
  /** 当前指针位置对应的实时范围（起点到当前经过日期之间），扫过但不在这个范围内的日期实时显示为未选中。 */
  const dragLiveRangeDateSet = useMemo(() => {
    const { currentDate, startDate } = dragState;

    if (!startDate || !currentDate) {
      return new Set<string>();
    }

    const [rangeMinDateKey, rangeMaxDateKey] = [startDate, currentDate].sort();

    return new Set(selectableDateKeys.filter((dateKey) => dateKey >= rangeMinDateKey && dateKey <= rangeMaxDateKey));
  }, [dragState, selectableDateKeys]);

  /** 松开滑动手势：本次扫过的每个日期按最终范围重新判定，该选中的选中、该取消的取消（含拖过去又拖回来、原本已选中的日期）。 */
  function handleDragEnd() {
    const { currentDate, startDate, touchedMaxDate, touchedMinDate } = dragStateRef.current;

    if (!startDate) {
      return;
    }

    if (currentDate && currentDate !== startDate && touchedMinDate && touchedMaxDate) {
      justDraggedRef.current = true;

      const [rangeMinDateKey, rangeMaxDateKey] = [startDate, currentDate].sort();
      const { onToggleDate: latestOnToggleDate, selectableDateKeys: latestSelectableDateKeys, selectedDateSet: latestSelectedDateSet } =
        latestRef.current;

      latestSelectableDateKeys
        .filter((dateKey) => dateKey >= touchedMinDate && dateKey <= touchedMaxDate)
        .filter((dateKey) => {
          const shouldBeSelected = dateKey >= rangeMinDateKey && dateKey <= rangeMaxDateKey;

          return shouldBeSelected !== latestSelectedDateSet.has(dateKey);
        })
        .forEach((dateKey) => latestOnToggleDate?.(dateKey, latestSelectableDateKeys));
    }

    dragStateRef.current = initialDragState;
    setDragState(initialDragState);
  }

  /** 按住单元格开始滑动选择；只在编辑模式下生效，查看模式按住不会有任何效果。 */
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

  /** 单击未查看的日期只切换查看焦点；编辑模式下单击已查看的日期才触发选中/取消选中；滑动刚结束的这次单击会被跳过。 */
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

          /** 本次滑动扫过的日期由实时范围决定选中与否；没被这次滑动扫过的日期保持真实选中状态不受影响。 */
          const isSelected = dragTouchedDateSet.has(dateKey) ? dragLiveRangeDateSet.has(dateKey) : selectedDateSet.has(dateKey);
          const isOverMaxSelectedDates =
            maxSelectedDates !== null && maxSelectedDates !== undefined && selectedDates.length >= maxSelectedDates && !isSelected;
          const isOutsideSelectableDates = hasSelectableDateLimit && !selectableDateSet.has(dateKey);
          const isPastDate = dateKey < todayKey;
          const dayNumber = Number(dateKey.slice(-2));

          return (
            <button
              className={`calendar-panel__day ${activeDate === dateKey ? "active" : ""} ${dateKey === todayKey ? "today" : ""} ${isSelected ? "selected" : ""} ${dateKey === rangeStartDate ? "range-start" : ""} ${isOverMaxSelectedDates ? "limited" : ""} ${isPastDate ? "past" : ""}`}
              data-date-key={dateKey}
              disabled={isOutsideSelectableDates}
              key={dateKey}
              onClick={() => handleSelectDate(dateKey)}
              onPointerDown={() => handleDragStart(dateKey)}
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
