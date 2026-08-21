import {
  getTutorServiceScheduleSummaryFromOrderDetail,
  getTutorTrialAvailabilitySummaryFromOrderDetail,
  getTutorTrialOrderDisplayDetail,
  getTutorTrialScheduleSummaryFromOrderDetail
} from "@tools/tutorTrial";
import { createTutorTaskModel } from "@tools/tutorTaskWorkflow";

/** 进行中列表筛选类型。 */
export type OngoingOrderFilter = "all" | "delegation" | "featured" | "hunting" | "tutor";

/** 学生端提交正式家教可用时间时的流程动作。 */
export type TutorServiceAvailabilityAction = Extract<
  TutorWorkflowAction,
  "accept_service_offer" | "request_service_schedule_change"
>;

/** 学生端进行中家教卡片时间预览配置。 */
export interface TutorOrderSchedulePreviewConfig {
  allowConflictAction: boolean;
  buttonLabel: string;
  emptyLabel: string;
  sections: TutorSchedulePreviewSection[];
  subtitle: string;
  summary: string;
  title: string;
}

/** 家教日程预览中的一个阶段片段。 */
export interface TutorSchedulePreviewSection {
  label?: string;
  showScheduleLabel?: boolean;
  summary: string;
  title: string;
}

/** 进行中事项动作回调集合，由弹窗或页面注入业务处理。 */
export interface OngoingOrderActionHandlers {
  onConfirmCancel?: (order: ClientOrder) => void;
  onConfirmComplete?: (order: ClientOrder) => void;
  onConfirmTutorTrialStart?: (order: ClientOrder) => void;
  onOpenQuoteList?: (order: ClientOrder) => void;
  onRepublish?: (order: ClientOrder) => void;
  onTutorWorkflowAction?: (
    order: ClientOrder,
    action: TutorWorkflowAction,
    payload?: Partial<TutorWorkflowActionRequest>
  ) => Promise<boolean> | boolean | void;
  onRequestCancel?: (order: ClientOrder) => void;
  onRequestComplete?: (order: ClientOrder) => void;
}

/** 获取进行中事项分类，未标记的订单默认归入优选。 */
export function getOngoingOrderCategory(order: ClientOrder): Exclude<OngoingOrderFilter, "all"> {
  return order.category === "delegation" || order.category === "hunting" || order.category === "tutor"
    ? order.category
    : "featured";
}

/** 获取进行中卡片正文详情，家教试课卡片隐藏流程说明。 */
export function getOngoingOrderDisplayDetail(order: ClientOrder) {
  return getOngoingOrderCategory(order) === "tutor" ? getTutorTrialOrderDisplayDetail(order.detail) : order.detail;
}

/** 父端主任务动作需要落到当前正式雇佣的申请子任务。 */
export function getTutorWorkflowTargetOrder(order: ClientOrder) {
  return order.role === "parent" && order.quoteId ? { ...order, id: order.quoteId } : order;
}

/** 判断家长端主卡是否处于等待提交正式雇佣日程的状态。 */
export function isParentTutorServiceSchedulePending(order: ClientOrder) {
  return (
    order.role === "parent" &&
    getOngoingOrderCategory(order) === "tutor" &&
    Boolean(order.quoteId) &&
    Boolean(getTutorTrialAvailabilitySummaryFromOrderDetail(order.detail)) &&
    !getTutorServiceScheduleSummaryFromOrderDetail(order.detail)
  );
}

/** 过滤空日程片段，避免调用处为类型收窄创建 raw 中转变量。 */
export function compactTutorSchedulePreviewSections(
  sections: Array<TutorSchedulePreviewSection | null | undefined>
): TutorSchedulePreviewSection[] {
  return sections.filter((section): section is TutorSchedulePreviewSection => Boolean(section));
}

/** 获取学生端家教卡片的时间预览入口配置，正文只保留业务摘要。 */
export function getTutorOrderSchedulePreviewConfig(
  order: ClientOrder,
  tutorTask: ReturnType<typeof createTutorTaskModel>
): TutorOrderSchedulePreviewConfig | null {
  const trialScheduleSummary = getTutorTrialScheduleSummaryFromOrderDetail(order.detail);
  const serviceScheduleSummary = getTutorServiceScheduleSummaryFromOrderDetail(order.detail);
  const availabilitySummary = getTutorTrialAvailabilitySummaryFromOrderDetail(order.detail);

  if (tutorTask.node === "serviceSchedulePending") {
    const sections = compactTutorSchedulePreviewSections([
      availabilitySummary
        ? {
            showScheduleLabel: false,
            summary: availabilitySummary,
            title: "可家教时间"
          }
        : null,
      trialScheduleSummary
        ? {
            label: "试",
            showScheduleLabel: true,
            summary: trialScheduleSummary,
            title: "试课安排"
          }
        : null
    ]);

    return availabilitySummary
      ? {
          allowConflictAction: false,
          buttonLabel: "可家教时间",
          emptyLabel: "暂无可家教时间",
          sections,
          subtitle: "查看已提交给家长用于制定正式雇佣日程的可家教时间。",
          summary: availabilitySummary,
          title: "可家教时间"
        }
      : null;
  }

  if (tutorTask.node === "formalTutoring") {
    const sections = compactTutorSchedulePreviewSections([
      trialScheduleSummary
        ? {
            label: "试",
            showScheduleLabel: true,
            summary: trialScheduleSummary,
            title: "试课安排"
          }
        : null,
      serviceScheduleSummary
        ? {
            label: "课",
            showScheduleLabel: true,
            summary: serviceScheduleSummary,
            title: "课程安排"
          }
        : null
    ]);

    return {
      allowConflictAction: false,
      buttonLabel: "课程",
      emptyLabel: "暂无课程安排",
      sections,
      subtitle: order.role === "parent" ? "查看当前正式雇佣的课程安排。" : "查看家长提交的正式雇佣日程。",
      summary: serviceScheduleSummary || trialScheduleSummary,
      title: order.role === "parent" ? "课程安排" : "正式雇佣日程"
    };
  }

  return trialScheduleSummary
    ? {
        allowConflictAction: tutorTask.can("updateTrialAvailability"),
        buttonLabel: "日程",
        emptyLabel: "暂无试课安排",
        sections: [
          {
            label: "试",
            showScheduleLabel: true,
            summary: trialScheduleSummary,
            title: "试课安排"
          }
        ],
        subtitle: "查看家长提交的试课安排。",
        summary: trialScheduleSummary,
        title: "试课安排"
      }
    : null;
}

/** 判断进行中卡片是否存在常规履约动作。 */
export function hasOngoingOrderActions(order: ClientOrder): boolean {
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
