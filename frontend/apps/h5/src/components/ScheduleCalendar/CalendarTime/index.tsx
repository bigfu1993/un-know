import { useGlobalUser, useGlobalUserActions } from "@h5/globalProvider";
import { getErrorMessage, showMessage } from "@tools/messageToast";
import { updateClientScheduleTimeTemplate } from "@unknown/api-client";
import "./index.less";
import { useTrialSchedule, type UseTrialScheduleOptions } from "./useTrialSchedule";
import { createScheduleTimeTemplateFromDay, getTrialScheduleSubtitle, type TrialScheduleValue } from "./model";

/** 试课/正式课排期编辑区属性；不含 Modal 展示信息（标题/文案/图标），由调用方自己套一层 Modal。 */
export interface CalendarTimeProps extends UseTrialScheduleOptions {
  confirmLabel?: string;
  isConfirming?: boolean;
  onClose: () => void;
  onConfirm: (value: TrialScheduleValue) => void;
  /** 日历状态变化后通知外层更新试课弹窗副标题。 */
  onSubtitleChange?: (subtitle: string) => void;
}

/**
 * 试课/正式课排期编辑区：是 ScheduleCalendar 模块内 CalendarPanel（分段标记能力）和
 * TimePanel（日期标题行 + 状态操作区 + 分时段时间输入）这两个部分的组合，具体排期业务逻辑
 * 收在同目录的 useTrialSchedule 里，这个组件只负责组装展示和确认/取消按钮，不包含 Modal
 * 外壳——调用方按各自场景（试课安排/正式雇佣日程）自行用 Modal 包裹，标题、副标题、图标都由
 * 调用方决定。
 */
export function CalendarTime({
  blockedScheduleSummary,
  confirmLabel = "确认",
  initialValue,
  isConfirming = false,
  maxSelectedDates,
  onClose,
  onConfirm,
  onSubtitleChange,
  plannedDates,
  scheduleType
}: CalendarTimeProps) {
  const { scheduleTimeTemplate } = useGlobalUser();
  const { setScheduleTimeTemplate } = useGlobalUserActions();
  const [isSavingScheduleTimeTemplate, setIsSavingScheduleTimeTemplate] = useState(false);
  const schedule = useTrialSchedule({
    blockedScheduleSummary,
    initialValue,
    maxSelectedDates,
    plannedDates,
    scheduleType
  });
  const hasScheduleTimeTemplate = Object.values(scheduleTimeTemplate).some(Boolean);

  /** 将当前日期的有效安排保存为用户时间模板。 */
  async function handleSaveScheduleTimeTemplate() {
    if (Object.values(schedule.activeDaySchedule).some((periodState) => periodState.legacyRange)) {
      showMessage("请先清空并重新设置历史异常时段。", { type: "warning" });
      return;
    }

    setIsSavingScheduleTimeTemplate(true);

    try {
      const template = createScheduleTimeTemplateFromDay(schedule.activeDaySchedule);
      const savedTemplate = await updateClientScheduleTimeTemplate(template);
      setScheduleTimeTemplate(savedTemplate);
      showMessage("时间模板已更新。", { type: "success" });
    } catch (error) {
      showMessage(getErrorMessage(error, "时间模板更新失败，请稍后重试。"), { type: "error" });
    } finally {
      setIsSavingScheduleTimeTemplate(false);
    }
  }

  /** 将用户时间模板整组应用到当前日期。 */
  function handleUseScheduleTimeTemplate() {
    const result = schedule.applyScheduleTimeTemplate(scheduleTimeTemplate);

    if (!result.ok) {
      showMessage(result.reason ?? "时间模板无法应用到当前日期。", { type: "warning" });
      return;
    }

    showMessage("时间模板已应用到当前日期。", { type: "success" });
  }

  useEffect(() => {
    onSubtitleChange?.(
      getTrialScheduleSubtitle({
        activeDate: schedule.activeDate,
        isActiveDatePast: schedule.isActiveDatePast,
        isScheduleLimitReached: schedule.isScheduleLimitReached,
        plannedDates: schedule.plannedDates
      })
    );
  }, [
    onSubtitleChange,
    schedule.activeDate,
    schedule.isActiveDatePast,
    schedule.isScheduleLimitReached,
    schedule.plannedDates
  ]);

  return (
    <>
      <div className="trial-schedule-body grid gap-[12px] overflow-auto pr-[2px]">
        <CalendarPanel
          activeDate={schedule.activeDate}
          arrangedDatas={schedule.arrangedDatas}
          arrangedPeriods={schedule.arrangedPeriods}
          maxSelectedDates={schedule.maxSelectedDates}
          mode="view"
          onActiveDateChange={schedule.setActiveDate}
          plannedDates={schedule.plannedDates}
          selectedDates={schedule.selectedDates}
          testedDatas={schedule.testedDatas}
          testedPeriods={schedule.testedPeriods}
        />

        <TimePanel
          activeDateHasSchedule={schedule.activeDateHasSchedule}
          activeDateLabel={schedule.activeDateLabel}
          hasScheduleTimeTemplate={hasScheduleTimeTemplate}
          isActiveDatePast={schedule.isActiveDatePast}
          isSavingScheduleTimeTemplate={isSavingScheduleTimeTemplate}
          isScheduleLimitReached={schedule.isScheduleLimitReached}
          onCancelAll={schedule.onClearDaySchedule}
          onChangePeriodRange={schedule.onChangePeriodRange}
          onClearPeriod={schedule.onClearPeriod}
          onSaveScheduleTimeTemplate={handleSaveScheduleTimeTemplate}
          onUseScheduleTimeTemplate={handleUseScheduleTimeTemplate}
          periods={schedule.periods}
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
