import "./index.less";
import { useCancelTutorApplication } from "@unknown/hooks";
import { TrialScheduleCalendar, type TrialScheduleCalendarPeriod } from "@components/TrialScheduleCalendar";
import { TutorTrialScheduleDialog } from "@components/TutorTrialScheduleDialog";
import { getTrialScheduleValueFromSummary, type TrialScheduleValue } from "@components/TutorTrialScheduleDialog/model";
import { getErrorMessage, showMessage } from "@tools/messageToast";
import {
  getTutorTrialAvailabilitySummaryFromOrderDetail,
  getTutorTrialFeeSummaryFromOrderDetail,
  getTutorTrialOrderDisplayDetail,
  getTutorTrialScheduleSummaryFromOrderDetail,
  parseTutorTrialSchedule
} from "@tools/tutorTrial";
import { createTutorTaskModel } from "@tools/tutorTaskWorkflow";

/** 进行中列表筛选类型。 */
type OngoingOrderFilter = "all" | "delegation" | "featured" | "hunting" | "tutor";

/** 学生端提交正式家教可用时间时的流程动作。 */
type TutorServiceAvailabilityAction = Extract<TutorWorkflowAction, "accept_service_offer" | "request_service_schedule_change">;

/** 学生端正式家教可用时间弹窗状态。 */
interface TutorServiceAvailabilityState {
  action: TutorServiceAvailabilityAction;
  order: ClientOrder;
}

/** 学生端进行中家教卡片时间预览配置。 */
interface TutorOrderSchedulePreviewConfig {
  allowConflictAction: boolean;
  buttonLabel: string;
  emptyLabel: string;
  showScheduleLabel: boolean;
  subtitle: string;
  summary: string;
  title: string;
}

/** 进行中事项动作回调集合，由弹窗或页面注入业务处理。 */
interface OngoingOrderActionHandlers {
  onConfirmCancel?: (order: ClientOrder) => void;
  onConfirmComplete?: (order: ClientOrder) => void;
  onConfirmTutorTrialStart?: (order: ClientOrder) => void;
  onOpenQuoteList?: (order: ClientOrder) => void;
  onOpenTutorApplications?: (order: ClientOrder) => void;
  onOpenTutorTrialList?: (order: ClientOrder) => void;
  onRepublish?: (order: ClientOrder) => void;
  onTutorWorkflowAction?: (order: ClientOrder, action: TutorWorkflowAction, payload?: Partial<TutorWorkflowActionRequest>) => Promise<boolean> | boolean | void;
  onRequestCancel?: (order: ClientOrder) => void;
  onRequestComplete?: (order: ClientOrder) => void;
}

/** 进行中列表内部即可闭环的提示类动作。 */
interface OngoingOrderLocalActionHandlers {
  onAgreeTrial: (order: ClientOrder) => void;
  onCancelTutorApplication: (order: ClientOrder) => void;
  onMessageOrder: (order: ClientOrder) => void;
  onOpenServiceSchedule: (order: ClientOrder) => void;
  onOpenServiceSettlement: (order: ClientOrder) => void;
  onOpenServiceAvailability: (order: ClientOrder, action: TutorServiceAvailabilityAction) => void;
  onOpenTrialResult: (order: ClientOrder) => void;
  onOpenTrialSchedule: (order: ClientOrder) => void;
  onRejectTrial: (order: ClientOrder) => void;
}

/** 进行中事项列表组件入参。 */
interface OngoingOrdersListProps extends OngoingOrderActionHandlers {
  orders: ClientOrder[];
}

/** 进行中列表筛选标签配置。 */
const ongoingOrderFilterOptions: Array<{ label: string; value: OngoingOrderFilter }> = [
  { label: "全部", value: "all" },
  { label: "优选", value: "featured" },
  { label: "委托", value: "delegation" },
  { label: "狩猎", value: "hunting" },
  { label: "家教", value: "tutor" }
];

/** 获取进行中事项分类，未标记的订单默认归入优选。 */
function getOngoingOrderCategory(order: ClientOrder): Exclude<OngoingOrderFilter, "all"> {
  return order.category === "delegation" || order.category === "hunting" || order.category === "tutor"
    ? order.category
    : "featured";
}

/** 父端主任务动作需要落到当前正式雇佣的申请子任务。 */
function getTutorWorkflowTargetOrder(order: ClientOrder) {
  return order.role === "parent" && order.quoteId ? { ...order, id: order.quoteId } : order;
}

