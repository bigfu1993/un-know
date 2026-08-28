import type { ScheduleTimeRange } from "@unknown/domain";
import "./index.less";
import { Moon, Sun, Sunrise } from "lucide-react";

/**
 * 单个时段的展示与交互状态。时间边界、是否只读、能不能清空这些具体业务判断
 * （比如日期是否可编辑、是否已被其它安排占用）都由调用方算好再传进来，
 * TimePanel 本身不掺和这些具体判断规则，但顶部标题行的操作和状态分支是试课排期专属逻辑，
 * 直接内置在组件里（不再走插槽），因为这个组件目前只服务试课/正式课排期这一个场景。
 */
export interface TimePanelPeriodItem {
  key: TrialSchedulePeriodKey;
  label: string;
  enabled: boolean;
  start: string;
  end: string;
  /** 该时段允许选择的最早时间。 */
  minTime: string;
  /** 该时段允许选择的最晚时间。 */
  maxTime: string;
  /** 起止时间滑块是否禁止编辑。 */
  isTimeInputDisabled: boolean;
  /** "重置"按钮是否禁止点击。 */
  isClearDisabled: boolean;
  /** 旧排期中无法进入双滑块的原始起止时间，只读展示到用户主动清空。 */
  legacyRange?: ScheduleTimeRange;
  /**
   * 该时段是否处于"不可选"业务态（如已被其它安排占用），只影响这一行的视觉样式。
   */
  isUnavailable?: boolean;
}

/** 时段选择面板组件属性：顶部标题行按试课排期状态渲染，下方按行渲染时段图标、
 *  起止时间滑块和重置按钮。 */
export interface TimePanelProps {
  /** 当前查看日期是否已经安排了试课时段。 */
  activeDateHasSchedule: boolean;
  /** 顶部标题，通常是当前查看的日期文案。 */
  activeDateLabel: ReactNode;
  /** 当前用户是否已经保存可应用的时间模板。 */
  hasScheduleTimeTemplate: boolean;
  /** 当前查看日期是否已经过去；过去日期只读，不允许改动历史安排。 */
  isActiveDatePast: boolean;
  /** 时间模板是否正在保存。 */
  isSavingScheduleTimeTemplate: boolean;
  /** 当前查看日期是否因新增日期达到上限而不可安排。 */
  isScheduleLimitReached: boolean;
  periods: TimePanelPeriodItem[];
  /** 清空当前查看日期的全部安排。 */
  onCancelAll: () => void;
  /** 原子修改某个时段的开始和结束时间。 */
  onChangePeriodRange: (periodKey: TrialSchedulePeriodKey, start: string, end: string) => void;
  /** 清空某个时段的起止时间并取消选中。 */
  onClearPeriod: (periodKey: TrialSchedulePeriodKey) => void;
  /** 将当前查看日期的安排保存为用户时间模板。 */
  onSaveScheduleTimeTemplate: () => void;
  /** 将用户时间模板整组应用到当前查看日期。 */
  onUseScheduleTimeTemplate: () => void;
}

/** 将 HH:mm 时间转换为当天分钟数。 */
function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

