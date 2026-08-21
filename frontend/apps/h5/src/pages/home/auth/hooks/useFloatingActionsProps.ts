/**
 * 组装首页悬浮操作区的组件契约，并把纯 UI 开关包装从 App.tsx 收敛到模块 owner。
 */
export function useFloatingActionsProps({
  areaOptions,
  closeHuntingShortcutOverlays,
  handleAvatarClick,
  hasPaymentRisk,
  huntingShortcutEnabled,
  huntingShortcutProject,
  isHuntingProjectOpen,
  isHuntingRecommendationOpen,
  isMineOpen,
  isOngoingOpen,
  isQuickDockExpanded,
  onCancelTutorDemand,
  onConfirmTutorTrialStart,
  onCreateHuntingProject,
  onDisableHuntingShortcut,
  onHuntingFulfillmentAction,
  onLogout,
  onNavigate,
  onOpenHuntingShortcut,
  onOpenQuoteList,
  onOpenTab,
  onRequestTutorTrialEnd,
  onSubmitTutorWorkflowAction,
  onToggleTutorExposure,
  ongoingOrders,
  recommendedHuntingTasks,
  role,
  setIsHuntingRecommendationOpen,
  setIsMineOpen,
  setIsOngoingOpen,
  walletSummary
}: UseFloatingActionsPropsOptions): FloatingActionsProps {
  const closeHuntingRecommendation = useCallback(() => {
    setIsHuntingRecommendationOpen(false);
  }, [setIsHuntingRecommendationOpen]);
  const closeMine = useCallback(() => {
    setIsMineOpen(false);
  }, [setIsMineOpen]);
  const closeOngoing = useCallback(() => {
    setIsOngoingOpen(false);
  }, [setIsOngoingOpen]);
  const openOngoing = useCallback(() => {
    setIsOngoingOpen(true);
    setIsMineOpen(false);
  }, [setIsMineOpen, setIsOngoingOpen]);

  const model: FloatingActionsModel = {
    hunting: {
      areaOptions,
      initialProject: huntingShortcutProject,
      isEnabled: huntingShortcutEnabled,
      isProjectOpen: isHuntingProjectOpen,
      isRecommendationOpen: isHuntingRecommendationOpen,
      onCloseProject: closeHuntingShortcutOverlays,
      onCloseRecommendation: closeHuntingRecommendation,
      onDisable: onDisableHuntingShortcut,
      onOpen: onOpenHuntingShortcut,
      onSubmitProject: onCreateHuntingProject,
      recommendedTasks: recommendedHuntingTasks
    },
    mine: {
      panel: {
        onClose: closeMine,
        onLogout,
        onNavigate,
        onOpenTab,
        onToggleTutorExposure,
        walletSummary
      },
      shortcut: {
        isOpen: isMineOpen,
        onTrigger: handleAvatarClick
      }
    },
    ongoing: {
      panel: {
        onCancelTutorDemand,
        onClose: closeOngoing,
        onConfirmTutorTrialStart,
        onHuntingFulfillmentAction,
        onOpenQuoteList,
        onRequestTutorTrialEnd,
        onSubmitTutorWorkflowAction,
        orders: ongoingOrders
      },
      shortcut: {
        hasPaymentRisk,
        isOpen: isOngoingOpen,
        onOpen: openOngoing
      }
    },
    quickDockExpanded: isQuickDockExpanded,
    role
  };

  return { model };
}
