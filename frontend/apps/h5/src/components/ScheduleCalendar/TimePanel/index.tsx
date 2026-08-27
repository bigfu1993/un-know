import "./index.less";

/**
 * 单个时段的展示与交互状态。是否可以切换选中、时间是否只读、能不能清空这些具体业务判断
 * （比如是否超出学生可试课范围、是否已被其它安排占用）都由调用方算好再传进来，
 * TimePanel 本身不掺和这些具体判断规则，但顶部标题行的文案和四种状态分支是试课排期专属逻辑，
 * 直接内置在组件里（不再走插槽），因为这个组件目前只服务试课/正式课排期这一个场景。
 */
export interface TimePanelPeriodItem {
  key: string;
  label: string;
  enabled: boolean;
  start: string;
  end: string;
  /** 时段名称按钮是否禁止点击切换选中/取消选中。 */
  isToggleDisabled: boolean;
  /** 起止时间输入框是否禁止编辑。 */
  isTimeInputDisabled: boolean;
  /** "清空"按钮是否禁止点击。 */
  isClearDisabled: boolean;
  /**
   * 该时段是否处于"不可选"业务态（如超出可选范围、已被其它安排占用），只影响这一行的视觉样式；
   * 不直接等同于 isToggleDisabled——已选中的时段即使命中这个业务态，toggle 按钮依然可点击取消选中，
   * 缺省不特殊标注。
   */
  isUnavailable?: boolean;
}

/** 时段选择面板组件属性：顶部标题行按试课排期的四种状态分支渲染，下方按行渲染时段名称、
 *  起止时间输入和清空按钮。 */
export interface TimePanelProps {
  /** 当前查看日期是否已经安排了试课时段。 */
  activeDateHasSchedule: boolean;
  /** 顶部标题，通常是当前查看的日期文案。 */
  activeDateLabel: ReactNode;
  periods: TimePanelPeriodItem[];
  /** 点击时段名称，切换该时段选中/取消选中。 */
  onTogglePeriod: (periodKey: string) => void;
  /** 修改某个时段的开始或结束时间。 */
  onChangePeriodTime: (periodKey: string, field: "start" | "end", value: string) => void;
  /** 清空某个时段的起止时间并取消选中。 */
  onClearPeriod: (periodKey: string) => void;
  /** 当前查看日期是否超出学生可试课范围。 */
  isOutsideSelectableDates: boolean;
  /** 已安排天数是否达到上限（且当前查看日期本身尚未被安排）。 */
  isScheduleLimitReached: boolean;
  /** 已选择天数上限，用于"最多安排 N 天"提示文案；不传或为 null 时不影响判断分支（由调用方保证一致）。 */
  maxSelectedDates?: number | null;
  /** 当前查看日期是否已经没有可选时段（如可试课时段已被其它安排占满）。 */
  hasNoSelectablePeriods: boolean;
  /** 移除当前查看日期的全部试课安排。 */
  onClearDaySchedule: () => void;
  /** 全选当前查看日期允许的时段。 */
  onSelectFullDaySchedule: () => void;
}

/**
 * 试课/正式课排期的时段编辑面板：顶部一行标题 + 按当前状态展示"移除当日安排/日期范围提示/
 * 已试课时段不可选/全选"四选一的操作区，下方按行展示"上午/下午/晚上"时段的选中态和起止时间输入。
 * 具体哪些时段可选、是否只读、能否清空仍由调用方通过 periods 里每一项的禁用态决定，只有顶部标题行
 * 的四态判断和文案固定内置在这里——这个组件专属服务试课排期场景，不再是跨场景通用组件。
 */
export function TimePanel({
  activeDateHasSchedule,
  activeDateLabel,
  hasNoSelectablePeriods,
  isOutsideSelectableDates,
  isScheduleLimitReached,
  maxSelectedDates,
  onChangePeriodTime,
  onClearDaySchedule,
  onClearPeriod,
  onSelectFullDaySchedule,
  onTogglePeriod,
  periods
}: TimePanelProps) {
  return (
    <div className="time-panel grid gap-[10px]">
      <div className="time-panel__header flex items-center justify-between gap-[10px]">
        <strong>{activeDateLabel}</strong>
        {activeDateHasSchedule ? (
          <button className="text-button" onClick={onClearDaySchedule} title="点击重置当日安排" type="button">
            移除当日安排
          </button>
        ) : isOutsideSelectableDates || isScheduleLimitReached ? (
          <span className={isScheduleLimitReached ? "danger" : ""}>
            {isOutsideSelectableDates ? "请选择学生可试课日期" : isScheduleLimitReached ? `最多安排 ${maxSelectedDates} 天` : ""}
          </span>
        ) : hasNoSelectablePeriods ? (
          <span>已试课时段不可选</span>
        ) : (
          <button className="text-button" onClick={onSelectFullDaySchedule} type="button">
            全选
          </button>
        )}
      </div>
      <div className="time-panel__rows grid gap-[6px]" aria-label="时段选择">
        {periods.map((period) => (
          <div
            className={`time-panel__row ${period.enabled ? "selected" : ""} ${period.isUnavailable ? "unavailable" : ""}`}
            key={period.key}
          >
            <button
              className="time-panel__toggle"
              disabled={period.isToggleDisabled}
              onClick={() => onTogglePeriod(period.key)}
              type="button"
            >
              <strong>{period.label}</strong>
            </button>
            <div className="time-panel__time-fields">
              <input
                aria-label={`${period.label}开始时间`}
                disabled={period.isTimeInputDisabled}
                onChange={(event) => onChangePeriodTime(period.key, "start", event.target.value)}
                type="time"
                value={period.start}
              />
              <span>至</span>
              <input
                aria-label={`${period.label}结束时间`}
                disabled={period.isTimeInputDisabled}
                onChange={(event) => onChangePeriodTime(period.key, "end", event.target.value)}
                type="time"
                value={period.end}
              />
              <button
                className="time-panel__clear-button"
                disabled={period.isClearDisabled}
                onClick={() => onClearPeriod(period.key)}
                type="button"
              >
                清空
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