/** 判断家长端主卡是否处于等待提交正式雇佣日程的状态。 */
function isParentTutorServiceSchedulePending(order: ClientOrder) {
  return (
    order.role === "parent" &&
    getOngoingOrderCategory(order) === "tutor" &&
    Boolean(order.quoteId) &&
    Boolean(getTutorTrialAvailabilitySummaryFromOrderDetail(order.detail)) &&
    !getTutorTrialScheduleSummaryFromOrderDetail(order.detail)
  );
}

/** 获取学生端家教卡片的时间预览入口配置，正文只保留业务摘要。 */
function getTutorOrderSchedulePreviewConfig(
  order: ClientOrder,
  tutorTask: ReturnType<typeof createTutorTaskModel>
): TutorOrderSchedulePreviewConfig | null {
  const scheduleSummary = getTutorTrialScheduleSummaryFromOrderDetail(order.detail);
  const availabilitySummary = getTutorTrialAvailabilitySummaryFromOrderDetail(order.detail);

  if (tutorTask.node === "serviceSchedulePending") {
    return availabilitySummary
      ? {
          allowConflictAction: false,
          buttonLabel: "可家教时间",
          emptyLabel: "暂无可家教时间",
          showScheduleLabel: false,
          subtitle: "查看已提交给家长用于制定正式雇佣日程的可家教时间。",
          summary: availabilitySummary,
          title: "可家教时间"
        }
      : null;
  }

  if (tutorTask.node === "formalTutoring") {
    return {
      allowConflictAction: false,
      buttonLabel: "课程",
      emptyLabel: "暂无课程安排",
      showScheduleLabel: true,
      subtitle: order.role === "parent" ? "查看当前正式雇佣的课程安排。" : "查看家长提交的正式雇佣日程。",
      summary: scheduleSummary,
      title: order.role === "parent" ? "课程安排" : "正式雇佣日程"
    };
  }

  return scheduleSummary
    ? {
        allowConflictAction: tutorTask.can("updateTrialAvailability"),
        buttonLabel: "试课安排",
        emptyLabel: "暂无试课安排",
        showScheduleLabel: true,
        subtitle: "查看家长提交的试课安排。",
        summary: scheduleSummary,
        title: "试课安排"
      }
    : null;
}

/** 判断进行中卡片是否存在常规履约动作。 */
function hasOngoingOrderActions(order: ClientOrder): boolean {
  if (getOngoingOrderCategory(order) === "tutor") {
    const tutorTask = createTutorTaskModel({ order, role: order.role });

    return tutorTask.availableActions.length > 0 || Boolean(getTutorOrderSchedulePreviewConfig(order, tutorTask));
  }

  return Boolean(
    order.canMessage ||
      order.canOpenTutorApplications ||
      order.canOpenTrialSchedule ||
      order.canRejectTrial ||
      order.canAgreeTrial ||
      order.canOpenTrialResult ||
      order.canRequestCancel ||
      order.canRequestComplete ||
      order.canOpenTutorTrialList ||
      order.canConfirmCancel ||
      order.canConfirmComplete ||
      order.canRepublish
  );
}

/** 根据时间段归类到试课日历三段展示。 */
function getTrialSchedulePreviewPeriod(timeRange: string): TrialScheduleCalendarPeriod {
  const startHour = Number(timeRange.split(":")[0]);

  if (startHour < 12) {
    return "morning";
  }

  return startHour < 18 ? "afternoon" : "evening";
}

/** 生成试课预览日历需要的日期标记。 */
function getTrialSchedulePreviewItems(scheduleSummary: string) {
  return parseTutorTrialSchedule(scheduleSummary)
    .filter((scheduleLine) => scheduleLine.date)
    .map((scheduleLine) => ({
      date: scheduleLine.date,
      periods: [...new Set(scheduleLine.times.map(getTrialSchedulePreviewPeriod))]
    }));
}

