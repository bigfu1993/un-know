/** 狩猎快捷入口属性，调用方只提供开合状态和真实业务动作。 */
export interface HuntingShortcutProps {
  areaOptions: string[];
  initialProject: import("@app-types/hunting-project").HuntingProject | null;
  isEnabled: boolean;
  isProjectOpen: boolean;
  isRecommendationOpen: boolean;
  onCloseProject: () => void;
  onCloseRecommendation: () => void;
  onDisable: () => void;
  onOpen: () => void;
  onSubmitProject: (draft: import("@app-types/hunting-project").HuntingProjectDraft) => void;
  recommendedTasks: import("@unknown/domain").HuntingTask[];
}

/** 悬浮头像弹窗属性。 */
export interface MineProps {
  onClose: () => void;
  onLogout: () => void;
  onNavigate: (surface: import("@app-types/app").PageSurface) => void;
  onOpenTab: (tab: import("@unknown/domain").ClientModuleKey) => void;
  onToggleTutorExposure: () => void;
  walletSummary: import("@unknown/domain").WalletSummary;
}

/** 我的悬浮头像入口属性，弹窗内容由插槽传入。 */
export interface MineShortcutProps {
  children: import("react").ReactNode;
  isOpen: boolean;
  isQuickDockExpanded: boolean;
  onTrigger: () => void;
}

/** 进行中快捷按钮属性，仅维护悬浮入口自身状态。 */
export interface OngoingShortcutProps {
  hasPaymentRisk: boolean;
  isOpen: boolean;
  onOpen: () => void;
  orderCount: number;
}

/** 委托履约动作由进行中弹窗按按钮语义映射到真实业务 action。 */
export type OngoingHuntingFulfillmentAction = import("@unknown/domain").HuntingTaskFulfillmentActionRequest["action"];

/** 进行中事项弹窗属性，调用方提供真实业务动作。 */
export interface OngoingOrdersProps {
  maxHeight?: string;
  orders: import("@unknown/domain").ClientOrder[];
  onCancelTutorDemand?: (order: import("@unknown/domain").ClientOrder) => void;
  onClose: () => void;
  onConfirmTutorTrialStart?: (order: import("@unknown/domain").ClientOrder) => void;
  onHuntingFulfillmentAction?: (
    order: import("@unknown/domain").ClientOrder,
    action: OngoingHuntingFulfillmentAction
  ) => Promise<unknown> | unknown;
  onOpenQuoteList?: (order: import("@unknown/domain").ClientOrder) => void;
  onRequestTutorTrialEnd?: (order: import("@unknown/domain").ClientOrder) => void;
  onSubmitTutorWorkflowAction?: (
    payload: import("@unknown/domain").TutorWorkflowActionRequest & { applicationId: string }
  ) => Promise<boolean> | boolean | void;
}

/** 首页悬浮操作区渲染模型，按入口拆分按钮状态和弹窗内容。 */
export interface FloatingActionsModel {
  hunting: HuntingShortcutProps;
  mine: {
    panel: MineProps;
    shortcut: Omit<MineShortcutProps, "children" | "isQuickDockExpanded">;
  };
  ongoing: {
    panel: OngoingOrdersProps;
    shortcut: Omit<OngoingShortcutProps, "orderCount">;
  };
  quickDockExpanded: boolean;
  role: import("@unknown/domain").Role;
}

/** 首页悬浮操作区组件属性。 */
export interface FloatingActionsProps {
  model: FloatingActionsModel;
}

/** 首页悬浮操作区 props hook 入参，只接收真实源数据、业务动作和受控状态。 */
export interface UseFloatingActionsPropsOptions {
  areaOptions: string[];
  closeHuntingShortcutOverlays: () => void;
  handleAvatarClick: () => void;
  hasPaymentRisk: boolean;
  huntingShortcutEnabled: boolean;
  huntingShortcutProject: import("@app-types/hunting-project").HuntingProject | null;
  isHuntingProjectOpen: boolean;
  isHuntingRecommendationOpen: boolean;
  isMineOpen: boolean;
  isOngoingOpen: boolean;
  isQuickDockExpanded: boolean;
  onCancelTutorDemand: NonNullable<OngoingOrdersProps["onCancelTutorDemand"]>;
  onConfirmTutorTrialStart: NonNullable<OngoingOrdersProps["onConfirmTutorTrialStart"]>;
  onCreateHuntingProject: HuntingShortcutProps["onSubmitProject"];
  onDisableHuntingShortcut: () => void;
  onHuntingFulfillmentAction: NonNullable<OngoingOrdersProps["onHuntingFulfillmentAction"]>;
  onLogout: () => void;
  onNavigate: MineProps["onNavigate"];
  onOpenHuntingShortcut: () => void;
  onOpenQuoteList: NonNullable<OngoingOrdersProps["onOpenQuoteList"]>;
  onOpenTab: MineProps["onOpenTab"];
  onRequestTutorTrialEnd: NonNullable<OngoingOrdersProps["onRequestTutorTrialEnd"]>;
  onSubmitTutorWorkflowAction: NonNullable<OngoingOrdersProps["onSubmitTutorWorkflowAction"]>;
  onToggleTutorExposure: () => void;
  ongoingOrders: import("@unknown/domain").ClientOrder[];
  recommendedHuntingTasks: import("@unknown/domain").HuntingTask[];
  role: import("@unknown/domain").Role;
  setIsHuntingRecommendationOpen: (value: boolean) => void;
  setIsMineOpen: (value: boolean) => void;
  setIsOngoingOpen: (value: boolean) => void;
  walletSummary: import("@unknown/domain").WalletSummary;
}
