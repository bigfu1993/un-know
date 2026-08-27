import "./index.less";
import { getTutorCalendarCells, getTutorDateKey, getTutorMonthKey } from "@tools/tutorCalendar";

/** 日历交互模式：查看模式只切换查看焦点；编辑模式下单击已查看的日期切换安排/取消安排，并支持按住滑动批量选中。 */
export type CalendarPanelMode = "edit" | "view";

/**
 * 单个日期格子内的分段标记数据，具体分段 key 的业务含义（比如"上午/下午/晚上"）由调用方通过
 * {@link CalendarPanelProps.markerPeriods} 定义，CalendarPanel 本身不理解这些 key 的业务含义。
 */
export interface CalendarPanelMarker {
  date: string;
  /** 命中的分段 key 列表，决定这一天哪几段显示标记底色。 */
  periods: string[];
  /** 需要叠加文字说明的分段 key 列表。 */
  labelPeriods?: string[];
  /** 每个分段 key 对应的展示文案，优先级高于 labelPeriods 的兜底文案。 */
  periodLabels?: Record<string, string>;
}

/** 日期面板日历组件属性；只负责月份网格和查看/选择交互，具体业务时段展示通过可选的 markers 挂载。 */
export interface CalendarPanelProps {
  activeDate?: string;
  /** 当前选中的日期：整格底色标记，并驱动天数上限和拖拽批量选择。 */
  selectedDates: string[];
  /**
   * 每个日期格子要横向拆成的分段 key 顺序（如 ["morning","afternoon","evening"]），决定分几段、
   * 从上到下的排列顺序；不传则格子只显示日期数字，不渲染任何分段标记，跟不传 markers 时完全一样。
   */
  markerPeriods?: string[];
  /** 按日期维护的分段标记数据，需要配合 markerPeriods 使用才会渲染。 */
  markers?: CalendarPanelMarker[];
  /** markers 里某个分段命中 labelPeriods 但没有走 periodLabels 精确指定文案时使用的兜底文案。 */
  markerFallbackLabel?: string;
  /** 选中天数上限，达到上限后未选日期禁止继续新增；不传或传 null/undefined 代表不限制。 */
  maxSelectedDates?: number | null;
  /** 日历交互模式：查看模式只切换查看焦点；编辑模式下单击已查看日期切换选中状态，也支持按住滑动批量选中。 */
  mode: CalendarPanelMode;
  onActiveDateChange?: (dateKey: string) => void;
  /**
   * 编辑模式下触发：单击"已查看"的日期时触发一次；按住滑动结束时，对本次滑动扫过的每个日期各触发一次
   * （落在最终范围内但还没选中的会被选中，滑动扫过但最终落在范围外、且原本已选中的会被取消）。
   * 查看模式和单击未查看的日期都不会触发。具体选择结果对应什么业务动作由调用方决定；因为滑动结束
   * 时可能连续触发多次，调用方需要用函数式 setState 更新选中列表，不能依赖闭包里的旧值。
   */
  onToggleDate?: (dateKey: string, selectableDateKeys: string[]) => void;
  /**
   * 计划日期：只精确到"哪天"，为对应格子附加 planned 语义类，但不设置独立背景色，也不参与天数
   * 上限和拖拽选择计算；跟 selectedDates（本次弹窗当前选中日期）是两种不同粒度的数据。
   */
  plannedDates?: string[];
  selectableDates?: string[];
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

/** 纯日期面板日历：只展示月份网格和查看/选择两态交互，不承载时段等具体业务展示。 */
export function CalendarPanel({
  activeDate,
  markerFallbackLabel,
  markerPeriods,
  markers,
  maxSelectedDates = null,
  mode,
  onActiveDateChange,
  onToggleDate,
  plannedDates,
  selectableDates,
  selectedDates
}: CalendarPanelProps) {
  const today = useMemo(() => new Date(), []);
  const todayKey = getTutorDateKey(today);
  const initialActiveDate = activeDate ?? selectedDates[0] ?? plannedDates?.[0] ?? todayKey;
  const [viewMonth, setViewMonth] = useState(() => initialActiveDate.slice(0, 7) || getTutorMonthKey(today));
  const calendarCells = useMemo(() => getTutorCalendarCells(viewMonth), [viewMonth]);
  const monthTitle = `${viewMonth.split("-")[0]}年${Number(viewMonth.split("-")[1])}月`;
  /** 按日期索引的分段标记数据，未传 markers 时为空表，格子按原样只显示日期数字。 */
  const markerMap = useMemo(() => {
    return new Map(
      (markers ?? []).map((marker) => [
        marker.date,
        {
          labelPeriods: new Set(marker.labelPeriods ?? []),
          periodLabels: new Map(Object.entries(marker.periodLabels ?? {})),
          periods: new Set(marker.periods)
        }
      ])
    );
  }, [markers]);
  /** 计划日期索引只判断是否属于发布计划，不参与当前选择或天数上限计算。 */
  const plannedDateSet = useMemo(() => new Set(plannedDates ?? []), [plannedDates]);
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
  /** 当前指针位置对应的实时范围，扫过但不在最终范围内的日期实时显示为未选中。 */
  const dragLiveRangeDateSet = useMemo(() => {
    const { currentDate, startDate } = dragState;

    if (!startDate || !currentDate) {
      return new Set<string>();
    }

    const [rangeMinDateKey, rangeMaxDateKey] = [startDate, currentDate].sort();

    return new Set(selectableDateKeys.filter((dateKey) => dateKey >= rangeMinDateKey && dateKey <= rangeMaxDateKey));
  }, [dragState, selectableDateKeys]);

  /** 松开滑动手势后按最终范围同步本次扫过日期的选中状态。 */
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

          /** 本次滑动扫过的日期由实时范围决定选中状态，其它日期保持外部传入状态。 */
          const isSelected = dragTouchedDateSet.has(dateKey) ? dragLiveRangeDateSet.has(dateKey) : selectedDateSet.has(dateKey);
          const isOverMaxSelectedDates =
            maxSelectedDates !== null && maxSelectedDates !== undefined && selectedDates.length >= maxSelectedDates && !isSelected;
          const isOutsideSelectableDates = hasSelectableDateLimit && !selectableDateSet.has(dateKey);
          const isPastDate = dateKey < todayKey;
          const dayNumber = Number(dateKey.slice(-2));
          const markerEntry = markerMap.get(dateKey);
          const isPlannedDate = plannedDateSet.has(dateKey);

          return (
            <button
              className={`calendar-panel__day ${activeDate === dateKey ? "active" : ""} ${dateKey === todayKey ? "today" : ""} ${isSelected ? "selected" : ""} ${isOverMaxSelectedDates ? "limited" : ""} ${isPastDate ? "past" : ""} ${isPlannedDate ? "planned" : ""}`}
              data-date-key={dateKey}
              disabled={isOutsideSelectableDates}
              key={dateKey}
              onClick={() => handleSelectDate(dateKey)}
              onPointerDown={() => handleDragStart(dateKey)}
              type="button"
            >
              {markerPeriods?.map((period, periodIndex) => {
                const hasPeriod = markerEntry?.periods.has(period) ?? false;
                const label =
                  markerEntry?.periodLabels.get(period) ??
                  (markerEntry?.labelPeriods.has(period) ? markerFallbackLabel : undefined);

                return (
                  <span
                    className={`calendar-panel__period calendar-panel__period--${periodIndex % 3} ${hasPeriod ? "has-marker" : ""}`}
                    key={period}
                    style={{ height: `${100 / markerPeriods.length}%`, top: `${(periodIndex / markerPeriods.length) * 100}%` }}
                  >
                    {label ? <span className="calendar-panel__period-label">{label}</span> : null}
                  </span>
                );
              })}
              <strong>{dayNumber}</strong>
            </button>
          );
        })}
      </div>
    </div>
  );
}