/** 将当天分钟数转换为 HH:mm 时间。 */
function minutesToTime(value: number) {
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

/** 双滑块当前由指针操作的端点。 */
type TimeRangeHandle = "start" | "end";

/** 上午、下午和晚上对应日期单元格使用的同款时段图标。 */
const timePeriodIcons = {
  afternoon: Sun,
  evening: Moon,
  morning: Sunrise
} satisfies Record<TrialSchedulePeriodKey, typeof Sunrise>;

/** 将轨道上的横向指针坐标换算并吸附到十分钟刻度。 */
function getPointerTimeMinutes(control: HTMLDivElement, clientX: number, minMinutes: number, maxMinutes: number) {
  const { left, width } = control.getBoundingClientRect();

  if (width <= 0) {
    return minMinutes;
  }

  const ratio = Math.min(Math.max((clientX - left) / width, 0), 1);
  const pointerMinutes = minMinutes + ratio * (maxMinutes - minMinutes);

  return Math.min(Math.max(Math.round(pointerMinutes / 10) * 10, minMinutes), maxMinutes);
}

/** 选择距离指针最近的端点；距离相同时按指针所在方向拆分重合端点。 */
function getClosestTimeRangeHandle(pointerMinutes: number, startMinutes: number, endMinutes: number): TimeRangeHandle {
  const startDistance = Math.abs(pointerMinutes - startMinutes);
  const endDistance = Math.abs(pointerMinutes - endMinutes);

  if (startDistance === endDistance) {
    return pointerMinutes <= startMinutes ? "start" : "end";
  }

  return startDistance < endDistance ? "start" : "end";
}

/** 聚焦并记录本次拖动实际控制的端点。 */
function activateTimeRangeHandle(control: HTMLDivElement, handle: TimeRangeHandle) {
  control.dataset.activeHandle = handle;
  control.querySelector<HTMLInputElement>(`.time-panel__range-input--${handle}`)?.focus({ preventScroll: true });
}

/** 结束一次轨道拖动并释放对应 pointer capture。 */
function finishTimeRangePointer(control: HTMLDivElement, pointerId: number) {
  if (control.dataset.activePointerId !== String(pointerId)) {
    return;
  }
  if (control.hasPointerCapture(pointerId)) {
    control.releasePointerCapture(pointerId);
  }
  delete control.dataset.activeHandle;
  delete control.dataset.activePointerId;
  delete control.dataset.pointerOriginClientX;
}

/**
 * 试课/正式课排期的时段编辑面板：顶部展示当前日期、整日清空和模板操作，下方按行展示
 * 上午、下午和晚上时段的图标、选中态和双滑块时间范围。
 * 具体哪些时段可选、是否只读、能否清空仍由调用方通过 periods 里每一项的禁用态决定，只有顶部标题行
 * 的状态判断和文案固定内置在这里——这个组件专属服务试课排期场景，不再是跨场景通用组件。
 */
export function TimePanel({
  activeDateHasSchedule,
  activeDateLabel,
  hasScheduleTimeTemplate,
  isActiveDatePast,
  isSavingScheduleTimeTemplate,
  isScheduleLimitReached,
  onCancelAll,
  onChangePeriodRange,
  onClearPeriod,
  onSaveScheduleTimeTemplate,
  onUseScheduleTimeTemplate,
  periods
}: TimePanelProps) {
  return (
    <div className="time-panel grid gap-[10px]">
      <div className="time-panel__header flex items-center justify-between gap-[10px]">
        <strong className="time-panel__date">{activeDateLabel}</strong>
        <div className="time-panel__actions">
          <button
            className="text-button"
            disabled={isActiveDatePast || !activeDateHasSchedule}
            onClick={onCancelAll}
            type="button"
          >
            取消全选
          </button>
          <button
            className="text-button"
            disabled={isActiveDatePast || !activeDateHasSchedule || isSavingScheduleTimeTemplate}
            onClick={onSaveScheduleTimeTemplate}
            type="button"
          >
            记为模板
          </button>
          <button
            className="text-button"
            disabled={
              isActiveDatePast || !hasScheduleTimeTemplate || isSavingScheduleTimeTemplate || isScheduleLimitReached
            }
            onClick={onUseScheduleTimeTemplate}
            type="button"
          >
            使用模板
          </button>
        </div>
      </div>
      <div className="time-panel__rows grid gap-[6px]" aria-label="时段选择">
        {periods.map((period) => {
          const PeriodIcon = timePeriodIcons[period.key];
          const minMinutes = timeToMinutes(period.minTime);
          const maxMinutes = timeToMinutes(period.maxTime);
          const startMinutes = period.start ? timeToMinutes(period.start) : minMinutes;
          const endMinutes = period.end ? timeToMinutes(period.end) : minMinutes;
          const rangeMinutes = maxMinutes - minMinutes;
          const startPercent = ((startMinutes - minMinutes) / rangeMinutes) * 100;
          const endPercent = ((endMinutes - minMinutes) / rangeMinutes) * 100;
          const updateRangeFromPointer = (control: HTMLDivElement, clientX: number, handle: TimeRangeHandle) => {
            const pointerMinutes = getPointerTimeMinutes(control, clientX, minMinutes, maxMinutes);

            if (handle === "start") {
              const nextStartMinutes = Math.min(pointerMinutes, endMinutes);

              if (nextStartMinutes !== startMinutes) {
                onChangePeriodRange(period.key, minutesToTime(nextStartMinutes), minutesToTime(endMinutes));
              }
              return;
            }

            const nextEndMinutes = Math.max(pointerMinutes, startMinutes);

            if (nextEndMinutes !== endMinutes) {
              onChangePeriodRange(period.key, minutesToTime(startMinutes), minutesToTime(nextEndMinutes));
            }
          };

          return (
            <div
              className={`time-panel__row ${period.enabled ? "selected" : ""} ${period.isUnavailable ? "unavailable" : ""} ${period.legacyRange ? "legacy" : ""}`}
              key={period.key}
            >
              <span className="time-panel__period-label" aria-label={period.label} role="img">
                <PeriodIcon aria-hidden="true" className="time-panel__period-icon" size={14} />
              </span>
              {period.legacyRange ? (
                <div className="time-panel__legacy-control">
                  <span className="time-panel__legacy-notice" role="status">
                    历史异常时段
                  </span>
                  <span className="time-panel__legacy-time-output" aria-label={`${period.label}历史异常时段`}>
                    <span>{period.legacyRange.start}</span>
                    <span className="time-panel__time-separator">至</span>
                    <span>{period.legacyRange.end}</span>
                  </span>
                </div>
              ) : (
                <div
                  className="time-panel__range-control"
                  onLostPointerCapture={(event) => {
                    if (event.currentTarget.dataset.activePointerId === String(event.pointerId)) {
                      delete event.currentTarget.dataset.activeHandle;
                      delete event.currentTarget.dataset.activePointerId;
                      delete event.currentTarget.dataset.pointerOriginClientX;
                    }
                  }}
                  onPointerCancel={(event) => finishTimeRangePointer(event.currentTarget, event.pointerId)}
                  onPointerDown={(event) => {
                    if (period.isTimeInputDisabled) {
                      return;
                    }

                    event.preventDefault();
                    const pointerMinutes = getPointerTimeMinutes(
                      event.currentTarget,
                      event.clientX,
                      minMinutes,
                      maxMinutes
                    );
                    const isPointerOnOverlappingHandles =
                      startMinutes === endMinutes && pointerMinutes === startMinutes;
                    const handle = isPointerOnOverlappingHandles
                      ? startMinutes === minMinutes
                        ? "end"
                        : endMinutes === maxMinutes
                          ? "start"
                          : undefined
                      : getClosestTimeRangeHandle(pointerMinutes, startMinutes, endMinutes);

                    event.currentTarget.dataset.activePointerId = String(event.pointerId);
                    event.currentTarget.dataset.pointerOriginClientX = String(event.clientX);
                    event.currentTarget.setPointerCapture(event.pointerId);

                    if (handle) {
                      activateTimeRangeHandle(event.currentTarget, handle);
                      updateRangeFromPointer(event.currentTarget, event.clientX, handle);
                    }
                  }}
                  onPointerMove={(event) => {
                    const { activePointerId, pointerOriginClientX } = event.currentTarget.dataset;

                    if (activePointerId !== String(event.pointerId)) {
                      return;
                    }

                    event.preventDefault();
                    let handle = event.currentTarget.dataset.activeHandle as TimeRangeHandle | undefined;

                    if (!handle) {
                      const originClientX = Number(pointerOriginClientX);

                      if (event.clientX === originClientX) {
                        return;
                      }

                      handle = event.clientX < originClientX ? "start" : "end";
                      activateTimeRangeHandle(event.currentTarget, handle);
                    }

                    updateRangeFromPointer(event.currentTarget, event.clientX, handle);
                  }}
                  onPointerUp={(event) => finishTimeRangePointer(event.currentTarget, event.pointerId)}
                  style={
                    {
                      "--time-range-end": `${endPercent}%`,
                      "--time-range-start": `${startPercent}%`
                    } as CSSProperties
                  }
                >
                  <div className="time-panel__range-track" aria-hidden="true" />
                  <div className="time-panel__range-inputs">
                    <input
                      type="range"
                      min={minMinutes}
                      max={maxMinutes}
                      step={10}
                      aria-label={`${period.label}开始时间`}
                      className="time-panel__range-input time-panel__range-input--start"
                      disabled={period.isTimeInputDisabled}
                      onChange={(event) =>
                        onChangePeriodRange(
                          period.key,
                          minutesToTime(Math.min(Number(event.target.value), endMinutes)),
                          minutesToTime(endMinutes)
                        )
                      }
                      value={startMinutes}
                    />
                    <input
                      type="range"
                      min={minMinutes}
                      max={maxMinutes}
                      step={10}
                      aria-label={`${period.label}结束时间`}
                      className="time-panel__range-input time-panel__range-input--end"
                      disabled={period.isTimeInputDisabled}
                      onChange={(event) =>
                        onChangePeriodRange(
                          period.key,
                          minutesToTime(startMinutes),
                          minutesToTime(Math.max(Number(event.target.value), startMinutes))
                        )
                      }
                      value={endMinutes}
                    />
                  </div>
                  <div className="time-panel__range-meta">
                    <span className="time-panel__range-endpoint time-panel__range-endpoint--start">
                      {period.minTime}
                    </span>
                    {period.enabled ? (
                      <output className="time-panel__time-output" aria-live="polite">
                        <span>{minutesToTime(startMinutes)}</span>
                        <span className="time-panel__time-separator">-</span>
                        <span>{minutesToTime(endMinutes)}</span>
                      </output>
                    ) : null}
                    <span className="time-panel__range-endpoint time-panel__range-endpoint--end">
                      {period.maxTime}
                    </span>
                  </div>
                </div>
              )}
              <button
                className="time-panel__reset-button"
                disabled={period.isClearDisabled}
                onClick={() => onClearPeriod(period.key)}
                type="button"
              >
                重置
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
