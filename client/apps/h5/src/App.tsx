import { useGlobalStore, useGlobalUser } from "@h5/store/global";
import {
  useAcceptHuntingTask,
  useApplyTutorTrial,
  useCancelTutorDemand,
  useClientAddresses,
  useCompleteTutorTrialEnd,
  useConfirmTutorTrialStart,
  useConfirmTutorTrial,
  useCreateClientAddress,
  useCreateHuntingProject,
  useDecideHuntingTaskQuote,
  useHandleHuntingTaskFulfillmentAction,
  useHuntingTasks,
  useHandleTutorWorkflowAction,
  usePartTimeJobs,
  usePublishHuntingTask,
  usePublishTutorDemand,
  useQuoteHuntingTask,
  useRequestTutorTrialEnd,
  useTutorDemands,
  useUpdateClientAddress,
  useUpdateTutorExposure
} from "@unknown/hooks";
import { getHuntingCertificationDataFromDraft } from "@components/HuntingCertificationCard/model";
import { HuntingProjectDialog } from "@components/HuntingProjectDialog";
import { PublishInfoDialog } from "@components/PublishInfoDialog";
import { TutorCalendarDialog } from "@components/TutorCalendar";
import { TutorCertificationInfoDialog } from "@components/TutorCertificationInfoDialog";
import { useCheckoutFlow } from "@h5/hooks/useCheckoutFlow";
import { useClientWorkspaceViewModel } from "@h5/hooks/useClientWorkspaceViewModel";
import { useOverlayController } from "@h5/hooks/useOverlayController";
import { useProfileCompletionFlow } from "@h5/hooks/useProfileCompletionFlow";
import { usePrimaryTabWorkspaceRefresh } from "@h5/hooks/usePrimaryTabWorkspaceRefresh";
import { usePublishInfoFlow } from "@h5/hooks/usePublishInfoFlow";
import { useRootNavigation } from "@h5/hooks/useRootNavigation";
import { HuntingRecommendationDialog } from "@pages/home/delegation/components/HuntingRecommendationDialog";
import { OngoingQuoteDialog } from "@pages/home/delegation/components/OngoingQuoteDialog";
import { useHuntingTaskActions } from "@pages/home/delegation/hooks/useHuntingTaskActions";
import { useOngoingQuoteFlow } from "@pages/home/delegation/hooks/useOngoingQuoteFlow";
import { HuntingCertification } from "@pages/home/delegation/HuntingCertification";
import { TutorCertification } from "@pages/home/job/edu/TutorCertification";
import { TutorApplicationsDialog, TutorTrialListDialog } from "@pages/home/job/edu/components/TutorApplicationsDialog";
import { useTutorTrialActions } from "@pages/home/job/edu/hooks/useTutorTrialActions";
import { campusAreaOptions, clientAddressesToAddressBookItems } from "@shared/clientPageModel";
import { hideMessage, showMessage } from "@tools/messageToast";
import { getTutorCalendarTasks, getTutorDateKey } from "@tools/tutorCalendar";

/** React Query 首次返回数据前使用的稳定空地址，避免 effect 因默认数组反复触发。 */
const emptyClientAddresses: ClientAddress[] = [];

/** React Query 首次返回兼职列表前使用的稳定空数组。 */
const emptyPartTimeJobs: PartTimeJob[] = [];

/** React Query 首次返回委托/狩猎列表前使用的稳定空数组。 */
const emptyHuntingTasks: HuntingTask[] = [];

/** React Query 首次返回家教列表前使用的稳定空数组。 */
const emptyTutorDemands: TutorDemand[] = [];

