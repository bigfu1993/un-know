import { showMessage } from "@tools/messageToast";
import {
  getTutorTrialAvailabilitySummaryFromOrderDetail,
  getTutorTrialFeeSummaryFromOrderDetail,
  getTutorServiceScheduleSummaryFromOrderDetail,
  getTutorTrialScheduleSummaryFromOrderDetail,
  parseTutorTrialSchedule
} from "@tools/tutorTrial";
import { createTutorTaskModel } from "@tools/tutorTaskWorkflow";
import { getTutorOrderSchedulePreviewConfig } from "../model";

/** 根据时间段归类到试课日历三段展示。 */
function getTrialSchedulePreviewPeriod(timeRange: string): TrialScheduleCalendarPeriod {
  const startHour = Number(timeRange.split(":")[0]);

  if (startHour < 12) {
    return "morning";
  }

  return startHour < 18 ? "afternoon" : "evening";
}

/** 合并同一申请子任务下的多阶段日程，日历按阶段显示角标。 */
function getTrialSchedulePreviewItems(sections: TutorSchedulePreviewSection[]): TrialScheduleCalendarItem[] {
  const itemMap = new Map<
    string,
    {
      date: string;
      periodLabels: Partial<Record<TrialScheduleCalendarPeriod, string>>;
      periods: Set<TrialScheduleCalendarPeriod>;
    }
  >();

  sections.forEach((section) => {
    parseTutorTrialSchedule(section.summary)
      .filter((scheduleLine) => scheduleLine.date)
      .forEach((scheduleLine) => {
        const item = itemMap.get(scheduleLine.date) ?? {
          date: scheduleLine.date,
          periodLabels: {},
          periods: new Set<TrialScheduleCalendarPeriod>()
        };

        scheduleLine.times.forEach((timeRange) => {
          const period = getTrialSchedulePreviewPeriod(timeRange);

          item.periods.add(period);
          if (section.showScheduleLabel && section.label) {
            item.periodLabels[period] = section.label;
          }
        });
        itemMap.set(scheduleLine.date, item);
      });
  });

  return [...itemMap.values()]
    .map((item) => ({
      date: item.date,
      periodLabels: item.periodLabels,
      periods: [...item.periods]
    }))
    .sort((left, right) => left.date.localeCompare(right.date));
}

/** 获取当前日期在各阶段下的日程明细。 */
function getActiveScheduleSections(sections: TutorSchedulePreviewSection[], activeDate: string) {
  return sections
    .map((section) => ({
      ...section,
      lines: parseTutorTrialSchedule(section.summary).filter((scheduleLine) => scheduleLine.date === activeDate)
    }))
    .filter((section) => section.lines.length > 0);
}