/** 学生端查看家长提交的试课日程弹窗。 */
function TrialSchedulePreviewDialog({
  onClose,
  onConfirmTrial,
  onTutorWorkflowAction,
  order
}: {
  onClose: () => void;
  onConfirmTrial?: (order: ClientOrder) => void;
  onTutorWorkflowAction?: (order: ClientOrder, action: TutorWorkflowAction, payload?: Partial<TutorWorkflowActionRequest>) => Promise<boolean> | boolean | void;
  order: ClientOrder;
}) {
  const tutorTask = createTutorTaskModel({ order, role: order.role });
  const [isConflictScheduleOpen, setIsConflictScheduleOpen] = useState(false);
  const [isSubmittingConflictSchedule, setIsSubmittingConflictSchedule] = useState(false);
  const previewConfig = getTutorOrderSchedulePreviewConfig(order, tutorTask);
  const scheduleSummary = previewConfig?.summary ?? "";
  const availabilitySummary = getTutorTrialAvailabilitySummaryFromOrderDetail(order.detail);
  const scheduleLines = parseTutorTrialSchedule(scheduleSummary);
  const scheduleItems = getTrialSchedulePreviewItems(scheduleSummary);
  const selectedDates = scheduleItems.map((item) => item.date);
  const initialConflictScheduleValue = useMemo(() => getTrialScheduleValueFromSummary(availabilitySummary), [availabilitySummary]);
  const [selectedDate, setSelectedDate] = useState(selectedDates[0] ?? "");
  const selectedScheduleLine = scheduleLines.find((line) => line.date === selectedDate);
  const previewPeriods: Array<{ key: TrialScheduleCalendarPeriod; label: string }> = [
    { key: "morning", label: "上午" },
    { key: "afternoon", label: "下午" },
    { key: "evening", label: "晚上" }
  ];
  const periodRows: Array<{ key: TrialScheduleCalendarPeriod; label: string; times: string[] }> = previewPeriods.map((period) => ({
    ...period,
    times:
      selectedScheduleLine?.times.filter((timeRange) => getTrialSchedulePreviewPeriod(timeRange) === period.key) ?? []
  }));
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
    <section className="checkout-sheet" aria-label={previewConfig?.title ?? "时间安排详情"}>
      <div className="sheet-backdrop" onClick={onClose} />
      <article className="sheet-panel trial-schedule-preview-sheet mx-auto grid max-w-[540px] gap-[12px] px-[14px] pb-[calc(16px+env(safe-area-inset-bottom))] pt-[16px]">
        <div className="card-title flex items-center justify-between gap-[10px]">
          <CalendarClock size={18} />
          <div>
            <strong>{previewConfig?.title ?? "时间安排"}</strong>
            <span>{previewConfig?.subtitle ?? order.title}</span>
          </div>
          <button aria-label="关闭" className="icon-only grid h-[34px] w-[34px] place-items-center text-[#475466]" onClick={onClose} type="button">
            <XCircle size={20} />
          </button>
        </div>
        <em className={`ongoing-status-badge ${tutorTask.statusToneClassName}`}>{tutorTask.statusLabel}</em>
        {scheduleItems.length > 0 ? (
          <div className="trial-schedule-preview-content grid gap-[12px]">
            <TrialScheduleCalendar
              activeDate={selectedDate}
              initialDate={selectedDates[0]}
              maxSelectedDates={selectedDates.length}
              onActiveDateChange={setSelectedDate}
              scheduleItems={scheduleItems}
              selectedDates={selectedDates}
              showScheduleLabel={previewConfig?.showScheduleLabel}
            />
            <div className="trial-schedule-preview-list grid gap-[8px]">
              {periodRows.map((period) => (
                <article className={`trial-schedule-preview-period ${period.times.length > 0 ? "selected" : ""}`} key={period.key}>
                  <strong>{period.label}</strong>
                  <span>{period.times.join("、") || "暂无安排"}</span>
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
      </article>
      {isConflictScheduleOpen ? (
        <TutorTrialScheduleDialog
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
    </section>
  );
}

/** 学生确认试课费用的弹窗，确认后流程进入家长雇佣决策。 */
function TrialSettlementConfirmDialog({
  onClose,
  onTutorWorkflowAction,
  order
}: {
  onClose: () => void;
  onTutorWorkflowAction?: (order: ClientOrder, action: TutorWorkflowAction, payload?: Partial<TutorWorkflowActionRequest>) => Promise<boolean> | boolean | void;
  order: ClientOrder;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isServiceSettlement = order.detail.includes("正式雇佣");
  const feeSummary = getTutorTrialFeeSummaryFromOrderDetail(order.detail) || order.amountLabel || formatCurrency(order.amount);
  const scheduleSummary = getTutorTrialScheduleSummaryFromOrderDetail(order.detail);

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
    <section className="checkout-sheet" aria-label="结算确认">
      <div className="sheet-backdrop" onClick={onClose} />
      <article className="sheet-panel trial-settlement-confirm-sheet mx-auto grid max-w-[540px] gap-[12px] px-[14px] pb-[calc(16px+env(safe-area-inset-bottom))] pt-[16px]">
        <div className="card-title flex items-center justify-between gap-[10px]">
          <CircleDollarSign size={18} />
          <div>
            <strong>结算确认</strong>
            <span>{order.title}</span>
          </div>
          <button aria-label="关闭" className="icon-only grid h-[34px] w-[34px] place-items-center text-[#475466]" onClick={onClose} type="button">
            <XCircle size={20} />
          </button>
        </div>

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
      </article>
    </section>
  );
}

/** 家长端结束正式雇佣前提交结算金额，提交后主任务进入已结束并等待学生确认结算。 */
function ServiceSettlementDialog({
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
  const scheduleSummary = getTutorTrialScheduleSummaryFromOrderDetail(order.detail);

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
    <section className="checkout-sheet" aria-label="正式服务结算">
      <div className="sheet-backdrop" onClick={onClose} />
      <article className="sheet-panel trial-settlement-confirm-sheet mx-auto grid max-w-[540px] gap-[12px] px-[14px] pb-[calc(16px+env(safe-area-inset-bottom))] pt-[16px]">
        <div className="card-title flex items-center justify-between gap-[10px]">
          <CircleDollarSign size={18} />
          <div>
            <strong>正式服务结算</strong>
            <span>{order.title}</span>
          </div>
          <button aria-label="关闭" className="icon-only grid h-[34px] w-[34px] place-items-center text-[#475466]" onClick={onClose} type="button">
            <XCircle size={20} />
          </button>
        </div>

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
      </article>
    </section>
  );
}

/** 获取进行中卡片正文详情，家教试课卡片隐藏流程说明。 */
function getOngoingOrderDisplayDetail(order: ClientOrder) {
  return getOngoingOrderCategory(order) === "tutor" ? getTutorTrialOrderDisplayDetail(order.detail) : order.detail;
}

/** 渲染进行中卡片状态，家教多状态按上下两行展示，不拼接加号。 */
function renderOngoingOrderStatus(order: ClientOrder, tutorTask: ReturnType<typeof createTutorTaskModel> | null) {
  if (!tutorTask) {
    return <em className="ongoing-status-badge">{order.status}</em>;
  }

  const statusLabels = tutorTask.statusLabels.length > 0 ? tutorTask.statusLabels : [tutorTask.statusLabel].filter(Boolean);

  return (
    <span className={`ongoing-status-stack ${statusLabels.length > 1 ? "multi" : ""}`}>
      {statusLabels.map((statusLabel) => (
        <em className={`ongoing-status-badge ${tutorTask.statusToneClassName}`} key={statusLabel}>
          {statusLabel}
        </em>
      ))}
    </span>
  );
}

/** 渲染进行中事项的报价入口和履约动作。 */
function OngoingOrderActions({
  isCancellingTutorApplication = false,
  order,
  ...handlers
}: {
  isCancellingTutorApplication?: boolean;
  order: ClientOrder;
} & OngoingOrderActionHandlers & OngoingOrderLocalActionHandlers) {
  /** 当前卡片所属业务分类，用于隔离委托报价和狩猎报价入口。 */
  const category = getOngoingOrderCategory(order);
  /** 家教任务模型集中承接家教流程节点和按钮显隐。 */
  const tutorTask = category === "tutor" ? createTutorTaskModel({ order, role: order.role }) : null;
  /** 家教时间按钮统一承接试课安排、可家教时间和兼职日程。 */
  const tutorSchedulePreviewConfig = tutorTask ? getTutorOrderSchedulePreviewConfig(order, tutorTask) : null;
  /** 家长端学生已提交可家教时间后，需要先制定正式雇佣日程。 */
  const showParentTutorServiceScheduleAction = isParentTutorServiceSchedulePending(order);
  /** 家长端主任务进入正式服务后，课程入口直接打开日历预览。 */
  const showParentTutorCourseAction =
    category === "tutor" &&
    order.role === "parent" &&
    tutorTask?.node === "formalTutoring" &&
    order.canOpenTrialSchedule &&
    !showParentTutorServiceScheduleAction;
  /** 发布方委托卡片是否展示报价列表入口。 */
  const showDelegationQuote = category === "delegation" && Boolean(order.quoteCount && order.quoteCount > 0);
  /** 履约方狩猎卡片是否展示报价处理入口。 */
  const showHuntingQuote = category === "hunting" && Boolean(order.quoteId && order.quoteActionLabel);
  /** 当前卡片是否展示消息、取消、完成等履约动作。 */
  const showFulfillmentActions = hasOngoingOrderActions(order);

  if (!showDelegationQuote && !showHuntingQuote && !showFulfillmentActions) {
    return null;
  }

  return (
    <>
      {showDelegationQuote ? (
        <div className="ongoing-card-actions mt-[10px] flex flex-wrap gap-[8px]">
          <button
            className="primary-button delegation-quote-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white"
            onClick={() => handlers.onOpenQuoteList?.(order)}
            type="button"
          >
            查看报价
            <span className="delegation-quote-badge">{order.quoteCount}</span>
          </button>
        </div>
      ) : null}
      {showHuntingQuote ? (
        <div className="ongoing-card-actions mt-[10px] flex flex-wrap gap-[8px]">
          <button
            className="primary-button delegation-quote-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white"
            onClick={() => handlers.onOpenQuoteList?.(order)}
            type="button"
          >
            {order.quoteActionLabel}
          </button>
        </div>
      ) : null}
      {showFulfillmentActions ? (
        <div className="ongoing-card-actions mt-[10px] flex flex-wrap gap-[8px]">
          {(tutorTask ? tutorTask.can("message") : order.canMessage) ? (
            <button
              className="secondary-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px]"
              onClick={() => handlers.onMessageOrder?.(order)}
              type="button"
            >
              <MessageCircle size={15} />
              消息
            </button>
          ) : null}
          {(tutorTask ? tutorTask.can("openApplications") : order.canOpenTutorApplications) ? (
            <button
              className="primary-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white"
              onClick={() => handlers.onOpenTutorApplications?.(order)}
              type="button"
            >
              申请列表
              {typeof order.quoteCount === "number" ? (
                <span className="ongoing-action-badge">{order.quoteCount}</span>
              ) : null}
            </button>
          ) : null}
          {showParentTutorServiceScheduleAction ? (
            <button
              className="primary-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white"
              onClick={() => handlers.onOpenServiceSchedule(getTutorWorkflowTargetOrder(order))}
              type="button"
            >
              <CalendarClock size={15} />
              提交日程
            </button>
          ) : null}
          {!showParentTutorServiceScheduleAction && (tutorSchedulePreviewConfig || showParentTutorCourseAction || (!tutorTask && order.canOpenTrialSchedule)) ? (
            <button
              className="ghost-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-[#475466]"
              onClick={() => handlers.onOpenTrialSchedule?.(order)}
              type="button"
            >
              <CalendarClock size={15} />
              {showParentTutorCourseAction ? "课程" : tutorSchedulePreviewConfig?.buttonLabel ?? "试课安排"}
            </button>
          ) : null}
          {!showParentTutorCourseAction && (tutorTask ? tutorTask.can("openTrialList") : order.canOpenTutorTrialList) ? (
            <button
              className="primary-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white"
              onClick={() => handlers.onOpenTutorTrialList?.(order)}
              type="button"
            >
              <CalendarClock size={15} />
              试课列表
              {typeof order.trialCount === "number" ? (
                <span className="ongoing-action-badge">{order.trialCount}</span>
              ) : null}
            </button>
          ) : null}
          {(tutorTask ? tutorTask.can("rejectTrial") : order.canRejectTrial) ? (
            <button
              className="danger-outline-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px]"
              onClick={() => handlers.onRejectTrial?.(order)}
              type="button"
            >
              拒绝
            </button>
          ) : null}
          {order.canAgreeTrial && category !== "tutor" ? (
            <button
              className="primary-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white"
              onClick={() => handlers.onAgreeTrial?.(order)}
              type="button"
            >
              同意试课
            </button>
          ) : null}
          {(tutorTask ? tutorTask.can("openTrialResult") : order.canOpenTrialResult) ? (
            <button
              className="primary-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white"
              onClick={() => handlers.onOpenTrialResult?.(order)}
              type="button"
            >
              {tutorTask?.node === "settlementConfirming" ? "结算确认" : "试课结果"}
            </button>
          ) : null}
          {tutorTask?.can("cancelServiceConfirmation") ? (
            <button
              className="danger-outline-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px]"
              onClick={() => handlers.onTutorWorkflowAction?.(order, "cancel_service_confirmation")}
              type="button"
            >
              取消兼职确认
            </button>
          ) : null}
          {tutorTask?.can("acceptServiceOffer") ? (
            <button
              className="primary-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white"
              onClick={() => handlers.onOpenServiceAvailability(order, "accept_service_offer")}
              type="button"
            >
              同意正式雇佣
            </button>
          ) : null}
          {tutorTask?.can("rejectServiceOffer") ? (
            <button
              className="danger-outline-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px]"
              onClick={() => handlers.onTutorWorkflowAction?.(order, "reject_service_offer")}
              type="button"
            >
              不同意正式雇佣
            </button>
          ) : null}
          {tutorTask?.can("requestServiceScheduleChange") ? (
            <button
              className="ghost-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-[#475466]"
              onClick={() => handlers.onOpenServiceAvailability(order, "request_service_schedule_change")}
              type="button"
            >
              修改可家教日期
            </button>
          ) : null}
          {tutorTask?.can("requestServiceEnd") ? (
            <button
              className="danger-outline-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px]"
              onClick={() => {
                const targetOrder = getTutorWorkflowTargetOrder(order);
                if (order.role === "parent") {
                  handlers.onOpenServiceSettlement(targetOrder);
                  return;
                }

                handlers.onTutorWorkflowAction?.(targetOrder, "request_service_end");
              }}
              type="button"
            >
              结束
            </button>
          ) : null}
          {tutorTask?.can("confirmSettlement") && !tutorTask.can("openTrialResult") ? (
            <button
              className="primary-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white"
              onClick={() => handlers.onTutorWorkflowAction?.(order, "confirm_settlement")}
              type="button"
            >
              结算确认
            </button>
          ) : null}
          {tutorTask?.can("cancelApplication") ? (
            <button
              className="danger-outline-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px]"
              disabled={isCancellingTutorApplication}
              onClick={() => handlers.onCancelTutorApplication(order)}
              type="button"
            >
              取消试课申请
            </button>
          ) : null}
          {(tutorTask ? tutorTask.can("cancelDemand") : order.canRequestCancel) ? (
            <button
              className="danger-outline-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px]"
              onClick={() => handlers.onRequestCancel?.(order)}
              type="button"
            >
              {category === "tutor" ? "撤回" : "取消"}
            </button>
          ) : null}
          {(tutorTask ? tutorTask.can("requestTrialEnd") : order.canRequestComplete) ? (
            <button
              className="primary-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white"
              onClick={() => handlers.onRequestComplete?.(order)}
              type="button"
            >
              {tutorTask?.can("requestTrialEnd") ? "结束试课" : "完成"}
            </button>
          ) : null}
          {order.canConfirmCancel ? (
            <button
              className="danger-outline-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px]"
              onClick={() => handlers.onConfirmCancel?.(order)}
              type="button"
            >
              确认取消
            </button>
          ) : null}
          {order.canConfirmComplete ? (
            <button
              className="primary-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white"
              onClick={() => handlers.onConfirmComplete?.(order)}
              type="button"
            >
              <CheckCircle2 size={15} />
              确认完成
            </button>
          ) : null}
          {order.canRepublish ? (
            <button
              className="primary-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white"
              onClick={() => handlers.onRepublish?.(order)}
              type="button"
            >
              重新发布
            </button>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

/** 进行中事项列表，负责分类筛选、空状态和卡片动作展示。 */
export function OngoingOrdersList({ orders, ...handlers }: OngoingOrdersListProps) {
  const cancelTutorApplicationMutation = useCancelTutorApplication();
  const [activeFilter, setActiveFilter] = useState<OngoingOrderFilter>("all");
  const [cancellingTutorApplicationId, setCancellingTutorApplicationId] = useState<string | null>(null);
  const [isSubmittingServiceAvailability, setIsSubmittingServiceAvailability] = useState(false);
  const [isSubmittingServiceSchedule, setIsSubmittingServiceSchedule] = useState(false);
  const [serviceAvailabilityState, setServiceAvailabilityState] = useState<TutorServiceAvailabilityState | null>(null);
  const [serviceScheduleOrder, setServiceScheduleOrder] = useState<ClientOrder | null>(null);
  const [serviceSettlementOrder, setServiceSettlementOrder] = useState<ClientOrder | null>(null);
  const [trialSettlementOrder, setTrialSettlementOrder] = useState<ClientOrder | null>(null);
  const [trialScheduleOrder, setTrialScheduleOrder] = useState<ClientOrder | null>(null);
  /** 按当前标签过滤后的进行中事项列表。 */
  const filteredOrders = useMemo(
    () => orders.filter((order) => activeFilter === "all" || getOngoingOrderCategory(order) === activeFilter),
    [activeFilter, orders]
  );
  /** 正式家教可用时间弹窗的初始值，优先回填当前申请已保存的可用时间。 */
  const serviceAvailabilityInitialValue = useMemo(
    () => getTrialScheduleValueFromSummary(getTutorTrialAvailabilitySummaryFromOrderDetail(serviceAvailabilityState?.order.detail)),
    [serviceAvailabilityState?.order.detail]
  );
  /** 父端正式雇佣日程必须落在学生提交的可家教时间内。 */
  const serviceScheduleAvailabilitySummary = getTutorTrialAvailabilitySummaryFromOrderDetail(serviceScheduleOrder?.detail);

  /** 消息入口当前仅展示后续沟通能力提示，真实聊天接口接入后再替换为业务回调。 */
  function handleMessageOrder(order: ClientOrder) {
    showMessage(`${order.title} 的消息能力后续接入。`, { type: "warning" });
  }

  /** 学生取消试课申请，成功后由查询缓存失效刷新服务端状态。 */
  async function handleCancelTutorApplication(order: ClientOrder) {
    if (cancelTutorApplicationMutation.isPending) {
      return;
    }

    setCancellingTutorApplicationId(order.id);
    try {
      await cancelTutorApplicationMutation.mutateAsync(order.id);
      showMessage("试课申请已取消。", { type: "success" });
    } catch (error) {
      showMessage(getErrorMessage(error, "取消试课申请失败，请稍后重试。"), { type: "error" });
    } finally {
      setCancellingTutorApplicationId(null);
    }
  }

  /** 试课动作第一版不改变后端状态，只在列表内部反馈操作结果。 */
  function showTutorWorkflowMessage(message: string) {
    showMessage(message, { type: "success" });
  }

  /** 打开学生端可家教日期弹窗，确认后再推进正式雇佣或日程修改流程。 */
  function handleOpenServiceAvailability(order: ClientOrder, action: TutorServiceAvailabilityAction) {
    if (!handlers.onTutorWorkflowAction) {
      showMessage("家教流程接口暂不可用，请稍后重试。", { type: "warning" });
      return;
    }

    setServiceAvailabilityState({ action, order });
  }

  /** 打开家长端正式雇佣日程弹窗，提交目标为当前正式雇佣申请子任务。 */
  function handleOpenServiceSchedule(order: ClientOrder) {
    if (!handlers.onTutorWorkflowAction) {
      showMessage("家教流程接口暂不可用，请稍后重试。", { type: "warning" });
      return;
    }

    setServiceScheduleOrder(order);
  }

  /** 学生提交可家教日期后，调用真实流程接口推进正式雇佣日程节点。 */
  async function handleConfirmServiceAvailability(value: TrialScheduleValue) {
    if (!serviceAvailabilityState || !handlers.onTutorWorkflowAction || isSubmittingServiceAvailability) {
      return;
    }

    setIsSubmittingServiceAvailability(true);
    try {
      const result = await handlers.onTutorWorkflowAction(serviceAvailabilityState.order, serviceAvailabilityState.action, {
        availability: value.plan.summary
      });

      if (result !== false) {
        setServiceAvailabilityState(null);
      }
    } finally {
      setIsSubmittingServiceAvailability(false);
    }
  }

  /** 家长提交正式雇佣日程后，当前申请进入正式雇佣。 */
  async function handleConfirmServiceSchedule(value: TrialScheduleValue) {
    if (!serviceScheduleOrder || !handlers.onTutorWorkflowAction || isSubmittingServiceSchedule) {
      return;
    }

    setIsSubmittingServiceSchedule(true);
    try {
      const result = await handlers.onTutorWorkflowAction(serviceScheduleOrder, "submit_service_schedule", {
        tutorSchedule: value.plan.summary
      });

      if (result !== false) {
        setServiceScheduleOrder(null);
      }
    } finally {
      setIsSubmittingServiceSchedule(false);
    }
  }

  /** 家长端提交正式服务结算金额，服务端负责结束主任务并等待学生确认结算。 */
  async function handleConfirmServiceSettlement(order: ClientOrder, trialFee: number) {
    if (!handlers.onTutorWorkflowAction) {
      showMessage("家教流程接口暂不可用，请稍后重试。", { type: "warning" });
      return false;
    }

    return await handlers.onTutorWorkflowAction(order, "request_service_end", { trialFee });
  }

  return (
    <>
      <div className="ongoing-filter-tags flex flex-wrap gap-[8px]" aria-label="筛选进行中事项">
        {ongoingOrderFilterOptions.map((option) => (
          <button
            className={activeFilter === option.value ? "active" : ""}
            key={option.value}
            onClick={() => setActiveFilter(option.value)}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>
      <div className="ongoing-list grid gap-[10px]">
        {filteredOrders.map((order) => {
          const tutorTask =
            getOngoingOrderCategory(order) === "tutor" ? createTutorTaskModel({ order, role: order.role }) : null;

          return (
            <article className={`flow-card compact p-[12px] ${order.risk ? "risk-card" : ""}`} key={order.id}>
              <div className="card-title flex items-center justify-between gap-[10px]">
                <div>
                  <strong>{order.title}</strong>
                  <span>{order.id}</span>
                </div>
                {renderOngoingOrderStatus(order, tutorTask)}
              </div>
              <p>{getOngoingOrderDisplayDetail(order)}</p>
              <div className="meta-line mt-[10px] flex flex-wrap items-center gap-[6px] text-[13px] leading-[1.45] text-[#657181]">
                <span>{order.amountLabel ?? formatCurrency(order.amount)}</span>
                <span>{order.contact}</span>
              </div>
              <OngoingOrderActions
                isCancellingTutorApplication={cancellingTutorApplicationId === order.id}
                order={order}
                {...handlers}
                onAgreeTrial={() => showTutorWorkflowMessage("已同意试课，家教兼职进入试课流程。")}
                onCancelTutorApplication={handleCancelTutorApplication}
                onMessageOrder={handleMessageOrder}
                onOpenServiceAvailability={handleOpenServiceAvailability}
                onOpenServiceSchedule={handleOpenServiceSchedule}
                onOpenServiceSettlement={setServiceSettlementOrder}
                onOpenTrialResult={(order) => setTrialSettlementOrder(order)}
                onOpenTrialSchedule={(order) => setTrialScheduleOrder(order)}
                onRejectTrial={() => showTutorWorkflowMessage("已拒绝试课申请。")}
                onTutorWorkflowAction={handlers.onTutorWorkflowAction}
              />
            </article>
          );
        })}
        {filteredOrders.length === 0 ? (
          <article className="empty-state p-[14px] text-center">
            <strong>暂无当前筛选事项</strong>
            <span>切换筛选标签查看其它进行中内容。</span>
          </article>
        ) : null}
      </div>
      {trialScheduleOrder ? (
        <TrialSchedulePreviewDialog
          onClose={() => setTrialScheduleOrder(null)}
          onConfirmTrial={handlers.onConfirmTutorTrialStart}
          onTutorWorkflowAction={handlers.onTutorWorkflowAction}
          order={trialScheduleOrder}
        />
      ) : null}
      {trialSettlementOrder ? (
        <TrialSettlementConfirmDialog
          onClose={() => setTrialSettlementOrder(null)}
          onTutorWorkflowAction={handlers.onTutorWorkflowAction}
          order={trialSettlementOrder}
        />
      ) : null}
      {serviceSettlementOrder ? (
        <ServiceSettlementDialog
          onClose={() => setServiceSettlementOrder(null)}
          onConfirm={handleConfirmServiceSettlement}
          order={serviceSettlementOrder}
        />
      ) : null}
      {serviceScheduleOrder ? (
        <TutorTrialScheduleDialog
          availableScheduleSummary={serviceScheduleAvailabilitySummary}
          confirmLabel={isSubmittingServiceSchedule ? "提交中" : "提交日程"}
          initialValue={null}
          isConfirming={isSubmittingServiceSchedule}
          maxSelectedDates={null}
          onClose={() => setServiceScheduleOrder(null)}
          onConfirm={handleConfirmServiceSchedule}
          subtitle="请在学生提交的可家教时间内制定正式雇佣日程，提交后直接进入正式雇佣。"
          title="正式雇佣日程"
        />
      ) : null}
      {serviceAvailabilityState ? (
        <TutorTrialScheduleDialog
          confirmLabel={
            isSubmittingServiceAvailability
              ? "提交中"
              : serviceAvailabilityState.action === "accept_service_offer"
                ? "同意并提交"
                : "提交修改"
          }
          initialValue={serviceAvailabilityInitialValue}
          isConfirming={isSubmittingServiceAvailability}
          maxSelectedDates={null}
          onClose={() => setServiceAvailabilityState(null)}
          onConfirm={handleConfirmServiceAvailability}
          subtitle={
            serviceAvailabilityState.action === "accept_service_offer"
              ? "请选择可进行正式家教的日期和时间，提交后等待家长制定正式雇佣日程。"
              : "请重新选择可进行正式家教的日期和时间，提交后等待家长重新制定正式雇佣日程。"
          }
          title={serviceAvailabilityState.action === "accept_service_offer" ? "可家教日期" : "修改可家教日期"}
        />
      ) : null}
    </>
  );
}
