import "./index.less";
import { useCancelTutorApplication } from "@unknown/hooks";
import { TrialScheduleCalendar, type TrialScheduleCalendarPeriod } from "@components/TrialScheduleCalendar";
import { TutorTrialScheduleDialog } from "@components/TutorTrialScheduleDialog";
import { getTrialScheduleValueFromSummary, type TrialScheduleValue } from "@components/TutorTrialScheduleDialog/model";
import { getErrorMessage, showMessage } from "@tools/messageToast";
import {
  getTutorTrialAvailabilitySummaryFromOrderDetail,
  getTutorTrialOrderDisplayDetail,
  getTutorTrialScheduleSummaryFromOrderDetail,
  parseTutorTrialSchedule
} from "@tools/tutorTrial";
import { createTutorTaskModel } from "@tools/tutorTaskWorkflow";

/** 进行中列表筛选类型。 */
type OngoingOrderFilter = "all" | "delegation" | "featured" | "hunting" | "tutor";

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

/** 判断进行中卡片是否存在常规履约动作。 */
function hasOngoingOrderActions(order: ClientOrder): boolean {
  if (getOngoingOrderCategory(order) === "tutor") {
    return createTutorTaskModel({ order, role: order.role }).availableActions.length > 0;
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
  const scheduleSummary = getTutorTrialScheduleSummaryFromOrderDetail(order.detail);
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
  const canUpdateTrialAvailability = tutorTask.can("updateTrialAvailability") && Boolean(onTutorWorkflowAction);

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
    <section className="checkout-sheet" aria-label="试课安排详情">
      <div className="sheet-backdrop" onClick={onClose} />
      <article className="sheet-panel trial-schedule-preview-sheet mx-auto grid max-w-[540px] gap-[12px] px-[14px] pb-[calc(16px+env(safe-area-inset-bottom))] pt-[16px]">
        <div className="card-title flex items-center justify-between gap-[10px]">
          <CalendarClock size={18} />
          <div>
            <strong>试课安排</strong>
            <span>{order.title}</span>
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
          <p className="notice p-[10px] text-[#61420d]">暂无可查看的试课日程。</p>
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

/** 获取进行中卡片正文详情，家教试课卡片隐藏流程说明。 */
function getOngoingOrderDisplayDetail(order: ClientOrder) {
  return getOngoingOrderCategory(order) === "tutor" ? getTutorTrialOrderDisplayDetail(order.detail) : order.detail;
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
          {(tutorTask ? tutorTask.can("openTrialSchedule") : order.canOpenTrialSchedule) ? (
            <button
              className="ghost-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-[#475466]"
              onClick={() => handlers.onOpenTrialSchedule?.(order)}
              type="button"
            >
              <CalendarClock size={15} />
              试课安排
            </button>
          ) : null}
          {(tutorTask ? tutorTask.can("openTrialList") : order.canOpenTutorTrialList) ? (
            <button
              className="primary-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white"
              onClick={() => handlers.onOpenTutorTrialList?.(order)}
              type="button"
            >
              <CalendarClock size={15} />
              试课列表
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
              试课结果
            </button>
          ) : null}
          {tutorTask?.can("acceptServiceOffer") ? (
            <button
              className="primary-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white"
              onClick={() => handlers.onTutorWorkflowAction?.(order, "accept_service_offer")}
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
          {tutorTask?.can("confirmServiceSchedule") ? (
            <button
              className="primary-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white"
              onClick={() => handlers.onTutorWorkflowAction?.(order, "confirm_service_schedule")}
              type="button"
            >
              确认兼职日程
            </button>
          ) : null}
          {tutorTask?.can("requestServiceScheduleChange") ? (
            <button
              className="ghost-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-[#475466]"
              onClick={() => handlers.onTutorWorkflowAction?.(order, "request_service_schedule_change")}
              type="button"
            >
              修改可兼职周期
            </button>
          ) : null}
          {tutorTask?.can("requestServiceEnd") ? (
            <button
              className="danger-outline-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px]"
              onClick={() => handlers.onTutorWorkflowAction?.(order, "request_service_end")}
              type="button"
            >
              发起结束家教
            </button>
          ) : null}
          {tutorTask?.can("confirmSettlement") ? (
            <button
              className="primary-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white"
              onClick={() => handlers.onTutorWorkflowAction?.(order, "confirm_settlement")}
              type="button"
            >
              确认结算
            </button>
          ) : null}
          {tutorTask?.can("requestSettlementRevision") ? (
            <button
              className="ghost-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-[#475466]"
              onClick={() => handlers.onTutorWorkflowAction?.(order, "request_settlement_revision")}
              type="button"
            >
              要求修改
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
              取消
            </button>
          ) : null}
          {(tutorTask ? tutorTask.can("requestTrialEnd") : order.canRequestComplete) ? (
            <button
              className="primary-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white"
              onClick={() => handlers.onRequestComplete?.(order)}
              type="button"
            >
              {tutorTask?.can("requestTrialEnd") ? "提交结束试课确认" : "完成"}
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
  const [trialScheduleOrder, setTrialScheduleOrder] = useState<ClientOrder | null>(null);
  /** 按当前标签过滤后的进行中事项列表。 */
  const filteredOrders = useMemo(
    () => orders.filter((order) => activeFilter === "all" || getOngoingOrderCategory(order) === activeFilter),
    [activeFilter, orders]
  );

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
                <em className={`ongoing-status-badge ${tutorTask?.statusToneClassName ?? ""}`}>
                  {tutorTask?.statusLabel ?? order.status}
                </em>
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
                onOpenTrialResult={() => showTutorWorkflowMessage("试课结果流程待后端结算接口接入。")}
                onOpenTrialSchedule={(order) => setTrialScheduleOrder(order)}
                onRejectTrial={() => showTutorWorkflowMessage("已拒绝试课申请。")}
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
    </>
  );
}
