import { showMessage } from "@tools/messageToast";
import { createTutorTaskModel } from "@tools/tutorTaskWorkflow";
import {
  getOngoingOrderCategory,
  getTutorOrderSchedulePreviewConfig,
  getTutorWorkflowTargetOrder,
  hasOngoingOrderActions,
  isParentTutorServiceSchedulePending,
  type OngoingOrderActionHandlers,
  type OngoingOrderLocalActionHandlers
} from "../model";

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

/**
 * 渲染进行中事项的报价入口和履约动作，家教卡片和通用卡片共用同一套按钮渲染逻辑。
 * 家教专属的 6 个 handler（onCancelTutorApplication/onOpenServiceSchedule/onOpenServiceSettlement/
 * onOpenServiceAvailability/onOpenTrialResult/onOpenTrialSchedule）由调用方按需提供：
 * EduCard 传入自己内部的本地闭包，通用卡片行不传（对应按钮只在 tutorTask 存在时渲染，不会被调用）。
 */
export function OrderActions({
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

  /** 旧版非接口动作只给出本地反馈，不向父组件透传提示方法。 */
  function showLocalTutorWorkflowMessage(message: string) {
    showMessage(message, { type: "success" });
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
              onClick={() => handlers.onOpenServiceSchedule?.(getTutorWorkflowTargetOrder(order))}
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
              {showParentTutorCourseAction ? "课程" : tutorSchedulePreviewConfig?.buttonLabel ?? "日程"}
            </button>
          ) : null}
          {!showParentTutorCourseAction && (tutorTask ? tutorTask.can("openTrialList") : order.canOpenTutorTrialList) ? (
            <button
              className="primary-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white"
              onClick={() => handlers.onOpenTutorTrialList?.(order)}
              type="button"
            >
              <CalendarClock size={15} />
              试课申请
              {typeof order.trialCount === "number" ? (
                <span className="ongoing-action-badge">{order.trialCount}</span>
              ) : null}
            </button>
          ) : null}
          {(tutorTask ? tutorTask.can("rejectTrial") : order.canRejectTrial) ? (
            <button
              className="danger-outline-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px]"
              onClick={() => showLocalTutorWorkflowMessage("已拒绝试课申请。")}
              type="button"
            >
              拒绝
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
              onClick={() => handlers.onOpenTrialResult?.(order)}
              type="button"
            >
              {tutorTask?.node === "settlementConfirming" ? "结算确认" : "试课结果"}
            </button>
          ) : null}
          {tutorTask?.can("cancelServiceConfirmation") ? (
            <button
              className="text-button danger inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px]"
              onClick={() =>
                handlers.onOpenCancelConfirmation({
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
              onClick={() => handlers.onOpenServiceAvailability?.(order, "accept_service_offer")}
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
              onClick={() => handlers.onOpenServiceAvailability?.(order, "request_service_schedule_change")}
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
                  handlers.onOpenServiceSettlement?.(targetOrder);
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
              className="text-button danger inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px]"
              disabled={isCancellingTutorApplication}
              onClick={() =>
                handlers.onOpenCancelConfirmation({
                  confirmLabel: "确认取消",
                  description: "取消后本次试课申请结束，家长端会按真实状态刷新。",
                  onConfirm: () => void handlers.onCancelTutorApplication?.(order),
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
                handlers.onOpenCancelConfirmation({
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
                handlers.onOpenCancelConfirmation({
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
        </div>
      ) : null}
    </>
  );
}
