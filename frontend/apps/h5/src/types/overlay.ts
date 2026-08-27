/** 全局弹层所在的交互层级，同一层级同一时间只展示一个弹层。 */
export type OverlayLane = "primary" | "secondary" | "confirm";

/** 当前已接入全局调度器的弹层类型。 */
export type TutorOverlayType = "tutorApplications" | "tutorTrialList" | "tutorCalendar" | "tutorCertificationInfo";
export type PublishOverlayType = "publishInfo" | "publishDraftConfirm";
export type GlobalOverlayType = "checkout" | PublishOverlayType | TutorOverlayType;

/** 全局弹层调度器保存的最小目标信息。 */
export interface GlobalOverlayEntry {
  lane: OverlayLane;
  targetId?: string;
  type: GlobalOverlayType;
}

/** 全局弹层按交互层级保存的状态。 */
export interface OverlayState {
  confirm: GlobalOverlayEntry | null;
  primary: GlobalOverlayEntry | null;
  secondary: GlobalOverlayEntry | null;
}

/** 全局弹层状态机动作。 */
export type OverlayAction =
  | { entry: GlobalOverlayEntry; type: "open" }
  | { overlayType: GlobalOverlayType; type: "close" }
  | { overlayTypes: GlobalOverlayType[]; type: "closeMany" }
  | { type: "closeAll" };

/** 全局弹层调度器对业务域公开的稳定命令。 */
export interface OverlayActions {
  closeAllOverlays: () => void;
  closeOverlay: (overlayType: GlobalOverlayType) => void;
  closeOverlays: (overlayTypes: GlobalOverlayType[]) => void;
  openOverlay: (entry: GlobalOverlayEntry) => void;
}

/** 全局弹层 Provider 入参。 */
export interface OverlayProviderProps {
  children: ReactNode;
}

/** 购买确认弹层维护的业务草稿。 */
export interface CheckoutState {
  deliveryMode: DeliveryMode;
  paymentMethod: PaymentMethod;
  product: ProductSummary;
}

/** 购买确认弹层对展示组件公开的状态。 */
export interface CheckoutOverlayState {
  checkout: CheckoutState | null;
  purchasePending: boolean;
  role: Role;
}

/** 购买确认弹层对触发组件公开的稳定命令。 */
export interface CheckoutOverlayActions {
  closeCheckout: () => void;
  setDeliveryMode: (deliveryMode: DeliveryMode) => void;
  setPaymentMethod: (paymentMethod: PaymentMethod) => void;
  submitCheckout: () => void;
}

/** 商品入口只订阅打开命令和提交占用状态，避免被表单编辑态更新。 */
export interface CheckoutTriggerContextValue {
  openCheckout: (product: ProductSummary) => void;
  purchasePending: boolean;
}

/** 购买确认业务域 Provider 入参。 */
export interface CheckoutProviderProps {
  children: ReactNode;
  currentAddressDraft: ProfileDraftState;
  onOpenProfileCompletion: () => void;
  onOrderCreated: () => void;
  role: Role;
}

/** 家教弹层触发组件使用的稳定命令。 */
export interface TutorOverlayActions {
  closeApplications: () => void;
  closeCalendar: () => void;
  closeCertificationInfo: () => void;
  closeTrialList: () => void;
  closeTutorOverlays: () => void;
  openApplications: (demandId: string) => void;
  openCalendar: () => void;
  openCertificationInfo: () => void;
  openTrialList: (demandId: string) => void;
}

/** 当前家教弹层及其目标需求。 */
export interface TutorOverlayState {
  activeType: TutorOverlayType | null;
  isApplicationsOpen: boolean;
  isCalendarOpen: boolean;
  isCertificationInfoOpen: boolean;
  isTrialListOpen: boolean;
  targetDemandId: string | null;
}

/** 家教 Host 消费的真实数据、提交状态和业务动作。 */
export interface TutorOverlayHostContextValue {
  applicationCandidates: TutorApplicationCandidate[];
  applicationConfirmationPending: boolean;
  calendarTasks: TutorCalendarTask[];
  confirmTrial: (payload: ConfirmTutorTrialPayload) => void;
  confirmTrialEnd: (payload: CompleteTutorTrialEndPayload) => void;
  /** 当前弹层目标家教需求发布时选择的日期集合（计划范围），供试课安排弹窗回显参考，缺省为空数组。 */
  plannedDates: string[];
  profileDraft: ProfileDraftState;
  saveCertificationInfo: (nextProfileDraft: ProfileDraftState, mode: TutorCertificationInfoSaveMode) => void;
  trialListSubmissionPending: boolean;
  workflow: (payload: TutorWorkflowActionPayload) => Promise<boolean>;
}

/** 家教 Overlay 业务 Provider 入参。 */
export interface TutorOverlayProviderProps {
  children: ReactNode;
  syncProfileDraft: (draft: ProfileDraftState) => void;
}

/** 家长端试课列表卡片时间预览弹窗状态，TutorTrialList 组装、TutorSchedulePreview 消费。 */
export interface TutorSchedulePreviewState {
  buttonLabel: string;
  emptyLabel: string;
  sections: TutorSchedulePreviewSection[];
  subtitle: string;
  summary: string;
  title: string;
}

/** 家长端日程预览中的阶段片段。 */
export interface TutorSchedulePreviewSection {
  label?: string;
  showScheduleLabel?: boolean;
  summary: string;
  title: string;
}

/** 家长端提交结算金额时支持的流程动作，TutorTrialList 触发、TutorTrialSettlement 消费。 */
export type TutorSettlementAction = Extract<
  TutorWorkflowAction,
  "confirm_trial_end" | "request_service_end" | "request_trial_result"
>;

/** 家长端试课结算提交载荷。 */
export interface TutorTrialSettlementPayload {
  hireTutor?: boolean;
  trialFee: number;
}
