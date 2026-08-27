import "./TrialScheduleEditor.less";
import { useTrialSchedule, type UseTrialScheduleOptions } from "./useTrialSchedule";
import type { TrialScheduleValue } from "./model";

/** 试课/正式课排期编辑区属性；不含 Modal 展示信息（标题/文案/图标），由调用方自己套一层 Modal。 */
export interface TrialScheduleEditorProps extends UseTrialScheduleOptions {
  confirmLabel?: string;
  isConfirming?: boolean;
  onClose: () => void;
  onConfirm: (value: TrialScheduleValue) => void;
}

/**
 * 试课/正式课排期编辑区：日历部分复用 ScheduleCalendar 的 CalendarPanel（分段标记能力），
 * 时段编辑部分复用 ScheduleCalendar 的 TimePanel，具体排期业务逻辑收在 useTrialSchedule 里，
 * 这个组件只负责组装展示和确认/取消按钮，不包含 Modal 外壳——调用方按各自场景（试课安排/
 * 正式雇佣日程）自行用 Modal 包裹，标题、副标题、图标都由调用方决定。
 */
export function TrialScheduleEditor({
  availableScheduleSummary,
  blockedScheduleLabel,
  blockedScheduleSummary,
  confirmLabel = "确认",
  demandPeriodDates,
  initialValue,
  isConfirming = false,
  maxPlannedDates,
  onClose,
  onConfirm,
  scheduleLabel
}: TrialScheduleEditorProps) {
  const schedule = useTrialSchedule({
    availableScheduleSummary,
    blockedScheduleLabel,
    blockedScheduleSummary,
    demandPeriodDates,
    initialValue,
    maxPlannedDates,
    scheduleLabel
  });

  return (
    <>
      <div className="trial-schedule-body grid gap-[12px] overflow-auto pr-[2px]">
        <CalendarPanel
          activeDate={schedule.selectedDate}
          markerFallbackLabel={schedule.markerFallbackLabel}
          markerPeriods={schedule.markerPeriods}
          markers={schedule.markers}
          maxPlannedDates={schedule.maxPlannedDates}
          mode={schedule.calendarMode}
          onActiveDateChange={schedule.setSelectedDate}
          onToggleDate={schedule.onToggleDate}
          plannedDates={schedule.plannedDates}
          selectableDates={schedule.selectableDates}
        />

        <div className="trial-schedule-editor grid gap-[10px]">
          <div className="trial-schedule-editor-header flex items-center justify-between gap-[10px]">
            <strong>{schedule.selectedDateLabel}</strong>
            {schedule.selectedDateHasSchedule ? (
              <button className="text-button" onClick={schedule.onClearDaySchedule} title="点击重置当日安排" type="button">
                移除当日安排
              </button>
            ) : schedule.isOutsideSelectableDates || schedule.isScheduleLimitReached ? (
              <span className={schedule.isScheduleLimitReached ? "danger" : ""}>
                {schedule.isOutsideSelectableDates
                  ? "请选择学生可试课日期"
                  : schedule.isScheduleLimitReached
                    ? `最多安排 ${schedule.maxPlannedDates} 天`
                    : ""}
              </span>
            ) : schedule.hasNoSelectablePeriods ? (
              <span>已试课时段不可选</span>
            ) : (
              <button className="text-button" onClick={schedule.onSelectFullDaySchedule} type="button">
                全选
              </button>
            )}
          </div>
          <TimePanel
            onChangePeriodTime={schedule.onChangePeriodTime}
            onClearPeriod={schedule.onClearPeriod}
            onTogglePeriod={schedule.onTogglePeriod}
            periods={schedule.timePanelPeriods}
          />
        </div>
      </div>

      <div className="sheet-actions grid grid-cols-2 gap-[8px]">
        <button className="ghost-button min-h-[38px] px-[10px] py-[8px]" onClick={onClose} type="button">
          取消
        </button>
        <button
          className="primary-button min-h-[38px] px-[10px] py-[8px] text-white disabled:text-[var(--h5-subtle)]"
          disabled={!schedule.value || isConfirming}
          onClick={() => {
            if (schedule.value) {
              onConfirm(schedule.value);
            }
          }}
          type="button"
        >
          {confirmLabel}
        </button>
      </div>
    </>
  );
}
