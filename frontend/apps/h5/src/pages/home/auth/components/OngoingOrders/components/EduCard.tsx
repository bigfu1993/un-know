import { useCancelTutorApplication } from "@unknown/hooks";
import { getErrorMessage, showMessage } from "@tools/messageToast";
import {
  getTutorTrialAvailabilitySummaryFromOrderDetail,
  getTutorTrialFeeSummaryFromOrderDetail,
  getTutorServiceScheduleSummaryFromOrderDetail,
  getTutorTrialScheduleSummaryFromOrderDetail,
  parseTutorTrialSchedule
} from "@tools/tutorTrial";
import { createTutorTaskModel } from "@tools/tutorTaskWorkflow";
import { OrderActions, OrderStatus } from "./OrderActions";
import {
  getTutorOrderSchedulePreviewConfig,
  getTutorWorkflowTargetOrder,
  showOngoingOrderMessagePlaceholder
} from "../model";

/** 进行中家教卡片组件入参，家长端/学生端共用，role 显式区分当前卡片的查看角色。 */
export interface EduCardProps extends OngoingOrderActionHandlers {
  onOpenCancelConfirmation: (config: ConfirmActionConfig) => void;
  order: ClientOrder;
  role: Role;
}

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
function TrialSchedulePreview({
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
  const [selectedDate, setSelectedDate] = useState(selectedDates[0] ?? "");
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
function TrialSettlementConfirm({
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
function ServiceSettlement({
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

/**
 * OngoingOrders 列表里的家教卡片：标题、多状态徽标、正文详情、金额联系方式和履约动作。
 * 家长端/学生端共用同一份 UI，role 由调用方显式传入区分角色；试课日程、正式雇佣日程、
 * 结算确认等家教专属弹窗和取消申请动作完全由卡片自己承接状态，不再向上层列表借状态。
 */
export function EduCard({ onOpenCancelConfirmation, order, role, ...handlers }: EduCardProps) {
  const cancelTutorApplicationMutation = useCancelTutorApplication();
  const [isServiceScheduleOpen, setIsServiceScheduleOpen] = useState(false);
  const [isServiceSettlementOpen, setIsServiceSettlementOpen] = useState(false);
  const [isTrialResultOpen, setIsTrialResultOpen] = useState(false);
  const [isTrialScheduleOpen, setIsTrialScheduleOpen] = useState(false);
  const [isSubmittingServiceAvailability, setIsSubmittingServiceAvailability] = useState(false);
  const [isSubmittingServiceSchedule, setIsSubmittingServiceSchedule] = useState(false);
  const [serviceAvailabilityAction, setServiceAvailabilityAction] = useState<TutorServiceAvailabilityAction | null>(null);
  const tutorTask = createTutorTaskModel({ order, role });
  /** 计划周期实际天数，用真实选中的日期集合计算，不用开始至结束摘要反推（可能是不连续的零散日期）。 */
  const periodDaysLabel = order.periodDates && order.periodDates.length > 0 ? `${order.periodDates.length} 天` : "待定";
  /** 家长端主任务动作需要落到当前正式雇佣的申请子任务，正式雇佣日程和结算都基于这个目标订单提交。 */
  const tutorWorkflowTargetOrder = getTutorWorkflowTargetOrder(order);
  /** 正式家教可用时间弹窗的初始值；首次同意正式雇佣时不回填试课申请阶段的可试课时间。 */
  const serviceAvailabilityInitialValue = useMemo(
    () =>
      serviceAvailabilityAction === "request_service_schedule_change"
        ? getTrialScheduleValueFromSummary(getTutorTrialAvailabilitySummaryFromOrderDetail(order.detail))
        : null,
    [order.detail, serviceAvailabilityAction]
  );
  /** 学生同意正式雇佣时以真实试课日程作为只读标记，已试课时段不可再次选择。 */
  const serviceAvailabilityBlockedSummary =
    serviceAvailabilityAction === "accept_service_offer" ? getTutorTrialScheduleSummaryFromOrderDetail(order.detail) : "";
  /** 父端正式雇佣日程必须落在学生提交的可家教时间内。 */
  const serviceScheduleAvailabilitySummary = getTutorTrialAvailabilitySummaryFromOrderDetail(tutorWorkflowTargetOrder.detail);
  /** 父端制定正式日程时，试课历史以只读日程展示并禁止重复选择。 */
  const serviceScheduleBlockedSummary = getTutorTrialScheduleSummaryFromOrderDetail(tutorWorkflowTargetOrder.detail);

  /** 学生取消申请，成功后由查询缓存失效刷新服务端状态。 */
  async function handleCancelTutorApplication(targetOrder: ClientOrder) {
    if (cancelTutorApplicationMutation.isPending) {
      return;
    }

    try {
      await cancelTutorApplicationMutation.mutateAsync(targetOrder.id);
      showMessage("试课申请已取消。", { type: "success" });
    } catch (error) {
      showMessage(getErrorMessage(error, "取消申请失败，请稍后重试。"), { type: "error" });
    }
  }

  /** 打开学生端可家教日期弹窗，确认后再推进正式雇佣或日程修改流程。 */
  function handleOpenServiceAvailability(_targetOrder: ClientOrder, action: TutorServiceAvailabilityAction) {
    if (!handlers.onTutorWorkflowAction) {
      showMessage("家教流程接口暂不可用，请稍后重试。", { type: "warning" });
      return;
    }

    setServiceAvailabilityAction(action);
  }

  /** 打开家长端正式雇佣日程弹窗，提交目标为当前正式雇佣申请子任务。 */
  function handleOpenServiceSchedule() {
    if (!handlers.onTutorWorkflowAction) {
      showMessage("家教流程接口暂不可用，请稍后重试。", { type: "warning" });
      return;
    }

    setIsServiceScheduleOpen(true);
  }

  /** 学生提交可家教日期后，调用真实流程接口推进正式雇佣日程节点。 */
  async function handleConfirmServiceAvailability(value: TrialScheduleValue) {
    if (!serviceAvailabilityAction || !handlers.onTutorWorkflowAction || isSubmittingServiceAvailability) {
      return;
    }

    setIsSubmittingServiceAvailability(true);
    try {
      const result = await handlers.onTutorWorkflowAction(order, serviceAvailabilityAction, {
        availability: value.plan.summary
      });

      if (result !== false) {
        setServiceAvailabilityAction(null);
      }
    } finally {
      setIsSubmittingServiceAvailability(false);
    }
  }

  /** 家长提交正式雇佣日程后，当前申请进入正式雇佣。 */
  async function handleConfirmServiceSchedule(value: TrialScheduleValue) {
    if (!handlers.onTutorWorkflowAction || isSubmittingServiceSchedule) {
      return;
    }

    setIsSubmittingServiceSchedule(true);
    try {
      const result = await handlers.onTutorWorkflowAction(tutorWorkflowTargetOrder, "submit_service_schedule", {
        tutorSchedule: value.plan.summary
      });

      if (result !== false) {
        setIsServiceScheduleOpen(false);
      }
    } finally {
      setIsSubmittingServiceSchedule(false);
    }
  }

  /** 家长端提交正式服务结算金额，服务端负责结束主任务并等待学生确认结算。 */
  async function handleConfirmServiceSettlement(settlementOrder: ClientOrder, trialFee: number) {
    if (!handlers.onTutorWorkflowAction) {
      showMessage("家教流程接口暂不可用，请稍后重试。", { type: "warning" });
      return false;
    }

    return await handlers.onTutorWorkflowAction(settlementOrder, "request_service_end", { trialFee });
  }

  return (
    <>
      <article className={`flow-card compact p-[12px] ${order.risk ? "risk-card" : ""}`}>
        <div className="card-title flex items-center justify-between gap-[10px]">
          <GraduationCap size={18} />
          <div className="ongoing-order-title-copy min-w-0 flex-1">
            <strong>{order.title}</strong>
          </div>
          <OrderStatus order={order} tutorTask={tutorTask} />
        </div>
        <div className="card-detail grid gap-[6px] mt-[10px]">
          <div className="card-detail-item grid grid-cols-[56px_minmax(0,1fr)] items-center gap-[8px]">
            <span className="card-detail-title">学科</span>
            <span className="card-detail-content">{order.subject}</span>
          </div>
          <div className="card-detail-item grid grid-cols-[56px_minmax(0,1fr)] items-center gap-[8px]">
            <span className="card-detail-title">时间</span>
            <span className="card-detail-content">{periodDaysLabel}</span>
          </div>
          <div className="card-detail-item grid grid-cols-[56px_minmax(0,1fr)] items-center gap-[8px]">
            <span className="card-detail-title">位置</span>
            <span className="card-detail-content">{order.address}</span>
          </div>
        </div>
        <div className="card-action">
          <OrderActions
            isCancellingTutorApplication={cancelTutorApplicationMutation.isPending}
            order={order}
            {...handlers}
            onCancelTutorApplication={handleCancelTutorApplication}
            onMessageOrder={showOngoingOrderMessagePlaceholder}
            onOpenCancelConfirmation={onOpenCancelConfirmation}
            onOpenServiceAvailability={handleOpenServiceAvailability}
            onOpenServiceSchedule={handleOpenServiceSchedule}
            onOpenServiceSettlement={() => setIsServiceSettlementOpen(true)}
            onOpenTrialResult={() => setIsTrialResultOpen(true)}
            onOpenTrialSchedule={() => setIsTrialScheduleOpen(true)}
          />
        </div>
      </article>
      {isTrialScheduleOpen ? (
        <TrialSchedulePreview
          onClose={() => setIsTrialScheduleOpen(false)}
          onConfirmTrial={handlers.onConfirmTutorTrialStart}
          onTutorWorkflowAction={handlers.onTutorWorkflowAction}
          order={order}
          role={role}
        />
      ) : null}
      {isTrialResultOpen ? (
        <TrialSettlementConfirm onClose={() => setIsTrialResultOpen(false)} onTutorWorkflowAction={handlers.onTutorWorkflowAction} order={order} />
      ) : null}
      {isServiceSettlementOpen ? (
        <ServiceSettlement
          onClose={() => setIsServiceSettlementOpen(false)}
          onConfirm={handleConfirmServiceSettlement}
          order={tutorWorkflowTargetOrder}
        />
      ) : null}
      {isServiceScheduleOpen ? (
        <TutorTrialSchedule
          availableScheduleSummary={serviceScheduleAvailabilitySummary}
          blockedScheduleLabel="试"
          blockedScheduleSummary={serviceScheduleBlockedSummary}
          confirmLabel={isSubmittingServiceSchedule ? "提交中" : "提交日程"}
          initialValue={null}
          isConfirming={isSubmittingServiceSchedule}
          maxSelectedDates={null}
          onClose={() => setIsServiceScheduleOpen(false)}
          onConfirm={handleConfirmServiceSchedule}
          scheduleLabel="课"
          subtitle="请在学生提交的可家教时间内制定正式雇佣日程，提交后直接进入正式雇佣。"
          title="正式雇佣日程"
        />
      ) : null}
      {serviceAvailabilityAction ? (
        <TutorTrialSchedule
          blockedScheduleLabel="试"
          blockedScheduleSummary={serviceAvailabilityBlockedSummary}
          confirmLabel={
            isSubmittingServiceAvailability ? "提交中" : serviceAvailabilityAction === "accept_service_offer" ? "同意并提交" : "提交修改"
          }
          initialValue={serviceAvailabilityInitialValue}
          isConfirming={isSubmittingServiceAvailability}
          maxSelectedDates={null}
          onClose={() => setServiceAvailabilityAction(null)}
          onConfirm={handleConfirmServiceAvailability}
          subtitle={
            serviceAvailabilityAction === "accept_service_offer"
              ? "请基于已完成的试课日程选择可正式家教的日期和时间，标记为“试”的时段不可再次选择。"
              : "请重新选择可进行正式家教的日期和时间，提交后等待家长重新制定正式雇佣日程。"
          }
          title={serviceAvailabilityAction === "accept_service_offer" ? "可家教日期" : "修改可家教日期"}
        />
      ) : null}
    </>
  );
}
