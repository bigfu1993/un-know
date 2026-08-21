import { useGlobalStore, useGlobalUser } from "@h5/store/global";
import { isAuthSessionExpiredError } from "@unknown/api-client";
import { useOngoingOrdersRealtime } from "@unknown/hooks";
import { useAuthSessionFlow } from "@h5/hooks/useAuthSessionFlow";
import { useCertificationInfoFlow } from "@h5/hooks/useCertificationInfoFlow";
import { useClientBusinessMutations } from "@h5/hooks/useClientBusinessMutations";
import { useClientDataQueries } from "@h5/hooks/useClientDataQueries";
import { useClientWorkspaceViewModel } from "@h5/hooks/useClientWorkspaceViewModel";
import { useHuntingShortcutFlow } from "@h5/hooks/useHuntingShortcutFlow";
import { useOverlayController } from "@h5/hooks/useOverlayController";
import { useProfileCompletionFlow } from "@h5/hooks/useProfileCompletionFlow";
import { usePrimaryTabWorkspaceRefresh } from "@h5/hooks/usePrimaryTabWorkspaceRefresh";
import { useRootNavigation } from "@h5/hooks/useRootNavigation";
import { CheckoutProvider } from "@h5/overlays/checkout/provider";
import { GlobalOverlayHost } from "@h5/overlays/host";
import { PublishOverlayProvider } from "@h5/overlays/publish/provider";
import { TutorOverlayProvider } from "@h5/overlays/tutor/provider";
import { ClientRoutes } from "@h5/router/ClientRoutes";
import { getDefaultRouteForRole, getRouteForTab, getTabFromRoute } from "@h5/router/paths";
import { OngoingQuote } from "@pages/home/commission/components/OngoingQuote";
import { useHuntingTaskActions } from "@pages/home/commission/hooks/useHuntingTaskActions";
import { useOngoingQuoteFlow } from "@pages/home/commission/hooks/useOngoingQuoteFlow";
import { HuntingCertification } from "@pages/home/auth/components/Mine/components/HuntingCertification";
import { TutorCertification } from "@pages/home/auth/components/Mine/components/TutorCertification";
import {
  DataErrorScreen,
  InitialLoadingScreen,
  UnauthenticatedScreen
} from "@pages/home/auth/components/AppStateScreens";
import { FloatingActions } from "@pages/home/auth";
import { useFloatingActionsProps } from "@pages/home/auth/hooks/useFloatingActionsProps";
import { useTutorTrialActions } from "@pages/home/edu/hooks/useTutorTrialActions";
import { campusAreaOptions, clientAddressesToAddressBookItems } from "@shared/clientPageModel";
import { hideMessage, showMessage } from "@tools/messageToast";

