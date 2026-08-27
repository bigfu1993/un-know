import { useCancelTutorApplication } from "@unknown/hooks";
import { useTutorOverlayActions } from "@h5/overlays/tutor/provider";
import { getErrorMessage, showMessage } from "@tools/messageToast";
import {
  getTutorTrialAvailabilitySummaryFromOrderDetail,
  getTutorTrialScheduleSummaryFromOrderDetail
} from "@tools/tutorTrial";
import { createTutorTaskModel } from "@tools/tutorTaskWorkflow";
import {
  getOngoingOrderCategory,
  getTutorOrderSchedulePreviewConfig,
  getTutorWorkflowTargetOrder,
  hasOngoingOrderActions,
  isParentTutorServiceSchedulePending,
  type OngoingOrderActionHandlers,
  type TutorServiceAvailabilityAction
} from "../model";
import { ServiceSettlement, TrialSchedulePreview, TrialSettlementConfirm } from "./TutorWorkflowModals";

/** 进行中卡片状态展示，家教多状态按上下两行展示，不拼接加号；家教卡片和通用卡片共用。 */
export function OrderStatus({
  order,
  tutorTask
}: {
  order: ClientOrder;
  tutorTask: ReturnType<typeof createTutorTaskModel> | null;
}) {
  if (!tutorTask) {
    return <em className="ongoing-status-badge">{order.status}</em>;
  }

  return (
    <CardStatus
      badgeClassName={`ongoing-status-badge ${tutorTask.statusToneClassName}`}
      labels={tutorTask.displayStatusLabels}
      stackClassName="ongoing-status-stack"
    />
  );
}

/**
 * 渲染进行中事项的报价入口和履约动作，家教卡片和通用卡片共用同一套按钮渲染逻辑。
 * 家教专属的取消试课申请、试课日程/结果、正式雇佣日程/可家教时间/结算等状态和弹窗完全由本组件自己
 * 承接（跟单张卡片一一对应，天然按 order 隔离），调用方只需要提供跨卡片共用的取消确认弹窗入口
 * 和页面级业务动作（OngoingOrderActionHandlers），不需要再关心家教流程内部的开关状态。
 */