/** React Query 首次返回工作台数据前使用的稳定空工作台数据。 */
const emptyWorkspaceData = {
  orders: [] as ClientOrder[]
};

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
  const [isHuntingShortcutEnabled, setIsHuntingShortcutEnabled] = useState(false);
  const [huntingShortcutProject, setHuntingShortcutProject] = useState<HuntingProject | null>(null);
  const [activeTutorApplicationDemandId, setActiveTutorApplicationDemandId] = useState<string | null>(null);
  const [activeTutorTrialDemandId, setActiveTutorTrialDemandId] = useState<string | null>(null);
  const [isTutorTrialListOpen, setIsTutorTrialListOpen] = useState(false);
  const {
    closeHuntingShortcutDialogs,
    closeRouteOverlays,
    closeTutorDialogs,
    handleAvatarClick,
    isHuntingProjectOpen,
    isHuntingRecommendationOpen,
    isMineOpen,
    isOngoingOpen,
    isQuickDockExpanded,
    isTutorApplicationOpen,
    isTutorCalendarOpen,
    isTutorCertificationInfoOpen,
    setIsHuntingProjectOpen,
    setIsHuntingRecommendationOpen,
    setIsMineOpen,
    setIsOngoingOpen,
    setIsQuickDockExpanded,
    setIsTutorApplicationOpen,
    setIsTutorCalendarOpen,
    setIsTutorCertificationInfoOpen
  } = useOverlayController();
  // 角色级数据在路由间共享，页面局部筛选保留在各页面模块内。
  const {
    data: homeData,
    error: homeError,
    isLoading: isHomeLoading,
    refetch: refetchHome
  } = useClientHome(role, isAuthenticated);
  const {
    data: workspaceResponse,
    error: workspaceError,
    isFetching: isWorkspaceFetching,
    isLoading: isWorkspaceLoading,
    refetch: refetchWorkspace
  } = useClientWorkspace(role, isAuthenticated);
  const {
    data: partTimeJobsResponse = emptyPartTimeJobs,
    error: partTimeJobsError,
    isFetching: isPartTimeJobsFetching,
    isLoading: isPartTimeJobsLoading,
    refetch: refetchPartTimeJobs
  } = usePartTimeJobs(role, isAuthenticated);
  const {
    data: huntingTasksResponse = emptyHuntingTasks,
    error: huntingTasksError,
    isFetching: isHuntingTasksFetching,
    isLoading: isHuntingTasksLoading,
    refetch: refetchHuntingTasks
  } = useHuntingTasks(role, isAuthenticated);
  const {
    data: tutorDemandsResponse = emptyTutorDemands,
    error: tutorDemandsError,
    isFetching: isTutorDemandsFetching,
    isLoading: isTutorDemandsLoading,
    refetch: refetchTutorDemands
  } = useTutorDemands(role, isAuthenticated);
  const {
    data: clientAddresses = emptyClientAddresses,
    error: addressError,
    isLoading: isAddressLoading
  } = useClientAddresses(isAuthenticated, user.session?.accessToken);
  const purchaseMutation = usePurchaseProduct();
  const publishHuntingTaskMutation = usePublishHuntingTask();
  const publishTutorDemandMutation = usePublishTutorDemand();
  const createHuntingProjectMutation = useCreateHuntingProject();
  const applyTutorTrialMutation = useApplyTutorTrial();
  const confirmTutorTrialMutation = useConfirmTutorTrial();
  const confirmTutorTrialStartMutation = useConfirmTutorTrialStart();
  const requestTutorTrialEndMutation = useRequestTutorTrialEnd();
  const completeTutorTrialEndMutation = useCompleteTutorTrialEnd();
  const tutorWorkflowActionMutation = useHandleTutorWorkflowAction();
  const cancelTutorDemandMutation = useCancelTutorDemand();
  const updateTutorExposureMutation = useUpdateTutorExposure();
  const acceptHuntingTaskMutation = useAcceptHuntingTask();
  const quoteHuntingTaskMutation = useQuoteHuntingTask();
  const decideHuntingTaskQuoteMutation = useDecideHuntingTaskQuote();
  const huntingTaskFulfillmentActionMutation = useHandleHuntingTaskFulfillmentAction();
  const createAddressMutation = useCreateClientAddress();
  const updateAddressMutation = useUpdateClientAddress();
  const addressItems = useMemo(() => clientAddressesToAddressBookItems(clientAddresses), [clientAddresses]);
  /** 刷新工作台聚合数据和已拆分的三类业务列表。 */
  const refetchWorkspaceData = useCallback(() => {
    void refetchWorkspace();
    void refetchPartTimeJobs();
    void refetchHuntingTasks();
    void refetchTutorDemands();
  }, [refetchHuntingTasks, refetchPartTimeJobs, refetchTutorDemands, refetchWorkspace]);
  /** 仅刷新委托/狩猎列表，用于接单、报价和狩猎轮询。 */
  const refetchHuntingTaskList = useCallback(() => {
    void refetchHuntingTasks();
  }, [refetchHuntingTasks]);
  /** 主导航切换时只刷新当前页面真正使用的数据接口。 */
  const refetchPrimaryTabData = useCallback(() => {
    if (activeTab === "partTime") {
      void refetchPartTimeJobs();
      return;
    }

    if (activeTab === "hunting") {
      void refetchHuntingTasks();
      return;
    }

    if (activeTab === "tutor") {
      void refetchTutorDemands();
      return;
    }

    void refetchWorkspace();
  }, [activeTab, refetchHuntingTasks, refetchPartTimeJobs, refetchTutorDemands, refetchWorkspace]);
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
  const {
    checkout,
    openCheckout: handleOpenCheckout,
    purchasePending,
    setCheckout,
    submitPurchase: handleSubmitPurchase
  } = useCheckoutFlow({
    currentAddressDraft,
    onOrderCreated: () => handleNavigate("orders"),
    openProfileCompletion: handleOpenProfileCompletion,
    purchaseProduct: (payload, callbacks) => purchaseMutation.mutate(payload, callbacks),
    purchasePending: purchaseMutation.isPending,
    role,
    showMessage
  });
  const {
    isPublishInfoOpen,
    isPublishing,
    openDefaultPublishInfo: handleOpenPublishInfo,
    openPublishInfo,
    openRecycleInfo: handleOpenRecycleInfo,
    pendingPublishDraft,
    pendingPublishType,
    publishInfo: handlePublishInfo,
    publishInfoInitialDraft,
    publishInfoInitialType,
    publishedHuntingTasks,
    publishChildOptions,
    resetPublishedHuntingTasks,
    savePublishInfo: handleSavePublishInfo,
    setIsPublishInfoOpen,
    setPendingPublishDraft
  } = usePublishInfoFlow({
    addressItems,
    isPublishing: publishHuntingTaskMutation.isPending || publishTutorDemandMutation.isPending,
    onBeforeOpen: () => {
      closeRouteOverlays();
      setIsProfileCompletionOpen(false);
    },
    onPublishedHuntingTask: () => undefined,
    onPublishedToTab: (tab) => {
      setActiveTab(tab);
      setPageStack([]);
      navigate(getRouteForTab(tab));
    },
    publishHuntingTask: (payload, callbacks) => publishHuntingTaskMutation.mutate(payload, callbacks),
    publishTutorDemand: (payload, callbacks) => publishTutorDemandMutation.mutate(payload, callbacks),
    profileDraft: user.profileDraft,
    refetchWorkspace: refetchWorkspaceData,
    role,
    showMessage
  });

  const {
    hasPaymentRisk,
    mergedHuntingTasks,
    ongoingOrders,
    orderDetailOrders,
    recommendedHuntingTasks,
    roleOrders,
    tutorApplicationCandidates,
    tutorTrialJobs
  } = useClientWorkspaceViewModel({
    huntingShortcutProject,
    publishedHuntingTasks,
    role,
    workspaceData: {
      huntingTasks: huntingTasksResponse,
      orders: workspaceResponse?.orders ?? emptyWorkspaceData.orders,
      tutorDemands: tutorDemandsResponse
    }
  });
  const activeTutorApplicationCandidates = useMemo(
    () =>
      activeTutorApplicationDemandId
        ? tutorApplicationCandidates.filter((candidate) => candidate.demandId === activeTutorApplicationDemandId)
        : tutorApplicationCandidates,
    [activeTutorApplicationDemandId, tutorApplicationCandidates]
  );
  const activeTutorTrialCandidates = useMemo(
    () =>
      activeTutorTrialDemandId
        ? tutorApplicationCandidates.filter((candidate) => candidate.demandId === activeTutorTrialDemandId)
        : tutorApplicationCandidates,
    [activeTutorTrialDemandId, tutorApplicationCandidates]
  );
  const {
    closeOngoingQuoteList: handleCloseOngoingQuoteList,
    ongoingQuoteInitialQuoteId,
    ongoingQuoteTask,
    openOngoingQuoteList: handleOpenOngoingQuoteList
  } = useOngoingQuoteFlow({
    showMessage,
    tasks: mergedHuntingTasks
  });
  const {
    handleAcceptHuntingTask,
    handleConfirmHuntingQuote,
    handleCounterHuntingQuote,
    handleHuntingTaskFulfillmentAction,
    handleQuoteHuntingTask,
    handleRejectHuntingQuote
  } = useHuntingTaskActions({
    acceptTask: (taskId) => acceptHuntingTaskMutation.mutateAsync(taskId),
    decideQuote: (payload) => decideHuntingTaskQuoteMutation.mutateAsync(payload),
    fulfillmentAction: (payload) => huntingTaskFulfillmentActionMutation.mutateAsync(payload),
    mergedHuntingTasks,
    quoteTask: (payload) => quoteHuntingTaskMutation.mutateAsync(payload),
    refetchWorkspace: refetchHuntingTaskList,
    showMessage
  });
  const {
    handleApplyTutorTrial,
    handleCancelTutorDemand,
    handleCompleteTutorTrialEnd,
    handleConfirmTutorTrial,
    handleConfirmTutorTrialStart,
    handleRequestTutorTrialEnd,
    handleTutorWorkflowAction
  } = useTutorTrialActions({
    applyTutorTrial: (payload) => applyTutorTrialMutation.mutateAsync(payload),
    cancelTutorDemand: (demandId) => cancelTutorDemandMutation.mutateAsync(demandId),
    closeTutorApplications: () => {
      setIsTutorApplicationOpen(false);
      setActiveTutorApplicationDemandId(null);
    },
    closeTutorTrialList: () => {
      setIsTutorTrialListOpen(false);
      setActiveTutorTrialDemandId(null);
    },
    completeTutorTrialEnd: (payload) => completeTutorTrialEndMutation.mutateAsync(payload),
    handleTutorWorkflowAction: (payload) => tutorWorkflowActionMutation.mutateAsync(payload),
    confirmTutorTrialStart: (applicationId) => confirmTutorTrialStartMutation.mutateAsync(applicationId),
    confirmTutorTrial: (payload) => confirmTutorTrialMutation.mutateAsync(payload),
    openOngoingOrders: () => setIsOngoingOpen(true),
    refetchWorkspace: refetchWorkspaceData,
    requestTutorTrialEnd: (applicationId) => requestTutorTrialEndMutation.mutateAsync(applicationId),
    showMessage
  });
  const dataError = homeError ?? workspaceError ?? partTimeJobsError ?? huntingTasksError ?? tutorDemandsError ?? addressError;
  const isInitialDataLoading =
    isHomeLoading ||
    isWorkspaceLoading ||
    isPartTimeJobsLoading ||
    isHuntingTasksLoading ||
    isTutorDemandsLoading ||
    isAddressLoading;
  const huntingCertificationStatus = useMemo(
    () => getHuntingCertificationDataFromDraft(user.profileDraft).certificationStatus,
    [user.profileDraft]
  );
  const tutorCalendarTasks = useMemo(() => getTutorCalendarTasks(user.profileDraft), [user.profileDraft]);
  usePrimaryTabWorkspaceRefresh({
    activePage,
    activeTab,
    isAuthenticated,
    isMineRoute,
    isSettingsRoute,
    isWorkspaceFetching: isWorkspaceFetching || isPartTimeJobsFetching || isHuntingTasksFetching || isTutorDemandsFetching,
    refetchWorkspace: refetchPrimaryTabData
  });

  function handleOpenHuntingShortcut() {
    if (isHuntingShortcutEnabled) {
      setIsHuntingRecommendationOpen(true);
      setIsHuntingProjectOpen(false);
      setIsMineOpen(false);
      setIsOngoingOpen(false);
      return;
    }

    if (!handleRequestHuntingOnline()) {
      setIsMineOpen(false);
      return;
    }

    setIsHuntingProjectOpen(true);
    setIsHuntingRecommendationOpen(false);
    setIsMineOpen(false);
    setIsOngoingOpen(false);
  }

  /** 创建狩猎项目并开启系统推荐，推荐数量由服务端根据动线匹配任务池生成。 */
  function handleCreateHuntingProject(draft: HuntingProjectDraft) {
    createHuntingProjectMutation.mutate(
      {
        currentArea: draft.currentArea,
        nextStops: draft.nextStops
      },
      {
        onSuccess: (project) => {
          const nextProject: HuntingProject = {
            createdAt: new Date().toISOString(),
            currentArea: project.currentArea,
            id: project.id,
            matchedTaskIds: [],
            nextStops: project.nextStops.map((stop, index) => ({
              ...stop,
              id: `stop_${index}_${project.id}`,
              inputMode: stop.inputMode === "custom" ? "custom" : "preset"
            })),
            status: project.status === "closed" ? "closed" : "matching"
          };

          setHuntingShortcutProject(nextProject);
          setIsHuntingShortcutEnabled(true);
          setIsHuntingProjectOpen(false);
          setActiveTab("hunting");
          setPageStack([]);
          setIsOngoingOpen(false);
          setIsMineOpen(false);
          setIsProfileCompletionOpen(false);
          closeTutorDialogs();
          navigate(getRouteForTab("hunting"));
          showMessage(`狩猎项目已创建，系统匹配到 ${project.matchedCount} 个推荐委托。`, { type: "success" });
          void refetchHuntingTasks();
        },
        onError: (error) => {
          showMessage(getErrorMessage(error, "狩猎项目创建失败，请稍后重试。"), { type: "error" });
        }
      }
    );
  }

  /** 关闭狩猎快捷推荐推送。 */
  function handleDisableHuntingShortcut() {
    setIsHuntingShortcutEnabled(false);
    setHuntingShortcutProject(null);
    setIsHuntingRecommendationOpen(false);
    showMessage("狩猎快捷已关闭。", { type: "success" });
  }

  /** 家教认证提交完成后回到当前主模块首页，并用全局提示承接提交结果。 */
  function handleTutorCertificationSubmitted() {
    setPageStack([]);
    setIsMineOpen(false);
    setIsOngoingOpen(false);
    setIsQuickDockExpanded(true);
    closeTutorDialogs();
    closeHuntingShortcutDialogs();
    showMessage("家教认证已提交，当前状态为认证中。", { type: "success" });
    navigate(getRouteForTab(activeTab), { replace: true });
  }

  /** 狩猎认证提交完成后回到当前主模块首页，并同步服务端返回的认证状态。 */
  function handleHuntingCertificationSubmitted(
    huntingCertificationStatus: HuntingCertificationStatus,
    nextCertificationDraft: ProfileDraftState
  ) {
    const nextProfileDraft = {
      ...user.profileDraft,
      ...nextCertificationDraft,
      huntingCertificationStatus
    };

    syncProfileDraft(nextProfileDraft);
    setPageStack([]);
    setIsMineOpen(false);
    setIsOngoingOpen(false);
    setIsQuickDockExpanded(true);
    closeTutorDialogs();
    closeHuntingShortcutDialogs();
    showMessage("狩猎认证已提交，当前状态为认证中。", { type: "success" });
    void refetchHome();
    navigate(getRouteForTab(activeTab), { replace: true });
  }

  function handleLoginSuccess(session: LoginResponse) {
    setUserSession(session);
    resetForRole(session.role);
    setIsOngoingOpen(false);
    setIsMineOpen(false);
    setIsQuickDockExpanded(true);
    setIsProfileCompletionOpen(false);
    setIsPublishInfoOpen(false);
    resetPublishedHuntingTasks();
    setIsTutorApplicationOpen(false);
    setIsHuntingShortcutEnabled(false);
    setHuntingShortcutProject(null);
    closeTutorDialogs();
    closeHuntingShortcutDialogs();
    resetProfileDraftForPhone(session.phone);
    showMessage(session.profileCompletionRequired ? "登录成功，可稍后进入设置补充资料。" : "登录成功。", {
      type: "success"
    });
    setCheckout(null);
    navigate(getDefaultRouteForRole(session.role), { replace: true });
  }

  function handleLogout() {
    clearUser();
    resetForRole("student");
    setIsOngoingOpen(false);
    setIsMineOpen(false);
    setIsQuickDockExpanded(true);
    setIsProfileCompletionOpen(false);
    setIsPublishInfoOpen(false);
    resetPublishedHuntingTasks();
    setIsTutorApplicationOpen(false);
    setIsHuntingShortcutEnabled(false);
    setHuntingShortcutProject(null);
    closeTutorDialogs();
    closeHuntingShortcutDialogs();
    hideMessage();
    setCheckout(null);
    navigate("/login", { replace: true });
  }

  function handleOpenTab(tab: ClientModuleKey) {
    openTab(tab);
    closeRouteOverlays();
    setIsProfileCompletionOpen(false);
    setIsPublishInfoOpen(false);
  }

  function handleNavigate(page: PageSurface) {
    navigatePage(page);
    closeRouteOverlays();
    setIsProfileCompletionOpen(false);
    setIsPublishInfoOpen(false);
  }

  function handleBack() {
    navigateBack();
    closeRouteOverlays();
    setIsProfileCompletionOpen(false);
    setIsPublishInfoOpen(false);
  }

  function handleOpenProfileCompletion() {
    closeRouteOverlays();
    openProfileCompletion();
    setIsPublishInfoOpen(false);
  }

  /** 打开家教认证信息弹窗，供我的页面家教卡片查看和编辑。 */
  function handleOpenTutorCertificationInfo() {
    setIsMineOpen(false);
    setIsOngoingOpen(false);
    setIsQuickDockExpanded(true);
    setIsPublishInfoOpen(false);
    closeHuntingShortcutDialogs();
    setIsTutorCalendarOpen(false);
    setIsTutorCertificationInfoOpen(true);
  }

  /** 切换家教资料公开状态，开启后允许家教认证信息被查看。 */
  function handleToggleTutorExposure() {
    const nextEnabled = user.profileDraft.tutorExposureEnabled !== "true";
    updateTutorExposureMutation.mutate(nextEnabled, {
      onSuccess: (response) => {
        const nextProfileDraft = {
          ...user.profileDraft,
          tutorExposureEnabled: response.enabled ? "true" : "false"
        };

        syncProfileDraft(nextProfileDraft);
        showMessage(response.enabled ? "开启家教，认证信息可被查看，我的-家教卡片可修改信息。" : "已关闭家教资料公开。", {
          type: "success"
        });
        void refetchHome();
        void refetchTutorDemands();
      },
      onError: (error) => {
        showMessage(getErrorMessage(error, "家教开关切换失败，请稍后重试。"), { type: "error" });
      }
    });
  }

  /** 保存家教认证信息弹窗的修改或重新认证草稿。 */
  function handleSaveTutorCertificationInfo(
    nextProfileDraft: ProfileDraftState,
    mode: TutorCertificationInfoSaveMode
  ) {
    const shouldRecertify = mode === "recertify";
    const filledProfileDraft = {
      ...nextProfileDraft,
      ...(shouldRecertify
        ? {
            tutorCertificationStatus: "reviewing",
            tutorExposureEnabled: "false"
          }
        : {})
    };

    syncProfileDraft(filledProfileDraft);
    setIsTutorCertificationInfoOpen(false);
    showMessage(shouldRecertify ? "家教认证已重新提交，当前状态为认证中。" : "家教认证信息已更新。", {
      type: "success"
    });
  }

  /** 打开课程日历弹窗，供认证通过后的快捷入口使用。 */
  function handleOpenTutorCalendar() {
    setIsMineOpen(false);
    setIsOngoingOpen(false);
    setIsQuickDockExpanded(true);
    setIsTutorCertificationInfoOpen(false);
    setIsPublishInfoOpen(false);
    closeHuntingShortcutDialogs();
    setIsTutorCalendarOpen(true);
  }

  // 委托模块负责上线开关，根节点仅判断是否满足上线资料要求。
  function handleRequestHuntingOnline() {
    const huntingRequirement = getProfileRequirement(role, "hunting", currentAddressDraft);

    if (huntingRequirement) {
      showMessage(`请先补充${huntingRequirement.missingFields.map((field) => field.label).join("、")}`, {
        type: "warning"
      });
      setIsProfileCompletionOpen(true);
      return false;
    }

    return true;
  }

  /** 打开家长端试课申请选择弹窗。 */
  function handleOpenTutorApplications(order?: ClientOrder) {
    setActiveTutorApplicationDemandId(order?.id ?? null);
    setIsTutorApplicationOpen(true);
  }

  /** 打开家长端试课中的家教列表。 */
  function handleOpenTutorTrialList(order?: ClientOrder) {
    setActiveTutorTrialDemandId(order?.id ?? null);
    setIsTutorTrialListOpen(true);
  }

  /** 进行中取消动作按业务类型分流，家教发布中主任务走真实撤回接口。 */
  function handleRequestOngoingCancel(order: ClientOrder) {
    if (order.category === "tutor") {
      void handleCancelTutorDemand(order);
      return;
    }

    void handleHuntingTaskFulfillmentAction(order, "request_cancel");
  }

  /** 进行中完成动作按业务类型分流，家教试课走真实结束试课确认接口。 */
  function handleRequestOngoingComplete(order: ClientOrder) {
    if (order.category === "tutor") {
      void handleRequestTutorTrialEnd(order);
      return;
    }

    void handleHuntingTaskFulfillmentAction(order, "request_complete");
  }

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
    return (
      <Routes>
        <Route path="/login" element={<Login onLoginSuccess={handleLoginSuccess} />} />
        <Route path="*" element={<Navigate replace to="/login" />} />
      </Routes>
    );
  }

  if (dataError) {
    return (
      <main className="login-shell mx-auto grid min-h-screen max-w-[540px] content-center gap-[14px] px-[14px] py-[28px] text-[#17212b]">
        <section className="login-card grid gap-[14px] p-[16px]">
          <div className="card-title flex items-center justify-between gap-[10px] min-w-0 ">
            <AlertCircle size={18} />
            <strong>真实接口连接失败</strong>
          </div>
          <p className="notice mt-[12px] p-[12px] text-[#61420d] danger">
            {dataError instanceof Error ? dataError.message : "请检查后端服务和云数据库连接。"}
          </p>
          <button
            className="primary-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white disabled:text-[#748092] w-full full"
            onClick={handleLogout}
            type="button"
          >
            <LogOut size={16} />
            退出并重新登录
          </button>
        </section>
      </main>
    );
  }

  if (!homeData || !workspaceResponse || isInitialDataLoading) {
    return (
      <main className="login-shell mx-auto grid min-h-screen max-w-[540px] content-center gap-[14px] px-[14px] py-[28px] text-[#17212b]">
        <section className="login-card grid gap-[14px] p-[16px]">
          <div className="card-title flex items-center justify-between gap-[10px] min-w-0 ">
            <ShieldCheck size={18} />
            <strong>正在加载云端真实数据</strong>
          </div>
          <p className="login-tip m-0 text-[13px] leading-[1.5] text-[#657181]">
            正在读取 PostgreSQL 中的首页、商品、订单、钱包和工作台数据。
          </p>
        </section>
      </main>
    );
  }

  const workspaceData = {
    ...workspaceResponse,
    huntingTasks: huntingTasksResponse,
    partTimeJobs: partTimeJobsResponse,
    tutorDemands: tutorDemandsResponse
  };
  const hasPrimaryContextCard = Boolean(profileRequirement) && !activePage && !isSettingsRoute && !isMineRoute;
  const isPrimaryListShell =
    (activeTab === "featured" || activeTab === "partTime") && !activePage && !isSettingsRoute && !isMineRoute;

  return (
    <main
      className={`h5-shell mx-auto min-h-screen max-w-[540px] px-[14px] pt-[14px] text-[#17212b] ${
        activePage || isSettingsRoute || isMineRoute
          ? "page-mode pb-[28px]"
          : "pb-[calc(92px+env(safe-area-inset-bottom))]"
      } ${activeTab === "hunting" && !activePage && !isSettingsRoute && !isMineRoute ? "delegation-shell" : ""} ${
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
            <TutorCertification onBack={handleBack} onSubmitted={handleTutorCertificationSubmitted} />
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
          onOpenTutorCertificationInfo={handleOpenTutorCertificationInfo}
          orders={roleOrders}
          walletSummary={workspaceData.walletSummary}
        />
      ) : isSettingsRoute ? (
        <SettingsView onBack={() => navigate(settingsBackRoute, { replace: true })} />
      ) : (
        <>
          <ProfileContextCard onOpenCompletion={handleOpenProfileCompletion} requirement={profileRequirement} />

          <Routes>
            <Route
              path="/featured"
              element={
                <Featured
                  onOpenCheckout={handleOpenCheckout}
                  purchasePending={purchasePending}
                  role={role}
                />
              }
            />
            <Route
              path="/part-time"
              element={
                <PartTime
                  dashboard={workspaceData.merchantDashboard}
                  jobs={workspaceData.partTimeJobs}
                  onApplyTutorTrial={handleApplyTutorTrial}
                  role={role}
                  tutorJobs={tutorTrialJobs}
                />
              }
            />
            <Route
              path="/delegation"
              element={
                <Delegation
                  huntingCertificationStatus={huntingCertificationStatus}
                  huntingTasks={mergedHuntingTasks}
                  isRefreshing={isHuntingTasksFetching}
                  onAcceptTask={handleAcceptHuntingTask}
                  onOpenHuntingCertification={() => handleNavigate("huntingCertification")}
                  onQuoteTask={handleQuoteHuntingTask}
                  onRefreshTasks={refetchHuntingTaskList}
                />
              }
            />
            <Route
              path="/merchant-sales"
              element={
                <MerchantSales
                  dashboard={workspaceData.merchantDashboard}
                  merchantProducts={workspaceData.merchantProducts}
                />
              }
            />
            <Route path="/marketing" element={<Marketing />} />
            <Route path="/tutor" element={<Tutor tutorDemands={workspaceData.tutorDemands} />} />
            <Route path="*" element={<Navigate replace to={getDefaultRouteForRole(role)} />} />
          </Routes>

          {isMineOpen ? (
            <MinePopover
              onClose={() => setIsMineOpen(false)}
              onLogout={handleLogout}
              onNavigate={handleNavigate}
              onOpenPublish={handleOpenPublishInfo}
              onOpenRecycle={handleOpenRecycleInfo}
              onOpenTutorCalendar={handleOpenTutorCalendar}
              onOpenTab={handleOpenTab}
              onToggleTutorExposure={handleToggleTutorExposure}
              walletSummary={workspaceData.walletSummary}
            />
          ) : null}

          <div
            className={`quick-action-dock ${isQuickDockExpanded ? "expanded" : "collapsed"}`}
            aria-label="我的快捷操作"
          >
            <button
              className={`quick-action-button quick-action-order order-shortcut grid h-[46px] w-[46px] place-items-center font-extrabold text-white ${hasPaymentRisk ? "danger" : ""}`}
              onClick={() => {
                setIsOngoingOpen(true);
                setIsMineOpen(false);
              }}
              type="button"
              aria-label="查看进行中事项"
            >
              <PackageCheck size={18} />
              <span className="quick-action-badge">{ongoingOrders.length}</span>
            </button>

            {role === "student" ? (
              <button
                className={`quick-action-button quick-action-hunting hunting-shortcut grid h-[46px] w-[46px] place-items-center font-extrabold text-white ${
                  isHuntingShortcutEnabled ? "active" : ""
                }`}
                onClick={handleOpenHuntingShortcut}
                type="button"
                aria-label={isHuntingShortcutEnabled ? "查看狩猎推荐委托" : "开启狩猎快捷开关"}
              >
                {isHuntingShortcutEnabled ? (
                  <>
                    <svg className="hunting-ecg-icon" aria-hidden="true" viewBox="0 0 30 22">
                      <polyline points="1,12 7,12 10,5 14,18 18,8 21,12 29,12" />
                    </svg>
                    <span className="quick-action-badge">{recommendedHuntingTasks.length}</span>
                  </>
                ) : (
                  <Crosshair size={18} />
                )}
              </button>
            ) : null}
          </div>

          <button
            className="floating-avatar grid h-[54px] w-[54px] place-items-center text-[#17212b]"
            onClick={handleAvatarClick}
            type="button"
            aria-expanded={isQuickDockExpanded}
            aria-label="我的"
          >
            <UserRound size={22} />
          </button>

          <BottomTabs activeTab={activeTab} onChange={handleOpenTab} />
        </>
      )}

      {isHuntingProjectOpen ? (
        <HuntingProjectDialog
          areaOptions={campusAreaOptions}
          initialProject={huntingShortcutProject}
          onClose={closeHuntingShortcutDialogs}
          onSubmit={handleCreateHuntingProject}
        />
      ) : null}

      {isHuntingRecommendationOpen ? (
        <HuntingRecommendationDialog
          onClose={() => setIsHuntingRecommendationOpen(false)}
          onDisable={handleDisableHuntingShortcut}
          tasks={recommendedHuntingTasks}
        />
      ) : null}

      {isOngoingOpen ? (
        <OngoingOrdersDialog
          onClose={() => setIsOngoingOpen(false)}
          onConfirmCancel={(order) => void handleHuntingTaskFulfillmentAction(order, "confirm_cancel")}
          onConfirmComplete={(order) => void handleHuntingTaskFulfillmentAction(order, "confirm_complete")}
          onConfirmTutorTrialStart={handleConfirmTutorTrialStart}
          onOpenQuoteList={handleOpenOngoingQuoteList}
          onOpenTutorApplications={handleOpenTutorApplications}
          onOpenTutorTrialList={handleOpenTutorTrialList}
          onRepublish={(order) => void handleHuntingTaskFulfillmentAction(order, "republish")}
          onTutorWorkflowAction={(order, action, payload) => handleTutorWorkflowAction({ ...payload, action, applicationId: order.id })}
          onRequestCancel={handleRequestOngoingCancel}
          onRequestComplete={handleRequestOngoingComplete}
          orders={ongoingOrders}
        />
      ) : null}

      {ongoingQuoteTask ? (
        <OngoingQuoteDialog
          initialQuoteId={ongoingQuoteInitialQuoteId}
          onClose={handleCloseOngoingQuoteList}
          onConfirmQuote={handleConfirmHuntingQuote}
          onCounterQuote={handleCounterHuntingQuote}
          onRejectQuote={handleRejectHuntingQuote}
          task={ongoingQuoteTask}
        />
      ) : null}

      {checkout ? (
        <CheckoutSheet
          checkout={checkout}
          onClose={() => setCheckout(null)}
          onDeliveryChange={(deliveryMode) => setCheckout((value) => (value ? { ...value, deliveryMode } : value))}
          onPaymentChange={(paymentMethod) => setCheckout((value) => (value ? { ...value, paymentMethod } : value))}
          onSubmit={handleSubmitPurchase}
          purchasePending={purchasePending}
          role={role}
        />
      ) : null}

      {isProfileCompletionOpen && profileCompletionTemplate ? (
        <ProfileCompletionDialog
          isSaving={createAddressMutation.isPending || updateAddressMutation.isPending}
          onChange={handleProfileDraftChange}
          onClose={() => setIsProfileCompletionOpen(false)}
          onSave={handleSaveProfileDraft}
          profileDraft={profileDraft}
          template={profileCompletionTemplate}
        />
      ) : null}


      {pendingPublishDraft ? (
        <section className="checkout-sheet" aria-label="使用发布草稿">
          <div className="sheet-backdrop" onClick={() => setPendingPublishDraft(null)} />
          <article className="sheet-panel mx-auto grid max-w-[420px] gap-[12px] p-[14px]">
            <div className="card-title flex items-center justify-between gap-[10px]">
              <ClipboardCheck size={18} />
              <div>
                <strong>检测到本地草稿</strong>
                <span>是否使用上次保存的{pendingPublishDraft.type === "tutor" ? "家教" : pendingPublishDraft.type === "recycle" ? "回收" : "委托"}草稿？</span>
              </div>
              <button
                aria-label="关闭"
                className="icon-only grid h-[34px] w-[34px] place-items-center text-[#475466]"
                onClick={() => setPendingPublishDraft(null)}
                type="button"
              >
                <XCircle size={20} />
              </button>
            </div>
            <p className="text-[13px] leading-[1.6] text-[#657181]">
              草稿标题：{pendingPublishDraft.title || "未填写标题"}，保存时间：{new Date(pendingPublishDraft.createdAt).toLocaleString()}
            </p>
            <div className="sheet-actions grid gap-[8px]">
              <button
                className="ghost-button inline-flex min-h-[38px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-[#475466]"
                onClick={() => openPublishInfo(pendingPublishType, null)}
                type="button"
              >
                不使用
              </button>
              <button
                className="primary-button inline-flex min-h-[38px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white"
                onClick={() => openPublishInfo(pendingPublishType, pendingPublishDraft)}
                type="button"
              >
                使用草稿
              </button>
            </div>
          </article>
        </section>
      ) : null}

      {isPublishInfoOpen ? (
        <PublishInfoDialog
          addressItems={addressItems}
          childOptions={publishChildOptions}
          initialDraft={publishInfoInitialDraft}
          initialType={publishInfoInitialType}
          isPublishing={isPublishing}
          onClose={() => setIsPublishInfoOpen(false)}
          onPublish={handlePublishInfo}
          onSave={handleSavePublishInfo}
          role={role}
        />
      ) : null}

      {isTutorApplicationOpen ? (
        <TutorApplicationsDialog
          candidates={activeTutorApplicationCandidates}
          isConfirming={confirmTutorTrialMutation.isPending || tutorWorkflowActionMutation.isPending}
          onClose={() => {
            setIsTutorApplicationOpen(false);
            setActiveTutorApplicationDemandId(null);
          }}
          onCancelTrial={(payload) => void handleTutorWorkflowAction({ ...payload, action: "cancel_trial" })}
          onConfirm={handleConfirmTutorTrial}
          onReject={(payload) => void handleTutorWorkflowAction({ ...payload, action: "reject_trial" })}
        />
      ) : null}

      {isTutorTrialListOpen ? (
        <TutorTrialListDialog
          candidates={activeTutorTrialCandidates}
          isSubmitting={completeTutorTrialEndMutation.isPending || tutorWorkflowActionMutation.isPending}
          onClose={() => {
            setIsTutorTrialListOpen(false);
            setActiveTutorTrialDemandId(null);
          }}
          onConfirmEnd={handleCompleteTutorTrialEnd}
          onWorkflowAction={handleTutorWorkflowAction}
        />
      ) : null}

      {isTutorCertificationInfoOpen ? (
        <TutorCertificationInfoDialog
          onClose={() => setIsTutorCertificationInfoOpen(false)}
          onSave={handleSaveTutorCertificationInfo}
          profileDraft={user.profileDraft}
        />
      ) : null}

      {isTutorCalendarOpen ? (
        <TutorCalendarDialog
          initialDate={getTutorDateKey(new Date())}
          onClose={() => setIsTutorCalendarOpen(false)}
          tasks={tutorCalendarTasks}
        />
      ) : null}
    </main>
  );
}