/** 学生端查看家长提交的试课日程弹窗，卡片自身持有开关状态。 */
export function TrialSchedulePreview({
  onClose,
  onConfirmTrial,
  onTutorWorkflowAction,
  order,
  role
}: {
  onClose: () => void;
  onConfirmTrial?: (order: ClientOrder) => void;
  onTutorWorkflowAction?: (order: ClientOrder, action: TutorWorkflowAction, payload?: Partial<TutorWorkflowActionRequest>) => Promise<boolean> | boolean | void;
  order: ClientOrder;
  role: Role;
}) {
  const tutorTask = createTutorTaskModel({ order, role });
  const [isConflictScheduleOpen, setIsConflictScheduleOpen] = useState(false);
  const [isSubmittingConflictSchedule, setIsSubmittingConflictSchedule] = useState(false);
  const previewConfig = getTutorOrderSchedulePreviewConfig(order, tutorTask);
  const scheduleSections = previewConfig?.sections ?? [];
  const availabilitySummary = getTutorTrialAvailabilitySummaryFromOrderDetail(order.detail);
  const scheduleItems = getTrialSchedulePreviewItems(scheduleSections);
  const selectedDates = scheduleItems.map((item) => item.date);
  const initialConflictScheduleValue = useMemo(() => getTrialScheduleValueFromSummary(availabilitySummary), [availabilitySummary]);
  const [selectedDate, setSelectedDate] = useState(() => getDefaultTutorScheduleDate(selectedDates));
  const previewPeriods: Array<{ key: TrialScheduleCalendarPeriod; label: string }> = [
    { key: "morning", label: "上午" },
    { key: "afternoon", label: "下午" },
    { key: "evening", label: "晚上" }
  ];
  const activeScheduleSections = getActiveScheduleSections(scheduleSections, selectedDate);
  const canUpdateTrialAvailability = Boolean(previewConfig?.allowConflictAction && onTutorWorkflowAction);

  /** 学生日程冲突时重新提交可试课时间，并回到家长重新排期流程。 */
  async function handleConfirmConflictSchedule(value: TrialScheduleValue) {
    if (!onTutorWorkflowAction || isSubmittingConflictSchedule) {
      return;
    }

    setIsSubmittingConflictSchedule(true);
    try {
      const result = await onTutorWorkflowAction(order, "update_trial_availability", { availability: value.plan.summary });

      if (result !== false) {
        setIsConflictScheduleOpen(false);
        onClose();
      }
    } finally {
      setIsSubmittingConflictSchedule(false);
    }
  }

  return (
    <>
      <Modal
        ariaLabel={previewConfig?.title ?? "时间安排详情"}
        icon={<CalendarClock size={18} />}
        onClose={onClose}
        panelClassName="trial-schedule-preview-sheet mx-auto grid max-w-[540px] gap-[12px] px-[14px] pb-[calc(16px+env(safe-area-inset-bottom))] pt-[16px]"
        title={
          <>
            <strong>{previewConfig?.title ?? "时间安排"}</strong>
            <span>{previewConfig?.subtitle ?? order.title}</span>
          </>
        }
      >
        <em className={`ongoing-status-badge ${tutorTask.statusToneClassName}`}>{tutorTask.statusLabel}</em>
        {scheduleItems.length > 0 ? (
          <div className="trial-schedule-preview-content grid gap-[12px]">
            <TrialScheduleCalendar
              activeDate={selectedDate}
              initialDate={selectedDates[0]}
              maxSelectedDates={selectedDates.length}
              mode="view"
              onActiveDateChange={setSelectedDate}
              scheduleItems={scheduleItems}
              selectedDates={selectedDates}
            />
            <div className="trial-schedule-preview-list grid gap-[8px]">
              {activeScheduleSections.map((section) => (
                <article className="trial-schedule-preview-period selected" key={section.title}>
                  <strong>{section.title}</strong>
                  <span>
                    {previewPeriods
                      .map((period) => {
                        const times = section.lines.flatMap((line) =>
                          line.times.filter((timeRange) => getTrialSchedulePreviewPeriod(timeRange) === period.key)
                        );

                        return times.length > 0 ? `${period.label} ${times.join("、")}` : "";
                      })
                      .filter(Boolean)
                      .join(" · ") || "暂无安排"}
                  </span>
                </article>
              ))}
            </div>
          </div>
        ) : (
          <p className="notice p-[10px] text-[#61420d]">{previewConfig?.emptyLabel ?? "暂无可查看的时间安排"}。</p>
        )}
        {tutorTask.can("confirmTrialStart") || canUpdateTrialAvailability ? (
          <div className={`sheet-actions grid gap-[8px] ${tutorTask.can("confirmTrialStart") && canUpdateTrialAvailability ? "grid-cols-2" : ""}`}>
            {canUpdateTrialAvailability ? (
              <button
                className="ghost-button min-h-[38px] px-[10px] py-[8px]"
                onClick={() => setIsConflictScheduleOpen(true)}
                type="button"
              >
                日程冲突
              </button>
            ) : null}
            {tutorTask.can("confirmTrialStart") ? (
              <button
                className="primary-button inline-flex min-h-[38px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white"
                onClick={() => {
                  onConfirmTrial?.(order);
                  onClose();
                }}
                type="button"
              >
                <CheckCircle2 size={16} />
                同意试课安排
              </button>
            ) : null}
          </div>
        ) : null}
      </Modal>
      {isConflictScheduleOpen ? (
        <TutorTrialSchedule
          confirmLabel={isSubmittingConflictSchedule ? "提交中" : "重新提交"}
          initialValue={initialConflictScheduleValue}
          isConfirming={isSubmittingConflictSchedule}
          maxSelectedDates={null}
          onClose={() => setIsConflictScheduleOpen(false)}
          onConfirm={handleConfirmConflictSchedule}
          subtitle="请重新选择可试课日期和时间，提交后回到申请试课中等待家长重新安排。"
          title="日程冲突"
        />
      ) : null}
    </>
  );
}