export function OrderActions({
  onOpenCancelConfirmation,
  order,
  ...handlers
}: {
  onOpenCancelConfirmation: (config: ConfirmActionConfig) => void;
  order: ClientOrder;
} & OngoingOrderActionHandlers) {
  const { openApplications, openTrialList } = useTutorOverlayActions();
  const cancelTutorApplicationMutation = useCancelTutorApplication();
  const [isTrialScheduleOpen, setIsTrialScheduleOpen] = useState(false);
  const [isTrialResultOpen, setIsTrialResultOpen] = useState(false);
  const [isServiceSettlementOpen, setIsServiceSettlementOpen] = useState(false);
  const [isServiceScheduleOpen, setIsServiceScheduleOpen] = useState(false);
  const [serviceAvailabilityAction, setServiceAvailabilityAction] = useState<TutorServiceAvailabilityAction | null>(
    null
  );
  const [isSubmittingServiceAvailability, setIsSubmittingServiceAvailability] = useState(false);
  const [isSubmittingServiceSchedule, setIsSubmittingServiceSchedule] = useState(false);
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
  /** 家长端主任务动作需要落到当前正式雇佣的申请子任务，正式雇佣日程和结算都基于这个目标订单提交。 */
  const tutorWorkflowTargetOrder = getTutorWorkflowTargetOrder(order);

  if (!showDelegationQuote && !showHuntingQuote && !showFulfillmentActions) {
    return null;
  }

  /** 旧版非接口动作只给出本地反馈，不向父组件透传提示方法。 */
  function showLocalTutorWorkflowMessage(message: string) {
    showMessage(message, { type: "success" });
  }

  /** 学生取消试课申请，成功后由查询缓存失效刷新服务端状态。 */
  async function handleCancelTutorApplication() {
    if (cancelTutorApplicationMutation.isPending) {
      return;
    }

    try {
      await cancelTutorApplicationMutation.mutateAsync(order.id);
      showMessage("试课申请已取消。", { type: "success" });
    } catch (error) {
      showMessage(getErrorMessage(error, "取消申请失败，请稍后重试。"), { type: "error" });
    }
  }

  /** 打开学生端可家教日期弹窗，确认后再推进正式雇佣或日程修改流程。 */
  function handleOpenServiceAvailability(action: TutorServiceAvailabilityAction) {
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
      {showDelegationQuote ? (
        <button
          className="primary-button delegation-quote-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white"
          onClick={() => handlers.onOpenQuoteList?.(order)}
          type="button"
        >
          查看报价
          <span className="delegation-quote-badge">{order.quoteCount}</span>
        </button>
      ) : null}
      {showHuntingQuote ? (
        <button
          className="primary-button delegation-quote-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white"
          onClick={() => handlers.onOpenQuoteList?.(order)}
          type="button"
        >
          {order.quoteActionLabel}
        </button>
      ) : null}
      {showFulfillmentActions ? (
        <>
          {(tutorTask ? tutorTask.can("openApplications") : order.canOpenTutorApplications) ? (
            <button
              className="primary-button ongoing-action-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white"
              onClick={() => openApplications(order.id)}
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
              onClick={() => handleOpenServiceSchedule()}
              type="button"
            >
              <CalendarClock size={15} />
              提交日程
            </button>
          ) : null}
          {!showParentTutorServiceScheduleAction &&
          (tutorSchedulePreviewConfig || showParentTutorCourseAction || (!tutorTask && order.canOpenTrialSchedule)) ? (
            <button
              className="secondary-button accent-text inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px]"
              onClick={() => setIsTrialScheduleOpen(true)}
              type="button"
            >
              <CalendarClock size={15} />
              {showParentTutorCourseAction ? "课程" : (tutorSchedulePreviewConfig?.buttonLabel ?? "日程")}
            </button>
          ) : null}
          {!showParentTutorCourseAction &&
          (tutorTask ? tutorTask.can("openTrialList") : order.canOpenTutorTrialList) ? (
            <button
              className="primary-button ongoing-action-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white"
              onClick={() => openTrialList(order.id)}
              type="button"
            >
              <CalendarClock size={15} />
              试课申请
              {typeof order.trialCount === "number" ? (
                <span className="ongoing-action-badge">{order.trialCount}</span>
              ) : null}
            </button>
          ) : null}
          {order.canAgreeTrial && category !== "tutor" ? (
            <button
              className="primary-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white"
              onClick={() => showLocalTutorWorkflowMessage("已同意试课，家教兼职进入试课流程。")}
              type="button"
            >
              同意试课
            </button>
          ) : null}
          {(tutorTask ? tutorTask.can("openTrialResult") : order.canOpenTrialResult) ? (
            <button
              className="primary-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white"
              onClick={() => setIsTrialResultOpen(true)}
              type="button"
            >
              {tutorTask?.node === "settlementConfirming" ? "结算确认" : "试课结果"}
            </button>
          ) : null}
          {tutorTask?.can("cancelServiceConfirmation") ? (
            <button
              className="text-button danger inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px]"
              onClick={() =>
                onOpenCancelConfirmation({
                  confirmLabel: "确认取消",
                  description: "取消后流程将回到试课结算阶段，需要重新处理正式雇佣确认。",
                  onConfirm: () => void handlers.onTutorWorkflowAction?.(order, "cancel_service_confirmation"),
                  title: "取消兼职确认"
                })
              }
              type="button"
            >
              取消兼职确认
            </button>
          ) : null}
          {tutorTask?.can("acceptServiceOffer") ? (
            <button
              className="primary-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white"
              onClick={() => handleOpenServiceAvailability("accept_service_offer")}
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
              className="ghost-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-[var(--h5-muted)]"
              onClick={() => handleOpenServiceAvailability("request_service_schedule_change")}
              type="button"
            >
              修改可家教日期
            </button>
          ) : null}
          {tutorTask?.can("requestServiceEnd") ? (
            <button
              className="danger-outline-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px]"
              onClick={() => {
                if (order.role === "parent") {
                  setIsServiceSettlementOpen(true);
                  return;
                }

                handlers.onTutorWorkflowAction?.(tutorWorkflowTargetOrder, "request_service_end");
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
              className="text-button danger inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px]"
              disabled={cancelTutorApplicationMutation.isPending}
              onClick={() =>
                onOpenCancelConfirmation({
                  confirmLabel: "确认取消",
                  description: "取消后本次试课申请结束，家长端会按真实状态刷新。",
                  onConfirm: () => void handleCancelTutorApplication(),
                  title: "取消申请"
                })
              }
              type="button"
            >
              取消申请
            </button>
          ) : null}
          {(tutorTask ? tutorTask.can("cancelDemand") : order.canRequestCancel) ? (
            <button
              className="text-button danger inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px]"
              onClick={() =>
                onOpenCancelConfirmation({
                  confirmLabel: category === "tutor" ? "确认取消发布" : "确认取消",
                  description:
                    category === "tutor"
                      ? "取消发布后家教兼职回到待发布状态，学生端不可继续申请。"
                      : "取消后当前事项将进入取消流程，请确认后继续。",
                  onConfirm: () => void handlers.onRequestCancel?.(order),
                  title: category === "tutor" ? "取消发布家教兼职" : "取消事项"
                })
              }
              type="button"
            >
              {category === "tutor" ? "取消发布" : "取消"}
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
              className="text-button danger inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px]"
              onClick={() =>
                onOpenCancelConfirmation({
                  confirmLabel: "确认取消",
                  description: "确认后当前取消流程会提交到真实接口并刷新进行中列表。",
                  onConfirm: () => void handlers.onConfirmCancel?.(order),
                  title: "确认取消"
                })
              }
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
        </>
      ) : null}
      {isTrialScheduleOpen ? (
        <TrialSchedulePreview
          onClose={() => setIsTrialScheduleOpen(false)}
          onConfirmTrial={handlers.onConfirmTutorTrialStart}
          onTutorWorkflowAction={handlers.onTutorWorkflowAction}
          order={order}
          role={order.role}
        />
      ) : null}
      {isTrialResultOpen ? (
        <TrialSettlementConfirm
          onClose={() => setIsTrialResultOpen(false)}
          onTutorWorkflowAction={handlers.onTutorWorkflowAction}
          order={order}
        />
      ) : null}
      {isServiceSettlementOpen ? (
        <ServiceSettlement
          onClose={() => setIsServiceSettlementOpen(false)}
          onConfirm={handleConfirmServiceSettlement}
          order={tutorWorkflowTargetOrder}
        />
      ) : null}
      {isServiceScheduleOpen ? (
        <Modal
          ariaLabel="正式雇佣日程"
          icon={<CalendarClock size={18} />}
          onClose={() => setIsServiceScheduleOpen(false)}
          panelClassName="trial-schedule-sheet mx-auto grid max-h-[min(82vh,700px)] max-w-[540px] gap-[12px] overflow-hidden px-[14px] pb-[calc(14px+env(safe-area-inset-bottom))] pt-[14px]"
          title={
            <>
              <strong>正式雇佣日程</strong>
              <span>请在学生提交的可家教时间内制定正式雇佣日程，提交后直接进入正式雇佣。</span>
            </>
          }
        >
          <CalendarTime
            availableScheduleSummary={getTutorTrialAvailabilitySummaryFromOrderDetail(tutorWorkflowTargetOrder.detail)}
            blockedScheduleLabel="试"
            blockedScheduleSummary={getTutorTrialScheduleSummaryFromOrderDetail(tutorWorkflowTargetOrder.detail)}
            confirmLabel={isSubmittingServiceSchedule ? "提交中" : "提交日程"}
            initialValue={null}
            isConfirming={isSubmittingServiceSchedule}
            maxPlannedDates={null}
            onClose={() => setIsServiceScheduleOpen(false)}
            onConfirm={handleConfirmServiceSchedule}
            scheduleLabel="课"
          />
        </Modal>
      ) : null}
      {serviceAvailabilityAction ? (
        <Modal
          ariaLabel={serviceAvailabilityAction === "accept_service_offer" ? "可家教日期" : "修改可家教日期"}
          icon={<CalendarClock size={18} />}
          onClose={() => setServiceAvailabilityAction(null)}
          panelClassName="trial-schedule-sheet mx-auto grid max-h-[min(82vh,700px)] max-w-[540px] gap-[12px] overflow-hidden px-[14px] pb-[calc(14px+env(safe-area-inset-bottom))] pt-[14px]"
          title={
            <>
              <strong>{serviceAvailabilityAction === "accept_service_offer" ? "可家教日期" : "修改可家教日期"}</strong>
              <span>
                {serviceAvailabilityAction === "accept_service_offer"
                  ? "请基于已完成的试课日程选择可正式家教的日期和时间，标记为“试”的时段不可再次选择。"
                  : "请重新选择可进行正式家教的日期和时间，提交后等待家长重新制定正式雇佣日程。"}
              </span>
            </>
          }
        >
          <CalendarTime
            blockedScheduleLabel="试"
            blockedScheduleSummary={
              serviceAvailabilityAction === "accept_service_offer"
                ? getTutorTrialScheduleSummaryFromOrderDetail(order.detail)
                : ""
            }
            confirmLabel={
              isSubmittingServiceAvailability
                ? "提交中"
                : serviceAvailabilityAction === "accept_service_offer"
                  ? "同意并提交"
                  : "提交修改"
            }
            initialValue={
              serviceAvailabilityAction === "request_service_schedule_change"
                ? getTrialScheduleValueFromSummary(getTutorTrialAvailabilitySummaryFromOrderDetail(order.detail))
                : null
            }
            isConfirming={isSubmittingServiceAvailability}
            maxPlannedDates={null}
            onClose={() => setServiceAvailabilityAction(null)}
            onConfirm={handleConfirmServiceAvailability}
          />
        </Modal>
      ) : null}
    </>
  );
}
