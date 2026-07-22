import "./index.less";
import { CalendarClock, XCircle } from "lucide-react";
import { TrialScheduleCalendar } from "@components/TrialScheduleCalendar";
import { getTutorDateKey } from "@tools/tutorCalendar";
import {
  createDefaultDaySchedule,
  formatTrialScheduleDate,
  getEnabledPeriodSummaries,
  getTrialScheduleCalendarItems,
  getTrialSchedulePlan,
  trialSchedulePeriods,
  type TrialScheduleDraft,
  type TrialSchedulePeriodConfig,
  type TrialSchedulePeriodKey,
  type TrialSchedulePeriodState,
  type TrialScheduleValue
} from "./model";

/** 试课排期弹窗属性。 */
interface TutorTrialScheduleDialogProps {
  confirmLabel?: string;
  initialValue: TrialScheduleValue | null;
  isConfirming?: boolean;
  onClose: () => void;
  onConfirm: (value: TrialScheduleValue) => void;
  subtitle?: string;
  title?: string;
}

/** 试课安排弹窗，复用课程日历的月份网格生成逻辑。 */
export function TutorTrialScheduleDialog({
  confirmLabel = "确认",
  initialValue,
  isConfirming = false,
  onClose,
  onConfirm,
  subtitle = "最多选择 3 天，设置每天可试课时间。",
  title = "试课安排"
}: TutorTrialScheduleDialogProps) {
  const today = useMemo(() => new Date(), []);
  const todayKey = getTutorDateKey(today);
  const initialSelectedDate = initialValue?.selectedDates[0] ?? todayKey;
  const [selectedDate, setSelectedDate] = useState(initialSelectedDate);
  const [selectedDates, setSelectedDates] = useState<string[]>(() => initialValue?.selectedDates ?? []);
  const [scheduleDraft, setScheduleDraft] = useState<TrialScheduleDraft>(() => initialValue?.scheduleDraft ?? {});
  const selectedDaySchedule = scheduleDraft[selectedDate] ?? createDefaultDaySchedule();
  const selectedDateHasSchedule = getEnabledPeriodSummaries(selectedDaySchedule).length > 0;
  const isScheduleLimitReached = selectedDates.length >= 3 && !selectedDates.includes(selectedDate);
  const schedulePlan = getTrialSchedulePlan(selectedDates, scheduleDraft);
  const scheduleItems = getTrialScheduleCalendarItems(selectedDates, scheduleDraft);

  /** 同步单日排期，并按三天上限维护可提交日期。 */
  function syncDaySchedule(nextDaySchedule: Record<TrialSchedulePeriodKey, TrialSchedulePeriodState>) {
    const nextDateHasSchedule = getEnabledPeriodSummaries(nextDaySchedule).length > 0;
    const isNewScheduleDate = !selectedDates.includes(selectedDate);

    if (nextDateHasSchedule && isNewScheduleDate && selectedDates.length >= 3) {
      return;
    }

    setScheduleDraft((currentDraft) => {
      if (!nextDateHasSchedule) {
        const nextDraft = { ...currentDraft };
        delete nextDraft[selectedDate];

        return nextDraft;
      }

      return { ...currentDraft, [selectedDate]: nextDaySchedule };
    });
    setSelectedDates((currentDates) => {
      if (nextDateHasSchedule) {
        return [...new Set([...currentDates, selectedDate])].sort();
      }

      return currentDates.filter((dateKey) => dateKey !== selectedDate);
    });
  }

  /** 点击时段名称时切换该时段安排，未选中则填入快捷默认时间，已选中则取消安排。 */
  function handleTogglePeriodPreset(period: TrialSchedulePeriodConfig) {
    if (isScheduleLimitReached) {
      return;
    }

    const currentDaySchedule = scheduleDraft[selectedDate] ?? createDefaultDaySchedule();
    const currentPeriodState = currentDaySchedule[period.key];

    if (currentPeriodState.enabled) {
      handleClearPeriod(period.key);
      return;
    }

    syncDaySchedule({
      ...currentDaySchedule,
      [period.key]: {
        enabled: true,
        end: period.defaultEnd,
        start: period.defaultStart
      }
    });
  }

  /** 移除当前日期下所有试课时段安排。 */
  function handleClearDaySchedule() {
    setScheduleDraft((currentDraft) => {
      const nextDraft = { ...currentDraft };
      delete nextDraft[selectedDate];

      return nextDraft;
    });
    setSelectedDates((currentDates) => currentDates.filter((dateKey) => dateKey !== selectedDate));
  }

  /** 自定义某个时段的开始或结束时间，两个时间均存在时自动计入安排。 */
  function handleChangePeriodTime(periodKey: TrialSchedulePeriodKey, field: "end" | "start", value: string) {
    if (isScheduleLimitReached) {
      return;
    }

    const currentDaySchedule = scheduleDraft[selectedDate] ?? createDefaultDaySchedule();
    const nextPeriodState = {
      ...currentDaySchedule[periodKey],
      [field]: value
    };

    syncDaySchedule({
      ...currentDaySchedule,
      [periodKey]: {
        ...nextPeriodState,
        enabled: Boolean(nextPeriodState.start && nextPeriodState.end)
      }
    });
  }

  /** 清空某个时段的自定义时间并取消该时段安排。 */
  function handleClearPeriod(periodKey: TrialSchedulePeriodKey) {
    const currentDaySchedule = scheduleDraft[selectedDate] ?? createDefaultDaySchedule();

    syncDaySchedule({
      ...currentDaySchedule,
      [periodKey]: {
        enabled: false,
        end: "",
        start: ""
      }
    });
  }

  /** 确认试课安排并返回上层业务弹窗。 */
  function handleConfirmSchedule() {
    if (!schedulePlan) {
      return;
    }

    onConfirm({
      plan: schedulePlan,
      scheduleDraft,
      selectedDates: [...selectedDates].sort()
    });
  }

  return (
    <section className="checkout-sheet" aria-label={title}>
      <div className="sheet-backdrop" onClick={onClose} />
      <article className="sheet-panel trial-schedule-sheet mx-auto grid max-h-[min(82vh,700px)] max-w-[540px] gap-[12px] overflow-hidden px-[14px] pb-[calc(14px+env(safe-area-inset-bottom))] pt-[14px]">
        <div className="card-title flex items-center justify-between gap-[10px]">
          <CalendarClock size={18} />
          <div>
            <strong>{title}</strong>
            <span>{subtitle}</span>
          </div>
          <button aria-label="关闭" className="icon-only grid h-[34px] w-[34px] place-items-center text-[#475466]" onClick={onClose} type="button">
            <XCircle size={20} />
          </button>
        </div>

        <div className="trial-schedule-body grid gap-[12px] overflow-auto pr-[2px]">
          <TrialScheduleCalendar
            activeDate={selectedDate}
            initialDate={initialSelectedDate}
            maxSelectedDates={3}
            onActiveDateChange={setSelectedDate}
            scheduleItems={scheduleItems}
            selectedDates={selectedDates}
          />

          <div className="trial-schedule-editor grid gap-[10px]">
            <div className="trial-schedule-editor-header flex items-center justify-between gap-[10px]">
              <strong>{formatTrialScheduleDate(selectedDate)}</strong>
              {selectedDateHasSchedule ? (
                <button className="text-button" onClick={handleClearDaySchedule} title="点击重置当日安排" type="button">
                  移除当日安排
                </button>
              ) : (
                <span>{isScheduleLimitReached ? "最多安排 3 天" : "可快捷选择或自定义时间"}</span>
              )}
            </div>
            {trialSchedulePeriods.map((period) => {
              const periodState = selectedDaySchedule[period.key];
              const isPeriodSelected = periodState.enabled;

              return (
                <div className={`trial-schedule-row ${isPeriodSelected ? "selected" : ""}`} key={period.key}>
                  <button
                    className="trial-schedule-toggle"
                    disabled={isScheduleLimitReached && !isPeriodSelected}
                    onClick={() => handleTogglePeriodPreset(period)}
                    type="button"
                  >
                    <strong>{period.label}</strong>
                  </button>
                  <div className="trial-schedule-time-fields">
                    <input
                      aria-label={`${period.label}开始时间`}
                      disabled={isScheduleLimitReached || isPeriodSelected}
                      onChange={(event) => handleChangePeriodTime(period.key, "start", event.target.value)}
                      type="time"
                      value={periodState.start}
                    />
                    <span>至</span>
                    <input
                      aria-label={`${period.label}结束时间`}
                      disabled={isScheduleLimitReached || isPeriodSelected}
                      onChange={(event) => handleChangePeriodTime(period.key, "end", event.target.value)}
                      type="time"
                      value={periodState.end}
                    />
                    <button
                      className="trial-schedule-clear-button"
                      disabled={!periodState.start && !periodState.end}
                      onClick={() => handleClearPeriod(period.key)}
                      type="button"
                    >
                      清空
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="sheet-actions grid grid-cols-2 gap-[8px]">
          <button className="ghost-button min-h-[38px] px-[10px] py-[8px]" onClick={onClose} type="button">
            取消
          </button>
          <button
            className="primary-button min-h-[38px] px-[10px] py-[8px] text-white disabled:text-[#748092]"
            disabled={!schedulePlan || isConfirming}
            onClick={handleConfirmSchedule}
            type="button"
          >
            {confirmLabel}
          </button>
        </div>
      </article>
    </section>
  );
}