/** 学生确认试课费用的弹窗，确认后流程进入家长雇佣决策。 */
export function TrialSettlementConfirm({
  onClose,
  onTutorWorkflowAction,
  order
}: {
  onClose: () => void;
  onTutorWorkflowAction?: (order: ClientOrder, action: TutorWorkflowAction, payload?: Partial<TutorWorkflowActionRequest>) => Promise<boolean> | boolean | void;
  order: ClientOrder;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  // order.detail 是后端拼的自由文本摘要，不是状态 KEY，前缀固定是中文"正式雇佣 · "/"试课申请 · "，
  // 跟已经 KEY 化的 order.status 是两回事，这里继续匹配中文字面量。
  const isServiceSettlement = order.detail.includes("正式雇佣");
  const feeSummary = getTutorTrialFeeSummaryFromOrderDetail(order.detail) || order.amountLabel || formatCurrency(order.amount);
  const scheduleSummary = isServiceSettlement
    ? getTutorServiceScheduleSummaryFromOrderDetail(order.detail)
    : getTutorTrialScheduleSummaryFromOrderDetail(order.detail);

  /** 学生确认家长提交的试课费用，后续由家长选择是否正式雇佣。 */
  async function handleConfirmSettlement() {
    if (!onTutorWorkflowAction || isSubmitting) {
      showMessage("结算接口暂不可用，请稍后重试。", { type: "warning" });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await onTutorWorkflowAction(order, "confirm_settlement");

      if (result !== false) {
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      ariaLabel="结算确认"
      icon={<CircleDollarSign size={18} />}
      onClose={onClose}
      panelClassName="trial-settlement-confirm-sheet mx-auto grid max-w-[540px] gap-[12px] px-[14px] pb-[calc(16px+env(safe-area-inset-bottom))] pt-[16px]"
      title={
        <>
          <strong>结算确认</strong>
          <span>{order.title}</span>
        </>
      }
    >
        <div className="trial-settlement-confirm-content grid gap-[8px]">
          <div className="trial-settlement-confirm-item flex items-center justify-between gap-[12px]">
            <span>{isServiceSettlement ? "结算金额" : "试课费用"}</span>
            <strong>{feeSummary}</strong>
          </div>
          <div className="trial-settlement-confirm-item grid gap-[5px]">
            <span>{isServiceSettlement ? "课程安排" : "试课安排"}</span>
            <p>{scheduleSummary || (isServiceSettlement ? "暂无课程安排" : "暂无试课安排")}</p>
          </div>
          <p className="notice p-[10px] text-[#61420d]">
            {isServiceSettlement ? "确认后正式服务结算完成，当前家教进入历史订单。" : "确认后开始试课费用结算，并等待家长确认是否正式雇佣。"}
          </p>
        </div>

        <div className="sheet-actions grid grid-cols-2 gap-[8px]">
          <button className="ghost-button min-h-[38px] px-[10px] py-[8px]" disabled={isSubmitting} onClick={onClose} type="button">
            取消
          </button>
          <button
            className="primary-button min-h-[38px] px-[10px] py-[8px] text-white disabled:text-[#748092]"
            disabled={isSubmitting}
            onClick={() => void handleConfirmSettlement()}
            type="button"
          >
            {isSubmitting ? "确认中" : "结算"}
          </button>
        </div>
    </Modal>
  );
}

/** 家长端结束正式雇佣前提交结算金额，提交后主任务进入已结束并等待学生确认结算。 */
export function ServiceSettlement({
  onClose,
  onConfirm,
  order
}: {
  onClose: () => void;
  onConfirm: (order: ClientOrder, trialFee: number) => Promise<boolean | void> | boolean | void;
  order: ClientOrder;
}) {
  const [serviceFee, setServiceFee] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const feeValue = serviceFee.trim() === "" ? Number.NaN : Number(serviceFee);
  const isServiceFeeValid = Number.isFinite(feeValue) && feeValue >= 0;
  const scheduleSummary = getTutorServiceScheduleSummaryFromOrderDetail(order.detail);

  /** 校验结算金额并提交正式服务结束动作。 */
  async function handleConfirm() {
    if (!isServiceFeeValid || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await onConfirm(order, Number(feeValue.toFixed(2)));

      if (result !== false) {
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      ariaLabel="正式服务结算"
      icon={<CircleDollarSign size={18} />}
      onClose={onClose}
      panelClassName="trial-settlement-confirm-sheet mx-auto grid max-w-[540px] gap-[12px] px-[14px] pb-[calc(16px+env(safe-area-inset-bottom))] pt-[16px]"
      title={
        <>
          <strong>正式服务结算</strong>
          <span>{order.title}</span>
        </>
      }
    >
        <div className="trial-settlement-confirm-content grid gap-[8px]">
          <label className="tutor-trial-settlement-field grid gap-[6px]">
            <span>结算金额</span>
            <input
              inputMode="decimal"
              min="0"
              onChange={(event) => setServiceFee(event.target.value)}
              placeholder="请输入金额"
              step="0.01"
              type="number"
              value={serviceFee}
            />
          </label>
          {!isServiceFeeValid && serviceFee.trim() !== "" ? <span className="tutor-trial-settlement-error">请输入不小于 0 的金额</span> : null}
          <div className="trial-settlement-confirm-item grid gap-[5px]">
            <span>课程安排</span>
            <p>{scheduleSummary || "暂无课程安排"}</p>
          </div>
          <p className="notice p-[10px] text-[#61420d]">提交后家教主任务结束，学生端确认结算金额后进入历史订单。</p>
        </div>

        <div className="sheet-actions grid grid-cols-2 gap-[8px]">
          <button className="ghost-button min-h-[38px] px-[10px] py-[8px]" disabled={isSubmitting} onClick={onClose} type="button">
            取消
          </button>
          <button
            className="primary-button min-h-[38px] px-[10px] py-[8px] text-white disabled:text-[#748092]"
            disabled={!isServiceFeeValid || isSubmitting}
            onClick={() => void handleConfirm()}
            type="button"
          >
            {isSubmitting ? "提交中" : "结算"}
          </button>
        </div>
    </Modal>
  );
}
