import "./index.less";

/**
 * 单个时段的展示与交互状态。是否可以切换选中、时间是否只读、能不能清空这些具体业务判断
 * （比如是否超出学生可试课范围、是否已被其它安排占用）都由调用方算好再传进来，
 * TimePanel 本身不掺和这些业务规则。
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

/** 时段选择面板组件属性；只负责按行渲染时段名称、起止时间输入和清空按钮，不承载具体业务限制逻辑。 */
export interface TimePanelProps {
  periods: TimePanelPeriodItem[];
  /** 点击时段名称，切换该时段选中/取消选中。 */
  onTogglePeriod: (periodKey: string) => void;
  /** 修改某个时段的开始或结束时间。 */
  onChangePeriodTime: (periodKey: string, field: "start" | "end", value: string) => void;
  /** 清空某个时段的起止时间并取消选中。 */
  onClearPeriod: (periodKey: string) => void;
}

/**
 * 纯时段选择面板：按行展示"上午/下午/晚上"这类时段的选中态和起止时间输入，具体哪些时段可选、
 * 是否只读、能否清空均由调用方通过 periods 里每一项的禁用态决定，不内置任何时段业务规则，
 * 供需要分时段时间选择的场景复用（如试课排期、正式课排期）。
 */
export function TimePanel({ onChangePeriodTime, onClearPeriod, onTogglePeriod, periods }: TimePanelProps) {
  return (
    <div className="time-panel grid gap-[6px]" aria-label="时段选择">
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
  );
}
