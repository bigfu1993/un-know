import "./index.less";
import { useTrialSchedule, type UseTrialScheduleOptions } from "./useTrialSchedule";
import type { TrialScheduleValue } from "./model";

/** 试课/正式课排期编辑区属性；不含 Modal 展示信息（标题/文案/图标），由调用方自己套一层 Modal。 */
export interface CalendarTimeProps extends UseTrialScheduleOptions {
  confirmLabel?: string;
  isConfirming?: boolean;
  onClose: () => void;
  onConfirm: (value: TrialScheduleValue) => void;
}

/**
 * 试课/正式课排期编辑区：是 ScheduleCalendar 模块内 CalendarPanel（分段标记能力）和
 * TimePanel（日期标题行 + 四态操作区 + 分时段时间输入）这两个部分的组合，具体排期业务逻辑
 * 收在同目录的 useTrialSchedule 里，这个组件只负责组装展示和确认/取消按钮，不包含 Modal
 * 外壳——调用方按各自场景（试课安排/正式雇佣日程）自行用 Modal 包裹，标题、副标题、图标都由
 * 调用方决定。
 */
export function CalendarTime({
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
}: CalendarTimeProps) {
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

        <TimePanel
          hasNoSelectablePeriods={schedule.hasNoSelectablePeriods}
          hasSchedule={schedule.selectedDateHasSchedule}
          isOutsideSelectableDates={schedule.isOutsideSelectableDates}
          isScheduleLimitReached={schedule.isScheduleLimitReached}
          maxPlannedDates={schedule.maxPlannedDates}
          onChangePeriodTime={schedule.onChangePeriodTime}
          onClearDaySchedule={schedule.onClearDaySchedule}
          onClearPeriod={schedule.onClearPeriod}
          onSelectFullDaySchedule={schedule.onSelectFullDaySchedule}
          onTogglePeriod={schedule.onTogglePeriod}
          periods={schedule.timePanelPeriods}
          selectedDateLabel={schedule.selectedDateLabel}
        />
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