/** H5 根组件，负责登录态、角色数据、路由栈和全局弹窗编排。 */
export function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useGlobalUser();
  const setUserSession = useGlobalStore((state) => state.setUserSession);
  const syncUserProfile = useGlobalStore((state) => state.syncUserProfile);
  const setUserProfileDraft = useGlobalStore((state) => state.setUserProfileDraft);
  const clearUser = useGlobalStore((state) => state.clearUser);
  const role = user.role;
  const isAuthenticated = user.isAuthenticated;
  useOngoingOrdersRealtime({
    enabled: isAuthenticated,
    sessionKey: user.session?.accessToken
  });
  const {
    activePage,
    activeTab,
    back: navigateBack,
    isMineRoute,
    isSettingsRoute,
    navigatePage,
    openTab,
    pageMeta,
    resetForRole,
    setActiveTab,
    setPageStack,
    settingsBackRoute,
    syncRouteTab
  } = useRootNavigation({
    locationPathname: location.pathname,
    locationState: location.state,
    navigate,
    role
  });
  // 需要在 useClientDataQueries 之前就绪（判断是否要连带查委托/狩猎数据），状态本身留在这里，
  // 具体开启/关闭/创建项目的行为编排收在 useHuntingShortcutFlow。
  const [isHuntingShortcutEnabled, setIsHuntingShortcutEnabled] = useState(false);
  const [huntingShortcutProject, setHuntingShortcutProject] = useState<HuntingProject | null>(null);
  const {
    closeHuntingShortcutOverlays,
    closeRouteOverlays,
    handleAvatarClick,
    isHuntingProjectOpen,
    isHuntingRecommendationOpen,
    isMineOpen,
    isOngoingOpen,
    isQuickDockExpanded,
    setIsHuntingProjectOpen,
    setIsHuntingRecommendationOpen,
    setIsMineOpen,
    setIsOngoingOpen,
    setIsQuickDockExpanded
  } = useOverlayController();
  // 角色级数据在路由间共享，页面局部筛选保留在各页面模块内。
  const {
    addressError,
    clientAddresses,
    homeData,
    homeError,
    huntingTasksError,
    huntingTasksResponse,
    isAddressLoading,
    isHomeLoading,
    isPartTimeJobsFetching,
    isTutorCertifiedStudentsFetching,
    isWorkspaceFetching,
    ongoingOrdersError,
    ongoingOrdersResponse,
    orderHistoryError,
    orderHistoryResponse,
    partTimeJobsError,
    partTimeJobsResponse,
    refetchHome,
    refetchHuntingTasks,
    refetchOngoingOrders,
    refetchOrderHistory,
    refetchPartTimeJobs,
    refetchTutorCertifiedStudents,
    refetchWorkspace,
    tutorCertifiedStudentsError,
    tutorCertifiedStudentsResponse,
    workspaceError,
    workspaceResponse
  } = useClientDataQueries({
    isAuthenticated,
    // 委托页自己订阅任务查询；根层只为悬浮推荐、进行中和订单历史保留共享 observer。
    isHuntingDataNeeded:
      isHuntingRecommendationOpen ||
      isHuntingProjectOpen ||
      isHuntingShortcutEnabled ||
      isOngoingOpen ||
      activePage === "orders",
    // 进行中：只在悬浮"进行中"弹窗打开时才需要，弹窗徽标数字在首次打开前不准确（已知体验取舍）。
    isOngoingOrdersNeeded: isOngoingOpen,
    // 订单历史：只在订单历史页激活时才需要。
    isOrderHistoryNeeded: activePage === "orders",
    // 兼职：家教是兼职的一种类型，兼职 tab 激活时学生角色会连带查到招募中的家教需求。
    isPartTimeTabActive: activeTab === "partTime",
    // 家长可浏览认证学生列表：家教 tab 激活时才需要。
    isTutorCertifiedStudentsNeeded: activeTab === "tutor",
    // 工作台聚合（钱包/商户看板/商户商品）：我的弹窗、钱包页、兼职 tab（商户看板）或商户经营 tab 任一激活时才需要。
    isWorkspaceNeeded:
      isMineOpen || activePage === "wallet" || activeTab === "partTime" || activeTab === "merchantSales",
    role,
    sessionKey: user.session?.accessToken
  });
  const {
    applyTutorTrialMutation,
    cancelTutorDemandMutation,
    confirmTutorTrialStartMutation,
    createAddressMutation,
    createHuntingProjectMutation,
    decideHuntingTaskQuoteMutation,
    huntingTaskFulfillmentActionMutation,
    requestTutorTrialEndMutation,
    tutorWorkflowActionMutation,
    updateAddressMutation,
    updateTutorExposureMutation
  } = useClientBusinessMutations();
  const addressItems = useMemo(() => clientAddressesToAddressBookItems(clientAddresses), [clientAddresses]);
  /** 刷新工作台聚合数据和已拆分的业务列表。 */
  const refetchWorkspaceData = useCallback(() => {
    void refetchWorkspace();
    void refetchOngoingOrders();
    void refetchOrderHistory();
    void refetchPartTimeJobs();
    void refetchHuntingTasks();
    void refetchTutorCertifiedStudents();
  }, [
    refetchHuntingTasks,
    refetchOngoingOrders,
    refetchOrderHistory,
    refetchPartTimeJobs,
    refetchTutorCertifiedStudents,
    refetchWorkspace
  ]);
  /** 主导航切换时只刷新当前页面真正使用的数据接口。 */
  const refetchPrimaryTabData = useCallback(() => {
    if (activeTab === "partTime") {
      void refetchPartTimeJobs();
      return;
    }

    if (activeTab === "tutor") {
      void refetchTutorCertifiedStudents();
      return;
    }

    void refetchWorkspace();
  }, [activeTab, refetchPartTimeJobs, refetchTutorCertifiedStudents, refetchWorkspace]);
  const {
    changeProfileDraft: handleProfileDraftChange,
    currentAddressDraft,
    isProfileCompletionOpen,
    openProfileCompletion,
    profileCompletionTemplate,
    profileDraft,
    profileRequirement,
    resetProfileDraftForPhone,
    saveProfileDraft: handleSaveProfileDraft,
    setIsProfileCompletionOpen,
    syncProfileDraft
  } = useProfileCompletionFlow({
    activeTab,
    addressItems,
    createAddress: (payload, callbacks) => createAddressMutation.mutate(payload, callbacks),
    isSaving: createAddressMutation.isPending || updateAddressMutation.isPending,
    refetchHome: () => {
      void refetchHome();
    },
    role,
    setUserProfileDraft,
    showMessage,
    updateAddress: (payload, callbacks) => updateAddressMutation.mutate(payload, callbacks),
    userPhone: user.phone,
    userProfileDraft: user.profileDraft
  });
  const handleBeforeOpenPublish = useCallback(() => {
    closeRouteOverlays();
    setIsProfileCompletionOpen(false);
  }, [closeRouteOverlays, setIsProfileCompletionOpen]);
  const handlePublishedToTab = useCallback(
    (tab: ClientModuleKey) => {
      setActiveTab(tab);
      setPageStack([]);
      navigate(getRouteForTab(tab));
    },
    [navigate, setActiveTab, setPageStack]
  );

  const {
    hasPaymentRisk,
    huntingTasks,
    ongoingOrders,
    orderDetailOrders,
    partTimeJobs,
    recommendedHuntingTasks,
    roleOrders,
    tutorTrialJobs
  } = useClientWorkspaceViewModel({
    huntingShortcutProject,
    role,
    workspaceData: {
      huntingTasks: huntingTasksResponse,
      orders: ongoingOrdersResponse,
      orderHistory: orderHistoryResponse,
      partTimeJobs: partTimeJobsResponse
    }
  });
  const {
    closeOngoingQuoteList: handleCloseOngoingQuoteList,
    ongoingQuoteInitialQuoteId,
    ongoingQuoteTask,
    openOngoingQuoteList: handleOpenOngoingQuoteList
  } = useOngoingQuoteFlow({
    showMessage,
    tasks: huntingTasks
  });
  const {
    handleConfirmHuntingQuote,
    handleCounterHuntingQuote,
    handleHuntingTaskFulfillmentAction,
    handleRejectHuntingQuote
  } = useHuntingTaskActions({
    decideQuote: (payload) => decideHuntingTaskQuoteMutation.mutateAsync(payload),
    fulfillmentAction: (payload) => huntingTaskFulfillmentActionMutation.mutateAsync(payload),
    huntingTasks,
    showMessage
  });
  const {
    handleApplyTutorTrial,
    handleCancelTutorDemand,
    handleConfirmTutorTrialStart,
    handleRequestTutorTrialEnd,
    handleTutorWorkflowAction
  } = useTutorTrialActions({
    applyTutorTrial: (demandId) => applyTutorTrialMutation.mutateAsync(demandId),
    cancelTutorDemand: (demandId) => cancelTutorDemandMutation.mutateAsync(demandId),
    handleTutorWorkflowAction: (payload) => tutorWorkflowActionMutation.mutateAsync(payload),
    confirmTutorTrialStart: (applicationId) => confirmTutorTrialStartMutation.mutateAsync(applicationId),
    openOngoingOrders: () => setIsOngoingOpen(true),
    refetchWorkspace: refetchWorkspaceData,
    requestTutorTrialEnd: (applicationId) => requestTutorTrialEndMutation.mutateAsync(applicationId),
    showMessage
  });
  const { handleCreateHuntingProject, handleDisableHuntingShortcut, handleOpenHuntingShortcut, resetHuntingShortcut } =
    useHuntingShortcutFlow({
      createHuntingProjectMutation,
      currentAddressDraft,
      isHuntingShortcutEnabled,
      navigate,
      refetchHuntingTasks,
      role,
      setActiveTab,
      setHuntingShortcutProject,
      setIsHuntingProjectOpen,
      setIsHuntingRecommendationOpen,
      setIsHuntingShortcutEnabled,
      setIsMineOpen,
      setIsOngoingOpen,
      setIsProfileCompletionOpen,
      setPageStack,
      showMessage
    });
  const { handleLoginSuccess, handleLogout, resetAuthenticatedSession } = useAuthSessionFlow({
    clearUser,
    closeRouteOverlays,
    hideMessage,
    navigate,
    resetForRole,
    resetHuntingShortcut,
    resetProfileDraftForPhone,
    setIsProfileCompletionOpen,
    setUserSession,
    showMessage
  });
  const { handleHuntingCertificationSubmitted, handleToggleTutorExposure, handleTutorCertificationSubmitted } =
    useCertificationInfoFlow({
      activeTab,
      closeHuntingShortcutOverlays,
      navigate,
      refetchHome,
      refetchTutorCertifiedStudents,
      setIsMineOpen,
      setIsOngoingOpen,
      setIsQuickDockExpanded,
      setPageStack,
      showMessage,
      syncProfileDraft,
      updateTutorExposureMutation,
      userProfileDraft: user.profileDraft
    });
  const floatingActionsProps = useFloatingActionsProps({
    areaOptions: campusAreaOptions,
    closeHuntingShortcutOverlays,
    handleAvatarClick,
    hasPaymentRisk,
    huntingShortcutEnabled: isHuntingShortcutEnabled,
    huntingShortcutProject,
    isHuntingProjectOpen,
    isHuntingRecommendationOpen,
    isMineOpen,
    isOngoingOpen,
    isQuickDockExpanded,
    onCancelTutorDemand: handleCancelTutorDemand,
    onConfirmTutorTrialStart: handleConfirmTutorTrialStart,
    onCreateHuntingProject: handleCreateHuntingProject,
    onDisableHuntingShortcut: handleDisableHuntingShortcut,
    onHuntingFulfillmentAction: handleHuntingTaskFulfillmentAction,
    onLogout: handleLogout,
    onNavigate: handleNavigate,
    onOpenHuntingShortcut: handleOpenHuntingShortcut,
    onOpenQuoteList: handleOpenOngoingQuoteList,
    onOpenTab: handleOpenTab,
    onRequestTutorTrialEnd: handleRequestTutorTrialEnd,
    onSubmitTutorWorkflowAction: handleTutorWorkflowAction,
    onToggleTutorExposure: handleToggleTutorExposure,
    ongoingOrders,
    recommendedHuntingTasks,
    role,
    setIsHuntingRecommendationOpen,
    setIsMineOpen,
    setIsOngoingOpen,
    walletSummary: workspaceResponse.walletSummary
  });
  const dataError =
    homeError ??
    workspaceError ??
    ongoingOrdersError ??
    orderHistoryError ??
    partTimeJobsError ??
    huntingTasksError ??
    tutorCertifiedStudentsError ??
    addressError;
  // 进行中/兼职/委托-狩猎/家教/工作台这 5 类业务查询已改为按 tab、弹窗等真实消费场景按需加载，
  // 不再统一预加载，因此不计入首屏阻塞态；只有首页角色资料和地址簿是渲染整个 App 外壳必需的基础数据。
  const isInitialDataLoading = isHomeLoading || isAddressLoading;
  usePrimaryTabWorkspaceRefresh({
    activePage,
    activeTab,
    isAuthenticated,
    isMineRoute,
    isSettingsRoute,
    isWorkspaceFetching: isWorkspaceFetching || isPartTimeJobsFetching || isTutorCertifiedStudentsFetching,
    refetchWorkspace: refetchPrimaryTabData
  });

  function handleOpenTab(tab: ClientModuleKey) {
    openTab(tab);
    closeRouteOverlays();
    setIsProfileCompletionOpen(false);
  }

  function handleNavigate(page: PageSurface) {
    navigatePage(page);
    closeRouteOverlays();
    setIsProfileCompletionOpen(false);
  }

  function handleBack() {
    navigateBack();
    closeRouteOverlays();
    setIsProfileCompletionOpen(false);
  }

  function handleOpenProfileCompletion() {
    closeRouteOverlays();
    openProfileCompletion();
  }

  useEffect(() => {
    if (!isAuthenticated || !isAuthSessionExpiredError(dataError)) {
      return;
    }

    resetAuthenticatedSession("expired");
  }, [dataError, isAuthenticated, resetAuthenticatedSession]);

  useEffect(() => {
    if (isAuthenticated && homeData?.profile) {
      syncUserProfile(homeData.profile);
    }
  }, [homeData?.profile, isAuthenticated, syncUserProfile]);

  // 浏览器路由驱动当前模块，activeTab 只镜像主模块路由。
  useEffect(() => {
    if (!isAuthenticated) {
      if (location.pathname !== "/login") {
        navigate("/login", { replace: true });
      }
      return;
    }

    if (location.pathname === "/" || location.pathname === "/login") {
      navigate(getDefaultRouteForRole(role), { replace: true });
      return;
    }

    const routeTab = getTabFromRoute(location.pathname);
    if (routeTab && routeTab !== activeTab) {
      syncRouteTab(routeTab);
      closeRouteOverlays();
      setIsProfileCompletionOpen(false);
    }
  }, [
    activeTab,
    closeRouteOverlays,
    isAuthenticated,
    location.pathname,
    navigate,
    role,
    setIsProfileCompletionOpen,
    syncRouteTab
  ]);

  if (!isAuthenticated) {
    return <UnauthenticatedScreen onLoginSuccess={handleLoginSuccess} />;
  }

  if (dataError) {
    return <DataErrorScreen error={dataError} onLogout={handleLogout} />;
  }

  // workspaceResponse 已有稳定空值兜底，不再作为 App 外壳阻塞条件——工作台聚合数据现在按需加载，
  // 不能因为它还没被任何 tab/弹窗触发就把整个 App 卡在加载页。
  if (!homeData || isInitialDataLoading) {
    return <InitialLoadingScreen />;
  }

  const workspaceData = {
    ...workspaceResponse,
    huntingTasks: huntingTasksResponse,
    partTimeJobs
  };
  const hasPrimaryContextCard = Boolean(profileRequirement) && !activePage && !isSettingsRoute && !isMineRoute;
  const isPrimaryListShell =
    (activeTab === "featured" || activeTab === "partTime") && !activePage && !isSettingsRoute && !isMineRoute;

  return (
    <CheckoutProvider
      currentAddressDraft={currentAddressDraft}
      onOpenProfileCompletion={handleOpenProfileCompletion}
      onOrderCreated={() => handleNavigate("orders")}
      role={role}
    >
      <TutorOverlayProvider syncProfileDraft={syncProfileDraft}>
        <PublishOverlayProvider
          addressItems={addressItems}
          onBeforeOpen={handleBeforeOpenPublish}
          onPublishedToTab={handlePublishedToTab}
          refetchWorkspace={refetchWorkspaceData}
        >
          <main
            className={`h5-shell mx-auto min-h-screen max-w-[540px] px-[14px] pt-[14px] text-[#17212b] ${
              activePage || isSettingsRoute || isMineRoute
                ? "page-mode pb-[28px]"
                : "pb-[calc(92px+env(safe-area-inset-bottom))]"
            } ${activeTab === "hunting" && !activePage && !isSettingsRoute && !isMineRoute ? "commission-shell" : ""} ${
              isPrimaryListShell ? "list-shell" : ""
            } ${hasPrimaryContextCard ? "has-context-card" : "no-context-card"}`}
          >
            {activePage && pageMeta ? (
              <PageShell eyebrow={pageMeta.eyebrow} onBack={handleBack} title={pageMeta.title}>
                {activePage === "wallet" ? (
                  <Wallet walletRecords={workspaceData.walletRecords} walletSummary={workspaceData.walletSummary} />
                ) : activePage === "orders" ? (
                  <Orders
                    onRepublishDelegation={(order) => void handleHuntingTaskFulfillmentAction(order, "republish")}
                    orders={orderDetailOrders}
                  />
                ) : activePage === "tutorCertification" ? (
                  <TutorCertification
                    onBack={handleBack}
                    onSubmitError={(error) =>
                      showMessage(getErrorMessage(error, "家教认证提交失败，请稍后重试。"), { type: "error" })
                    }
                    onSubmitted={handleTutorCertificationSubmitted}
                  />
                ) : activePage === "huntingCertification" ? (
                  <HuntingCertification
                    onBack={handleBack}
                    onSubmitError={(error) =>
                      showMessage(getErrorMessage(error, "狩猎认证提交失败，请稍后重试。"), { type: "error" })
                    }
                    onSubmitted={handleHuntingCertificationSubmitted}
                  />
                ) : null}
              </PageShell>
            ) : isMineRoute ? (
              <Mine
                onBack={() => navigate(getRouteForTab(activeTab), { replace: true })}
                onLogout={handleLogout}
                onNavigate={handleNavigate}
                orders={roleOrders}
                walletSummary={workspaceData.walletSummary}
              />
            ) : isSettingsRoute ? (
              <SettingsView onBack={() => navigate(settingsBackRoute, { replace: true })} />
            ) : (
              <>
                <ProfileContextCard onOpenCompletion={handleOpenProfileCompletion} requirement={profileRequirement} />

                <ClientRoutes
                  commission={{
                    onOpenHuntingCertification: () => handleNavigate("huntingCertification")
                  }}
                  job={{
                    dashboard: workspaceData.merchantDashboard,
                    jobs: workspaceData.partTimeJobs,
                    onApplyTutorTrial: handleApplyTutorTrial,
                    tutorJobs: tutorTrialJobs
                  }}
                  merchantSales={{
                    dashboard: workspaceData.merchantDashboard,
                    merchantProducts: workspaceData.merchantProducts
                  }}
                  role={role}
                  tutor={{ students: tutorCertifiedStudentsResponse }}
                />

                <FloatingActions {...floatingActionsProps} />

                <BottomTabs activeTab={activeTab} onChange={handleOpenTab} />
              </>
            )}

            {ongoingQuoteTask ? (
              <OngoingQuote
                initialQuoteId={ongoingQuoteInitialQuoteId}
                onClose={handleCloseOngoingQuoteList}
                onConfirmQuote={handleConfirmHuntingQuote}
                onCounterQuote={handleCounterHuntingQuote}
                onRejectQuote={handleRejectHuntingQuote}
                task={ongoingQuoteTask}
              />
            ) : null}

            <GlobalOverlayHost />

            {isProfileCompletionOpen && profileCompletionTemplate ? (
              <ProfileCompletion
                isSaving={createAddressMutation.isPending || updateAddressMutation.isPending}
                onChange={handleProfileDraftChange}
                onClose={() => setIsProfileCompletionOpen(false)}
                onSave={handleSaveProfileDraft}
                profileDraft={profileDraft}
                template={profileCompletionTemplate}
              />
            ) : null}
          </main>
        </PublishOverlayProvider>
      </TutorOverlayProvider>
    </CheckoutProvider>
  );
}
