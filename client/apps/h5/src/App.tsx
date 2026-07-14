import { useGlobalStore, useGlobalUser } from "@h5/store/global";
import {
  useAcceptHuntingTask,
  useApplyTutorTrial,
  useClientAddresses,
  useCreateClientAddress,
  useCreateHuntingProject,
  useDecideHuntingTaskQuote,
  useHandleHuntingTaskFulfillmentAction,
  usePublishHuntingTask,
  usePublishTutorDemand,
  useQuoteHuntingTask,
  useUpdateClientAddress,
  useUpdateTutorExposure
} from "@unknown/hooks";
import { Banknote, MapPin, RadioTower } from "lucide-react";
import { getHuntingCertificationDataFromDraft } from "@components/HuntingCertificationCard/model";
import { HuntingProjectDialog } from "@components/HuntingProjectDialog";
import { PublishInfoDialog } from "@components/PublishInfoDialog";
import { TutorCalendarDialog } from "@components/TutorCalendar";
import { TutorCertificationInfoDialog } from "@components/TutorCertificationInfoDialog";
import { HuntingCertification } from "@pages/HuntingCertification";
import { TutorCertification } from "@pages/Tutor/TutorCertification";
import {
  campusAreaOptions,
  clientAddressesToAddressBookItems,
  clientAddressToAddressBookItem,
  getChildProfileOptions,
  getCurrentAddressDraft,
  profileDraftToClientAddressRequest
} from "@shared/clientPageModel";
import {
  buildPublishHuntingTaskRequest,
  buildPublishTutorDemandRequest,
  getLatestLocalPublishInfoDraft,
  isHuntingTaskPublishType,
  saveLocalPublishInfoDraft
} from "@tools/publishInfo";
import { getTutorCalendarTasks, getTutorDateKey } from "@tools/tutorCalendar";

/** 获取栈式次级页面的标题信息。 */
function getPageMeta(page: PageSurface, role: Role) {
  if (page === "mine") {
    return { title: "我的", eyebrow: roleLabels[role] };
  }
  if (page === "wallet") {
    return { title: "钱包详情", eyebrow: "可提现与观察期账户" };
  }
  if (page === "orders") {
    return { title: "订单详情", eyebrow: "订单与配送" };
  }
  if (page === "tutorCertification") {
    return { title: "家教认证", eyebrow: "资格认证" };
  }
  if (page === "huntingCertification") {
    return { title: "狩猎认证", eyebrow: "资格认证" };
  }
  return { title: "设置", eyebrow: "昵称与安全" };
}

/** 判断委托是否处在报价阶段，兼容迁移前旧状态文案。 */
function isHuntingQuoteStatus(task: HuntingTask) {
  return task.status.includes("报价");
}

/** 判断委托是否处在发布等待阶段，兼容迁移前旧状态文案。 */
function isHuntingPublishedStatus(task: HuntingTask) {
  return task.status.includes("发布") || task.status.includes("待领取");
}

/** 判断委托是否处在履约阶段，兼容迁移前旧状态文案。 */
function isHuntingFulfillingStatus(task: HuntingTask) {
  return task.status.includes("履约中") || task.status.includes("进行中") || task.status.includes("已领取");
}

/** 判断委托是否已取消，取消后的委托进入订单详情页。 */
function isHuntingCancelledStatus(task: HuntingTask) {
  return task.status.includes("取消");
}

/** 判断委托是否已完成，完成后的委托进入订单详情页。 */
function isHuntingCompletedStatus(task: HuntingTask) {
  return task.status.includes("完成");
}

/** 获取进行中弹窗内委托/狩猎卡片展示状态。 */
function getHuntingOngoingStatus(task: HuntingTask) {
  const hasPendingQuote = isHuntingQuoteStatus(task) && (Boolean(task.isQuotedByMe) || (task.quoteCount ?? 0) > 0);

  if (task.fulfillmentAction) {
    return "待确认";
  }
  if (hasPendingQuote) {
    return "报价确认中";
  }
  if (isHuntingFulfillingStatus(task)) {
    return "履约中";
  }
  if (isHuntingPublishedStatus(task) || isHuntingQuoteStatus(task)) {
    return "发布";
  }
  return task.status;
}

/** 获取进行中弹窗内委托/狩猎卡片金额展示文案。 */
function getHuntingOngoingAmountLabel(task: HuntingTask) {
  if (task.isQuotedByMe && typeof task.pendingAmount === "number") {
    return `报价：${formatCurrency(task.pendingAmount)}`;
  }
  if (task.isMine && isHuntingQuoteStatus(task) && (task.quoteCount ?? 0) > 0) {
    return `${task.quoteCount} 个报价`;
  }
  if (task.amountNegotiable || task.fee <= 0) {
    return "协商";
  }
  return formatCurrency(task.fee);
}

/** 获取履约中委托的对接方展示文案。 */
function getHuntingFulfillmentContact(task: HuntingTask) {
  if (task.isMine) {
    return task.acceptedUserName ? `履约方：${task.acceptedUserName}` : "履约方待确认";
  }

  return "发布方：" + (task.publisherName || "平台用户");
}

/** 判断报价是否等待发布方确认，兼容迁移前旧状态文案。 */
function isHuntingQuoteWaitingPublisher(status?: string) {
  return Boolean(status?.includes("待发布方确认") || status?.includes("待确认"));
}

/** 判断报价是否等待服务方确认。 */
function isHuntingQuoteWaitingHunter(status?: string) {
  return Boolean(status?.includes("待服务方确认"));
}

/** 获取服务方在进行中弹窗内可见的报价协商操作文案。 */
function getHuntingQuoteActionLabel(task: HuntingTask) {
  if (!task.isMine && task.isQuotedByMe && isHuntingQuoteWaitingHunter(task.pendingQuoteStatus)) {
    return "协商报价";
  }

  return undefined;
}

/** 将当前账号相关的发布方委托或服务方报价/履约任务转换为进行中弹窗展示项。 */
function getHuntingOngoingOrders(tasks: HuntingTask[], role: Role): ClientOrder[] {
  return tasks.filter((task) => {
    const isDelegationInProgress =
      Boolean(task.isMine) &&
      (isHuntingPublishedStatus(task) ||
        isHuntingQuoteStatus(task) ||
        isHuntingFulfillingStatus(task));
    const isQuotedHunting = Boolean(task.isQuotedByMe) && isHuntingQuoteStatus(task);
    const isHuntingInProgress = Boolean(task.isAcceptedByMe) && isHuntingFulfillingStatus(task);

    return isDelegationInProgress || isQuotedHunting || isHuntingInProgress;
  }).map((task) => {
    const isFulfilling = isHuntingFulfillingStatus(task);
    const isPublisher = Boolean(task.isMine);
    const isHunter = Boolean(task.isAcceptedByMe) && !isPublisher;
    const isCancelPending = task.fulfillmentAction === "取消待确认";

    return {
      amount: task.pendingAmount ?? task.fee,
      amountLabel: getHuntingOngoingAmountLabel(task),
      canCall: isPublisher && isFulfilling,
      canConfirmCancel: (isPublisher || isHunter) && isCancelPending,
      canConfirmComplete: isPublisher && task.fulfillmentAction === "完成待确认" && !task.fulfillmentActionByMe,
      canMessage: isFulfilling,
      canRepublish: isPublisher && isCancelPending,
      canRequestCancel: (isPublisher || isHunter) && isFulfilling && !task.fulfillmentAction,
      canRequestComplete: isHunter && isFulfilling && !task.fulfillmentAction,
      category: isPublisher ? "delegation" : "hunting",
      contact: isPublisher ? getHuntingFulfillmentContact(task) : isHuntingQuoteStatus(task) ? "我报价的委托" : "我履约的委托",
      detail: `${task.mode} · ${task.fulfillmentAction ?? task.latestTime} · ${task.destination ?? task.location}`,
      id: task.id,
      phoneNumber: isPublisher ? task.acceptedUserPhone ?? undefined : task.publisherPhone,
      quoteAmount: task.pendingAmount,
      quoteActionLabel: getHuntingQuoteActionLabel(task),
      quoteCount: isPublisher ? task.quoteCount : undefined,
      quoteId: task.pendingQuoteId,
      role,
      status: getHuntingOngoingStatus(task),
      title: task.title
    };
  });
}

/** 将完成和取消的委托转换为订单详情页历史订单。 */
function getHuntingHistoryOrders(tasks: HuntingTask[], role: Role): ClientOrder[] {
  return tasks
    .filter((task) => {
      const isRelatedToCurrentUser = Boolean(task.isMine || task.isAcceptedByMe || task.isQuotedByMe);
      return isRelatedToCurrentUser && (isHuntingCompletedStatus(task) || isHuntingCancelledStatus(task));
    })
    .map((task) => {
      const isPublisher = Boolean(task.isMine);
      const amount = task.pendingAmount ?? task.fee;
      const amountLabel =
        task.amountNegotiable && typeof task.pendingAmount !== "number" ? "协商" : formatCurrency(amount);
      const destination = task.destination ?? task.location;
      const requirementText = task.requirementTags?.length
        ? task.requirementTags.join("、")
        : task.requirement || "暂无要求";
      const isCancelled = isHuntingCancelledStatus(task);

      return {
        amount,
        amountLabel,
        canRepublish: isPublisher && isCancelled,
        category: isPublisher ? "delegation" : "hunting",
        contact: getHuntingFulfillmentContact(task),
        detail: `发布时间：${task.publishTime ?? "未知"} · 目的地：${destination} · 要求：${requirementText}`,
        id: task.id,
        phoneNumber: isPublisher ? task.acceptedUserPhone ?? undefined : task.publisherPhone,
        role,
        status: isCancelled ? "已取消委托" : "已完成委托",
        title: task.title
      };
    });
}

/** 获取委托任务金额展示文案，协商任务不展示 0 元。 */
function getHuntingTaskAmountText(task: HuntingTask) {
  return task.amountNegotiable || task.fee <= 0 ? "协商" : formatCurrency(task.fee);
}

/** 获取狩猎快捷开启后系统推荐的委托任务。 */
function getRecommendedHuntingTasks(tasks: HuntingTask[], project: HuntingProject | null) {
  const recommendableStatusKeywords = ["发布", "待", "报价", "领取", "已发布"];
  const projectAreas = project
    ? [project.currentArea, ...project.nextStops.map((stop) => stop.inputMode === "custom" ? stop.customArea : stop.area)]
        .map((area) => area.trim())
        .filter(Boolean)
    : [];

  return tasks
    .filter(
      (task) =>
        !task.isMine &&
        !isHuntingFulfillingStatus(task) &&
        recommendableStatusKeywords.some((keyword) => task.status.includes(keyword))
    )
    .sort((leftTask, rightTask) => {
      const getScore = (task: HuntingTask) => {
        if (projectAreas.length === 0) {
          return 0;
        }

        const searchText = `${task.destination ?? ""} ${task.location} ${task.title}`;
        return projectAreas.some((area) => searchText.includes(area)) ? 1 : 0;
      };

      return getScore(rightTask) - getScore(leftTask);
    })
    .slice(0, 9);
}

/** 获取委托发布时间展示文案。 */
function getHuntingTaskPublishTimeText(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");

  return `${month}-${day} ${hour}:${minute}`;
}

/** 判断报价是否仍处于协商中。 */
function isNegotiatingHuntingQuote(quote: HuntingQuote | null) {
  if (!quote) {
    return false;
  }
  return !quote.status.includes("已拒绝") && !quote.status.includes("未选中") && !quote.status.includes("已确认");
}

/** 判断当前账号是否可以确认选中的报价。 */
function canConfirmHuntingQuote(task: HuntingTask | null, quote: HuntingQuote | null) {
  if (!task || !quote) {
    return false;
  }
  if (task.isMine) {
    return isHuntingQuoteWaitingPublisher(quote.status);
  }
  return Boolean(task.isQuotedByMe) && isHuntingQuoteWaitingHunter(quote.status);
}

/** 判断当前账号是否可以向对方发起协商报价。 */
function canCounterHuntingQuote(task: HuntingTask | null, quote: HuntingQuote | null) {
  if (!task || !quote || !isNegotiatingHuntingQuote(quote)) {
    return false;
  }
  if (task.isMine) {
    return isHuntingQuoteWaitingPublisher(quote.status);
  }

  return Boolean(task.isQuotedByMe) && isHuntingQuoteWaitingHunter(quote.status);
}

/** 判断输入金额是否构成一次新的协商报价。 */
function hasValidCounterQuoteAmount(quote: HuntingQuote | null, value: string) {
  if (!quote) {
    return false;
  }
  const amount = Number(value.trim());

  return Number.isFinite(amount) && amount > 0 && Math.abs(amount - quote.amount) >= 0.01;
}

/** 判断输入金额是否是无效的协商报价，避免误触发确认。 */
function hasInvalidCounterQuoteAmount(quote: HuntingQuote | null, value: string) {
  if (!quote || value.trim() === "") {
    return false;
  }
  const amount = Number(value.trim());

  return !Number.isFinite(amount) || (Math.abs(amount - quote.amount) >= 0.01 && amount <= 0);
}

/** 判断报价是否已经由发布方协商并等待服务方确认，此时发布方不能再次选择处理。 */
function isQuoteLockedForPublisher(task: HuntingTask | null, quote: HuntingQuote) {
  return Boolean(task?.isMine && isHuntingQuoteWaitingHunter(quote.status));
}

/** 判断报价是否存在协商价，存在时列表同时展示原始报价和当前协商价。 */
function hasCounterQuoteAmount(quote: HuntingQuote) {
  return typeof quote.originalAmount === "number" && Math.abs(quote.originalAmount - quote.amount) >= 0.01;
}

/** React Query 首次返回数据前使用的稳定空地址，避免 effect 因默认数组反复触发。 */
const emptyClientAddresses: ClientAddress[] = [];

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
  const [activeTab, setActiveTab] = useState<ClientModuleKey>(() => getDefaultPrimaryTab(role));
  const [pageStack, setPageStack] = useState<PageSurface[]>([]);
  const [isOngoingOpen, setIsOngoingOpen] = useState(false);
  const [ongoingQuoteTaskId, setOngoingQuoteTaskId] = useState<string | null>(null);
  const [selectedOngoingQuoteId, setSelectedOngoingQuoteId] = useState("");
  const [quoteCounterAmount, setQuoteCounterAmount] = useState("");
  const [isMineOpen, setIsMineOpen] = useState(false);
  const [isQuickDockExpanded, setIsQuickDockExpanded] = useState(true);
  const [isTutorCalendarOpen, setIsTutorCalendarOpen] = useState(false);
  const [isTutorCertificationInfoOpen, setIsTutorCertificationInfoOpen] = useState(false);
  const [isPublishInfoOpen, setIsPublishInfoOpen] = useState(false);
  const [publishInfoInitialType, setPublishInfoInitialType] = useState<PublishInfoType>("delegation");
  const [publishInfoInitialDraft, setPublishInfoInitialDraft] = useState<PublishInfoDraft | null>(null);
  const [pendingPublishDraft, setPendingPublishDraft] = useState<LocalPublishInfoDraft | null>(null);
  const [pendingPublishType, setPendingPublishType] = useState<PublishInfoType>("delegation");
  const [isHuntingProjectOpen, setIsHuntingProjectOpen] = useState(false);
  const [isHuntingRecommendationOpen, setIsHuntingRecommendationOpen] = useState(false);
  const [isHuntingShortcutEnabled, setIsHuntingShortcutEnabled] = useState(false);
  const [huntingShortcutProject, setHuntingShortcutProject] = useState<HuntingProject | null>(null);
  const [publishedHuntingTasks, setPublishedHuntingTasks] = useState<HuntingTask[]>([]);
  const [isTutorApplicationOpen, setIsTutorApplicationOpen] = useState(false);
  const avatarClickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const avatarLastClickAt = useRef(0);
  const { hideMessage, showMessage, toast } = useMessageToast();
  const [checkout, setCheckout] = useState<CheckoutState | null>(null);
  const [savedProfileDraft, setSavedProfileDraft] = useState<ProfileDraftState>(() => getStoredProfileDraft(user.phone));
  const [profileDraft, setProfileDraft] = useState<ProfileDraftState>(() => getStoredProfileDraft(user.phone));
  const [isProfileCompletionOpen, setIsProfileCompletionOpen] = useState(false);
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
    data: clientAddresses = emptyClientAddresses,
    error: addressError,
    isLoading: isAddressLoading
  } = useClientAddresses(isAuthenticated, user.session?.accessToken);
  const purchaseMutation = usePurchaseProduct();
  const publishHuntingTaskMutation = usePublishHuntingTask();
  const publishTutorDemandMutation = usePublishTutorDemand();
  const createHuntingProjectMutation = useCreateHuntingProject();
  const applyTutorTrialMutation = useApplyTutorTrial();
  const updateTutorExposureMutation = useUpdateTutorExposure();
  const acceptHuntingTaskMutation = useAcceptHuntingTask();
  const quoteHuntingTaskMutation = useQuoteHuntingTask();
  const decideHuntingTaskQuoteMutation = useDecideHuntingTaskQuote();
  const huntingTaskFulfillmentActionMutation = useHandleHuntingTaskFulfillmentAction();
  const createAddressMutation = useCreateClientAddress();
  const updateAddressMutation = useUpdateClientAddress();
  const addressItems = useMemo(() => clientAddressesToAddressBookItems(clientAddresses), [clientAddresses]);

  const roleOrders = useMemo(
    () => (workspaceResponse?.orders ?? []).filter((order) => order.role === role),
    [workspaceResponse?.orders, role]
  );
  const baseOngoingOrders = useMemo(() => roleOrders, [roleOrders]);
  const hasPaymentRisk = roleOrders.some((order) => order.risk === "payment");
  const currentAddressDraft = useMemo(() => getCurrentAddressDraft(addressItems, {}), [addressItems]);
  const profileRequirement = getProfileRequirement(role, activeTab, currentAddressDraft);
  const profileCompletionTemplate = getProfileRequirementTemplate(role, activeTab);
  const activePage = pageStack.length > 0 ? pageStack[pageStack.length - 1] : null;
  const dataError = homeError ?? workspaceError ?? addressError;
  const isInitialDataLoading = isHomeLoading || isWorkspaceLoading || isAddressLoading;
  const huntingCertificationStatus = useMemo(
    () => getHuntingCertificationDataFromDraft(user.profileDraft).certificationStatus,
    [user.profileDraft]
  );
  const tutorCalendarTasks = useMemo(() => getTutorCalendarTasks(user.profileDraft), [user.profileDraft]);
  const publishAddressItems = addressItems;
  const refreshWorkspace = useCallback(() => {
    void refetchWorkspace();
  }, [refetchWorkspace]);

  function clearAvatarClickTimer() {
    if (!avatarClickTimer.current) {
      return;
    }

    clearTimeout(avatarClickTimer.current);
    avatarClickTimer.current = null;
  }

  /** 关闭家教相关全局弹窗，避免路由切换后残留。 */
  function closeTutorDialogs() {
    setIsTutorCalendarOpen(false);
    setIsTutorCertificationInfoOpen(false);
  }

  /** 关闭狩猎快捷相关弹窗，保持页面切换后的浮层状态一致。 */
  function closeHuntingShortcutDialogs() {
    setIsHuntingRecommendationOpen(false);
    setIsHuntingProjectOpen(false);
  }

  function handleAvatarClick() {
    const now = Date.now();

    clearAvatarClickTimer();
    if (now - avatarLastClickAt.current < 320) {
      avatarLastClickAt.current = 0;
      setIsMineOpen(false);
      setIsQuickDockExpanded((value) => !value);
      return;
    }

    avatarLastClickAt.current = now;
    avatarClickTimer.current = setTimeout(() => {
      avatarLastClickAt.current = 0;
      setIsMineOpen((value) => !value);
      avatarClickTimer.current = null;
    }, 260);
  }

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
          void refetchWorkspace();
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

    setUserProfileDraft(nextProfileDraft);
    setSavedProfileDraft(nextProfileDraft);
    setProfileDraft(nextProfileDraft);
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
    const storedProfileDraft = getStoredProfileDraft(session.phone);

    setUserSession(session);
    setActiveTab(getDefaultPrimaryTab(session.role));
    setPageStack([]);
    setIsOngoingOpen(false);
    setIsMineOpen(false);
    setIsQuickDockExpanded(true);
    setIsProfileCompletionOpen(false);
    setIsPublishInfoOpen(false);
    setPublishedHuntingTasks([]);
    setIsTutorApplicationOpen(false);
    setIsHuntingShortcutEnabled(false);
    setHuntingShortcutProject(null);
    closeTutorDialogs();
    closeHuntingShortcutDialogs();
    setSavedProfileDraft(storedProfileDraft);
    setProfileDraft(storedProfileDraft);
    showMessage(session.profileCompletionRequired ? "登录成功，可稍后进入设置补充资料。" : "登录成功。", {
      type: "success"
    });
    setCheckout(null);
    navigate(getDefaultRouteForRole(session.role), { replace: true });
  }

  function handleLogout() {
    clearUser();
    setActiveTab(getDefaultPrimaryTab("student"));
    setPageStack([]);
    setIsOngoingOpen(false);
    setIsMineOpen(false);
    setIsQuickDockExpanded(true);
    setIsProfileCompletionOpen(false);
    setIsPublishInfoOpen(false);
    setPublishedHuntingTasks([]);
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
    setActiveTab(tab);
    setPageStack([]);
    setIsOngoingOpen(false);
    setIsMineOpen(false);
    setIsQuickDockExpanded(true);
    setIsProfileCompletionOpen(false);
    setIsPublishInfoOpen(false);
    closeTutorDialogs();
    closeHuntingShortcutDialogs();
    navigate(getRouteForTab(tab));
  }

  function handleNavigate(page: PageSurface) {
    if (page === "settings" || page === "mine") {
      navigate(page === "settings" ? "/settings" : "/mine", {
        state: page === "settings" && location.pathname === "/mine" ? { from: "mine" } : undefined
      });
      setPageStack([]);
      setIsMineOpen(false);
      setIsOngoingOpen(false);
      setIsQuickDockExpanded(true);
      setIsProfileCompletionOpen(false);
      setIsPublishInfoOpen(false);
      closeTutorDialogs();
      closeHuntingShortcutDialogs();
      return;
    }

    setPageStack((stack) => [...stack, page]);
    setIsMineOpen(false);
    setIsOngoingOpen(false);
    setIsQuickDockExpanded(true);
    setIsProfileCompletionOpen(false);
    setIsPublishInfoOpen(false);
    closeTutorDialogs();
    closeHuntingShortcutDialogs();
  }

  function handleBack() {
    setPageStack((stack) => stack.slice(0, -1));
    setIsMineOpen(false);
    setIsQuickDockExpanded(true);
    setIsProfileCompletionOpen(false);
    setIsPublishInfoOpen(false);
    closeTutorDialogs();
    closeHuntingShortcutDialogs();
  }

  // 购买前置资料校验属于跨模块流程，因此在根节点统一处理。
  function handleOpenCheckout(product: ProductSummary) {
    const featuredRequirement = getProfileRequirement(role, "featured", currentAddressDraft);

    if (featuredRequirement) {
      showMessage(`请先补充${featuredRequirement.missingFields.map((field) => field.label).join("、")}`, {
        type: "warning"
      });
      setIsProfileCompletionOpen(true);
      return;
    }

    setCheckout({
      product,
      deliveryMode: getDefaultDeliveryMode(role, product),
      paymentMethod: "wechat"
    });
  }

  function handleProfileDraftChange(key: string, value: string) {
    setProfileDraft((draft) => ({
      ...draft,
      [key]: value
    }));
  }

  function handleSaveProfileDraft() {
    const nextProfileDraft = {
      ...savedProfileDraft,
      ...getFilledProfileDraft(profileDraft)
    };
    const payload = profileDraftToClientAddressRequest(nextProfileDraft, true);
    const currentAddressId = addressItems.find((item) => item.isCurrent)?.id;
    const handleSuccess = (address: ClientAddress) => {
      const nextAddressDraft = clientAddressToAddressBookItem(address).draft;

      setSavedProfileDraft(nextAddressDraft);
      setProfileDraft(nextAddressDraft);
      setUserProfileDraft({
        ...user.profileDraft,
        ...nextAddressDraft
      });
      setIsProfileCompletionOpen(false);
      showMessage("资料已保存，当前模块可以继续操作。", { type: "success" });
      void refetchHome();
    };
    const handleError = (error: unknown) => {
      showMessage(getErrorMessage(error, "资料保存失败，请稍后重试。"), { type: "error" });
    };

    if (currentAddressId) {
      updateAddressMutation.mutate({ ...payload, addressId: currentAddressId }, {
        onSuccess: handleSuccess,
        onError: handleError
      });
      return;
    }

    createAddressMutation.mutate(payload, {
      onSuccess: handleSuccess,
      onError: handleError
    });
  }

  function handleOpenProfileCompletion() {
    setProfileDraft(savedProfileDraft);
    setIsMineOpen(false);
    setIsOngoingOpen(false);
    setIsQuickDockExpanded(true);
    setIsProfileCompletionOpen(true);
    setIsPublishInfoOpen(false);
    closeTutorDialogs();
    closeHuntingShortcutDialogs();
  }

  /** 按类型打开发布信息弹窗，打开前先检查本地草稿。 */
  function requestOpenPublishInfo(type: PublishInfoType) {
    setIsMineOpen(false);
    setIsOngoingOpen(false);
    setIsQuickDockExpanded(true);
    setIsProfileCompletionOpen(false);
    closeTutorDialogs();
    closeHuntingShortcutDialogs();

    const latestDraft = getLatestLocalPublishInfoDraft(type);
    if (latestDraft) {
      setPendingPublishDraft(latestDraft);
      setPendingPublishType(type);
      setIsPublishInfoOpen(false);
      return;
    }

    openPublishInfo(type, null);
  }

  /** 使用指定草稿打开发布信息弹窗。 */
  function openPublishInfo(type: PublishInfoType, draft: PublishInfoDraft | null) {
    setPublishInfoInitialType(type);
    setPublishInfoInitialDraft(draft);
    setPendingPublishDraft(null);
    setIsPublishInfoOpen(true);
  }

  /** 打开发布信息弹窗。 */
  function handleOpenPublishInfo() {
    requestOpenPublishInfo(role === "parent" ? "tutor" : "delegation");
  }

  /** 打开回收发布弹窗，复用发布表单但固定为回收类型。 */
  function handleOpenRecycleInfo() {
    requestOpenPublishInfo("recycle");
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

        setUserProfileDraft(nextProfileDraft);
        setSavedProfileDraft(nextProfileDraft);
        setProfileDraft(nextProfileDraft);
        showMessage(response.enabled ? "开启家教，认证信息可被查看，我的-家教卡片可修改信息。" : "已关闭家教资料公开。", {
          type: "success"
        });
        void refetchHome();
        void refetchWorkspace();
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

    setUserProfileDraft(filledProfileDraft);
    setSavedProfileDraft(filledProfileDraft);
    setProfileDraft(filledProfileDraft);
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

  /** 保存发布信息草稿，暂不进入业务列表。 */
  function handleSavePublishInfo(draft: PublishInfoDraft) {
    try {
      saveLocalPublishInfoDraft(draft, "draft");
      setIsPublishInfoOpen(false);
      showMessage("发布草稿已保存。", { type: "success" });
    } catch {
      showMessage("发布草稿保存失败，请检查浏览器存储权限。", { type: "error" });
    }
  }

  /** 发布委托或回收任务；家教发布当前在 H5 侧进入进行中，后续接入真实接口。 */
  function handlePublishInfo(draft: PublishInfoDraft) {
    if (draft.type === "tutor") {
      const payload = buildPublishTutorDemandRequest(draft, publishAddressItems, publishChildOptions);

      publishTutorDemandMutation.mutate(payload, {
        onSuccess: () => {
          saveLocalPublishInfoDraft(draft, "published");
          setIsPublishInfoOpen(false);
          setActiveTab("tutor");
          setPageStack([]);
          navigate(getRouteForTab("tutor"));
          showMessage("家教需求已发布，已加入进行中列表。", { type: "success" });
          void refetchWorkspace();
        },
        onError: (error) => {
          showMessage(getErrorMessage(error, "家教发布失败，请稍后重试。"), { type: "error" });
        }
      });
      return;
    }

    if (!isHuntingTaskPublishType(draft.type)) {
      try {
        saveLocalPublishInfoDraft(draft, "draft");
        setIsPublishInfoOpen(false);
        showMessage("当前仅委托和回收接入真实发布，已先保存为草稿。", { type: "warning" });
      } catch {
        showMessage("发布草稿保存失败，请检查浏览器存储权限。", { type: "error" });
      }
      return;
    }

    try {
      const payload = buildPublishHuntingTaskRequest(draft, publishAddressItems);
      const publishTypeLabel = draft.type === "recycle" ? "回收" : "委托";

      publishHuntingTaskMutation.mutate(payload, {
        onSuccess: (task) => {
          const publishedTask: HuntingTask = {
            ...task,
            amountNegotiable: Boolean(payload.amountNegotiable),
            depositAmount: payload.depositAmount ?? 0,
            depositRequired: Boolean(payload.depositRequired),
            description: payload.description,
            destination: payload.destination ?? payload.location,
            fee: payload.amountNegotiable ? 0 : task.fee,
            isMine: true,
            publishTime: task.publishTime ?? getHuntingTaskPublishTimeText(new Date()),
            quoteCount: task.quoteCount ?? 0,
            quotes: task.quotes ?? [],
            requirement: payload.requirement,
            requirementTags: payload.requirementTags ?? [],
            status: task.status
          };

          setPublishedHuntingTasks((tasks) => [
            publishedTask,
            ...tasks.filter((item) => item.id !== publishedTask.id)
          ]);
          setIsPublishInfoOpen(false);
          showMessage(`${publishTypeLabel}已发布，可在委托列表查看。`, { type: "success" });
          setActiveTab("hunting");
          setPageStack([]);
          navigate(getRouteForTab("hunting"));
          void refetchWorkspace();
        },
        onError: (error) => {
          showMessage(getErrorMessage(error, `${publishTypeLabel}发布失败，请稍后重试。`), { type: "error" });
        }
      });
    } catch (error) {
      showMessage(getErrorMessage(error, "发布信息校验失败，请检查表单内容。"), { type: "error" });
    }
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

  /** 接受固定金额委托，服务端负责锁单和押金冻结校验。 */
  async function handleAcceptHuntingTask(task: HuntingTask) {
    try {
      await acceptHuntingTaskMutation.mutateAsync(task.id);
      showMessage("已接受委托，任务已进入履约中。", { type: "success" });
      void refetchWorkspace();
    } catch (error) {
      showMessage(getErrorMessage(error, "接受委托失败，请稍后重试。"), { type: "error" });
      throw error;
    }
  }

  /** 提交协商金额报价，发布方确认后才会进入履约。 */
  async function handleQuoteHuntingTask(task: HuntingTask, amount: number) {
    try {
      await quoteHuntingTaskMutation.mutateAsync({ amount, taskId: task.id });
      showMessage(`报价 ${formatCurrency(amount)} 已提交，等待发布方确认。`, { type: "success" });
      void refetchWorkspace();
    } catch (error) {
      showMessage(getErrorMessage(error, "提交报价失败，请稍后重试。"), { type: "error" });
      throw error;
    }
  }

  /** 发布方确认报价，确认成功后委托进入履约中。 */
  async function handleConfirmHuntingQuote(task: HuntingTask, quote: HuntingQuote) {
    try {
      await decideHuntingTaskQuoteMutation.mutateAsync({ action: "confirm", quoteId: quote.id, taskId: task.id });
      showMessage(`已确认 ${quote.bidderName} 的报价，委托进入履约中。`, { type: "success" });
      void refetchWorkspace();
    } catch (error) {
      showMessage(getErrorMessage(error, "确认报价失败，请稍后重试。"), { type: "error" });
      throw error;
    }
  }

  /** 拒绝进行中弹窗内选中的委托报价，报价将失效并保留委托待报价状态。 */
  async function handleRejectHuntingQuote(task: HuntingTask, quote: HuntingQuote) {
    try {
      await decideHuntingTaskQuoteMutation.mutateAsync({ action: "reject", quoteId: quote.id, taskId: task.id });
      showMessage("已拒绝报价，委托将继续等待其他报价。", { type: "success" });
      void refetchWorkspace();
    } catch (error) {
      showMessage(getErrorMessage(error, "拒绝报价失败，请稍后重试。"), { type: "error" });
      throw error;
    }
  }

  /** 修改报价金额后推送给对方确认。 */
  async function handleCounterHuntingQuote(task: HuntingTask, quote: HuntingQuote, amount: number) {
    try {
      await decideHuntingTaskQuoteMutation.mutateAsync({
        action: "counter",
        amount,
        quoteId: quote.id,
        taskId: task.id
      });
      showMessage("已提交修改后的报价，等待对方确认。", { type: "success" });
      void refetchWorkspace();
    } catch (error) {
      showMessage(getErrorMessage(error, "提交修改报价失败，请稍后重试。"), { type: "error" });
      throw error;
    }
  }

  /** 处理履约中委托的取消、完成确认和再次发布动作。 */
  async function handleHuntingTaskFulfillmentAction(
    order: ClientOrder,
    action: HuntingTaskFulfillmentActionRequest["action"]
  ) {
    const actionMessages: Record<HuntingTaskFulfillmentActionRequest["action"], string> = {
      confirm_cancel: "已确认取消委托，已进入订单详情。",
      confirm_complete: "已确认完成委托。",
      republish: "委托已再次发布。",
      request_cancel: "取消委托申请已提交，等待对方确认。",
      request_complete: "完成委托申请已提交，等待发布方确认。"
    };

    try {
      const task = mergedHuntingTasks.find((item) => item.id === order.id);

      if (action === "republish" && task?.fulfillmentAction === "取消待确认") {
        await huntingTaskFulfillmentActionMutation.mutateAsync({ action: "confirm_cancel", taskId: order.id });
        await huntingTaskFulfillmentActionMutation.mutateAsync({ action: "republish", taskId: order.id });
        showMessage("已取消原委托并重新发布。", { type: "success" });
        void refetchWorkspace();
        return;
      }

      await huntingTaskFulfillmentActionMutation.mutateAsync({ action, taskId: order.id });
      showMessage(actionMessages[action], { type: "success" });
      void refetchWorkspace();
    } catch (error) {
      showMessage(getErrorMessage(error, "委托履约操作失败，请稍后重试。"), { type: "error" });
      throw error;
    }
  }

  /** 当前阶段消息按钮用于进入后续沟通能力的提示。 */
  function handleOngoingOrderMessage(order: ClientOrder) {
    showMessage(`${order.title} 的消息能力后续接入。`, { type: "warning" });
  }

  /** 电话按钮展示当前接口返回的脱敏联系电话。 */
  function handleOngoingOrderCall(order: ClientOrder) {
    showMessage(order.phoneNumber ? `联系电话：${order.phoneNumber}` : "暂无可用联系电话。", { type: "success" });
  }

  /** 学生端提交家教试课申请，申请记录由服务端进入进行中列表。 */
  function handleApplyTutorTrial(job: TutorTrialJob) {
    applyTutorTrialMutation.mutate(
      { demandId: job.id, message: "申请试课" },
      {
        onSuccess: () => {
          setIsOngoingOpen(true);
          showMessage("试课申请已提交，可在进行中查看状态。", { type: "success" });
          void refetchWorkspace();
        },
        onError: (error) => {
          showMessage(getErrorMessage(error, "试课申请提交失败，请稍后重试。"), { type: "error" });
        }
      }
    );
  }

  /** 打开家长端试课申请选择弹窗。 */
  function handleOpenTutorApplications() {
    setIsTutorApplicationOpen(true);
  }

  /** 当前阶段家教试课动作先以消息承接，等待后端流程接口补齐。 */
  function handleTutorWorkflowMessage(message: string) {
    showMessage(message, { type: "success" });
  }

  function handleSubmitPurchase() {
    if (!checkout) {
      return;
    }

    purchaseMutation.mutate(
      {
        productId: checkout.product.id,
        role,
        deliveryMode: checkout.deliveryMode,
        paymentMethod: checkout.paymentMethod,
        quantity: 1
      },
      {
        onSuccess: (order) => {
          showMessage(
            `订单 ${order.orderId} 已创建，状态：${order.status}，应付 ${formatCurrency(order.payableAmount)}。`,
            {
              type: "success"
            }
          );
          setCheckout(null);
          handleNavigate("orders");
        },
        onError: (error) => {
          showMessage(getErrorMessage(error, "购买失败，请稍后重试。"), { type: "error" });
        }
      }
    );
  }

  const pageMeta = activePage ? getPageMeta(activePage, role) : null;
  const isSettingsRoute = location.pathname === "/settings";
  const isMineRoute = location.pathname === "/mine";
  const settingsRouteState = location.state as { from?: string } | null;
  const settingsBackRoute = settingsRouteState?.from === "mine" ? "/mine" : getRouteForTab(activeTab);

  useEffect(() => {
    if (isAuthenticated && homeData?.profile) {
      syncUserProfile(homeData.profile);
    }
  }, [homeData?.profile, isAuthenticated, syncUserProfile]);

  useEffect(() => {
    const nextAddressDraft = getCurrentAddressDraft(addressItems, {});

    setSavedProfileDraft(nextAddressDraft);
    if (!isProfileCompletionOpen) {
      setProfileDraft(nextAddressDraft);
    }
  }, [addressItems, isProfileCompletionOpen]);

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
      setActiveTab(routeTab);
      setPageStack([]);
      setIsMineOpen(false);
      setIsOngoingOpen(false);
      setIsQuickDockExpanded(true);
      setIsProfileCompletionOpen(false);
    }
  }, [activeTab, isAuthenticated, location.pathname, navigate, role]);

  useEffect(
    () => () => {
      if (avatarClickTimer.current) {
        clearTimeout(avatarClickTimer.current);
      }
    },
    []
  );

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

  const workspaceData = workspaceResponse;
  const mergedHuntingTasks = [
    ...publishedHuntingTasks,
    ...workspaceData.huntingTasks.filter(
      (task) => !publishedHuntingTasks.some((publishedTask) => publishedTask.id === task.id)
    )
  ];
  const tutorTrialJobs: TutorTrialJob[] = workspaceData.tutorDemands
    .filter((demand) => demand.sourceType !== "tutorStudent")
    .map((demand) => ({
      address: demand.addressLabel ?? demand.school,
      budget: demand.budget,
      description: demand.description ?? `${demand.child} 需要 ${demand.subject} 家教，学校：${demand.school}`,
      id: demand.id,
      parentPhone: demand.publisherPhone ?? "家长电话待平台授权",
      period: demand.period ?? demand.status,
      publisher: demand.publisherName ?? "家长用户",
      requirement: `${demand.subject} · ${demand.school}`,
      status: demand.status,
      subject: demand.subject,
      title: demand.title ?? `${demand.child}${demand.subject}家教`
    }));
  const tutorApplicationCandidates: TutorApplicationCandidate[] = workspaceData.tutorDemands
    .flatMap((demand) => demand.applicants)
    .map((applicant) => ({
      id: applicant.id,
      major: applicant.major,
      name: applicant.name,
      school: applicant.school,
      status: applicant.status
    }));
  const ongoingOrders = [
    ...getHuntingOngoingOrders(mergedHuntingTasks, role),
    ...baseOngoingOrders
  ];
  const orderDetailOrders = [...getHuntingHistoryOrders(mergedHuntingTasks, role), ...roleOrders];
  const recommendedHuntingTasks = getRecommendedHuntingTasks(mergedHuntingTasks, huntingShortcutProject);
  const publishChildOptions = getChildProfileOptions(user.profileDraft);
  const ongoingQuoteTask = ongoingQuoteTaskId
    ? mergedHuntingTasks.find((task) => task.id === ongoingQuoteTaskId) ?? null
    : null;
  const selectedOngoingQuote =
    ongoingQuoteTask?.quotes?.find((quote) => quote.id === selectedOngoingQuoteId) ?? null;
  const canConfirmSelectedOngoingQuote = canConfirmHuntingQuote(ongoingQuoteTask, selectedOngoingQuote);
  const canCounterSelectedOngoingQuote = canCounterHuntingQuote(ongoingQuoteTask, selectedOngoingQuote);
  const hasCounterInputAmount = hasValidCounterQuoteAmount(selectedOngoingQuote, quoteCounterAmount);
  const hasInvalidCounterAmount = hasInvalidCounterQuoteAmount(selectedOngoingQuote, quoteCounterAmount);
  const isCounterOngoingQuoteAction = canCounterSelectedOngoingQuote && hasCounterInputAmount;
  const canRejectSelectedOngoingQuote = canConfirmSelectedOngoingQuote || canCounterSelectedOngoingQuote;
  const canSubmitSelectedOngoingQuote =
    !hasInvalidCounterAmount && (canConfirmSelectedOngoingQuote || isCounterOngoingQuoteAction);
  const ongoingQuoteActionLabel = isCounterOngoingQuoteAction
    ? "协商报价"
    : selectedOngoingQuote
      ? "确认报价"
      : "选择报价";
  const ongoingQuoteCounterPrompt = ongoingQuoteTask?.isMine
    ? "输入协商金额后推送给报价方"
    : "输入协商金额后推送给发布方";
  const hasPrimaryContextCard = Boolean(profileRequirement) && !activePage && !isSettingsRoute && !isMineRoute;
  const isPrimaryListShell =
    (activeTab === "featured" || activeTab === "partTime") && !activePage && !isSettingsRoute && !isMineRoute;

  /** 从进行中弹窗打开当前委托的报价列表。 */
  function handleOpenOngoingQuoteList(order: ClientOrder) {
    const task = mergedHuntingTasks.find((item) => item.id === order.id);
    if (!task || !task.quotes || task.quotes.length === 0) {
      showMessage("当前委托暂无可查看报价。", { type: "warning" });
      return;
    }

    const initialQuote =
      order.category === "hunting" && order.quoteId
        ? task.quotes.find((quote) => quote.id === order.quoteId) ?? null
        : null;

    setOngoingQuoteTaskId(task.id);
    setSelectedOngoingQuoteId(initialQuote?.id ?? "");
    setQuoteCounterAmount(initialQuote ? String(initialQuote.amount) : "");
  }

  /** 关闭进行中入口打开的报价列表弹窗。 */
  function handleCloseOngoingQuoteList() {
    setOngoingQuoteTaskId(null);
    setSelectedOngoingQuoteId("");
    setQuoteCounterAmount("");
  }

  /** 根据输入金额确认报价或发起协商报价。 */
  function handleSubmitOngoingQuoteAction() {
    if (!ongoingQuoteTask || !selectedOngoingQuote) {
      return;
    }

    if (isCounterOngoingQuoteAction) {
      const amount = Number(quoteCounterAmount);

      void Promise.resolve(handleCounterHuntingQuote(ongoingQuoteTask, selectedOngoingQuote, amount))
        .then(handleCloseOngoingQuoteList)
        .catch(() => undefined);
      return;
    }

    void Promise.resolve(handleConfirmHuntingQuote(ongoingQuoteTask, selectedOngoingQuote))
      .then(handleCloseOngoingQuoteList)
      .catch(() => undefined);
  }

  /** 拒绝进行中弹窗内选中的委托报价。 */
  function handleRejectOngoingQuote() {
    if (!ongoingQuoteTask || !selectedOngoingQuote) {
      return;
    }

    void Promise.resolve(handleRejectHuntingQuote(ongoingQuoteTask, selectedOngoingQuote))
      .then(handleCloseOngoingQuoteList)
      .catch(() => undefined);
  }

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
      <MessageToast onClose={hideMessage} toast={toast} />
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
        <SettingsView onBack={() => navigate(settingsBackRoute, { replace: true })} onMessage={showMessage} />
      ) : (
        <>
          <ProfileContextCard onOpenCompletion={handleOpenProfileCompletion} requirement={profileRequirement} />

          <Routes>
            <Route
              path="/featured"
              element={
                <Featured
                  onOpenCheckout={handleOpenCheckout}
                  purchasePending={purchaseMutation.isPending}
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
                  isRefreshing={isWorkspaceFetching}
                  onAcceptTask={handleAcceptHuntingTask}
                  onCertificationReviewing={() =>
                    showMessage("狩猎认证系统审批中...", {
                      type: "warning"
                    })
                  }
                  onOpenHuntingCertification={() => handleNavigate("huntingCertification")}
                  onQuoteTask={handleQuoteHuntingTask}
                  onRefreshTasks={refreshWorkspace}
                  onSelfTaskAction={() =>
                    showMessage("不能联系、报价或接受自己发布的委托。", {
                      type: "warning"
                    })
                  }
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
          maxHeight="min(72vh, 620px)"
          onCallOrder={handleOngoingOrderCall}
          onClose={() => setIsOngoingOpen(false)}
          onConfirmCancel={(order) => void handleHuntingTaskFulfillmentAction(order, "confirm_cancel")}
          onConfirmComplete={(order) => void handleHuntingTaskFulfillmentAction(order, "confirm_complete")}
          onMessageOrder={handleOngoingOrderMessage}
          onOpenQuoteList={handleOpenOngoingQuoteList}
          onOpenTutorApplications={handleOpenTutorApplications}
          onOpenTrialResult={() => handleTutorWorkflowMessage("试课结果流程待后端结算接口接入。")}
          onOpenTrialSchedule={() => handleTutorWorkflowMessage("试课日程已记录，等待双方确认。")}
          onRejectTrial={() => handleTutorWorkflowMessage("已拒绝试课申请。")}
          onAgreeTrial={() => handleTutorWorkflowMessage("已同意试课，家教兼职进入试课流程。")}
          onRepublish={(order) => void handleHuntingTaskFulfillmentAction(order, "republish")}
          onRequestCancel={(order) => void handleHuntingTaskFulfillmentAction(order, "request_cancel")}
          onRequestComplete={(order) => void handleHuntingTaskFulfillmentAction(order, "request_complete")}
          orders={ongoingOrders}
        />
      ) : null}

      {ongoingQuoteTask ? (
        <section className="checkout-sheet" aria-label="报价列表">
          <div className="sheet-backdrop" onClick={handleCloseOngoingQuoteList} />
          <div className="sheet-panel delegation-quote-dialog mx-auto grid max-w-[420px] gap-[12px] p-[14px]">
            <div className="card-title flex items-center justify-between gap-[10px]">
              <Banknote size={18} />
              <div>
                <strong>报价列表</strong>
                <span>{ongoingQuoteTask.title}</span>
              </div>
              <button
                aria-label="关闭"
                className="icon-only grid h-[34px] w-[34px] place-items-center text-[#475466]"
                onClick={handleCloseOngoingQuoteList}
                type="button"
              >
                <XCircle size={20} />
              </button>
            </div>
            <div className="delegation-quote-list grid gap-[8px]">
              {(ongoingQuoteTask.quotes ?? []).map((quote) => {
                const isLockedQuote = isQuoteLockedForPublisher(ongoingQuoteTask, quote);
                const hasQuoteCounterAmount = hasCounterQuoteAmount(quote);

                return (
                  <button
                    className={`delegation-quote-option grid gap-[5px] p-[10px] text-left ${
                      selectedOngoingQuoteId === quote.id ? "active" : ""
                    } ${isLockedQuote ? "locked" : ""}`}
                    disabled={isLockedQuote}
                    key={quote.id}
                    onClick={() => {
                      if (selectedOngoingQuoteId === quote.id) {
                        setSelectedOngoingQuoteId("");
                        setQuoteCounterAmount("");
                        return;
                      }

                      setSelectedOngoingQuoteId(quote.id);
                      setQuoteCounterAmount(String(quote.amount));
                    }}
                    type="button"
                  >
                    <span className="flex items-center justify-between gap-[8px]">
                      <strong>{quote.bidderName}</strong>
                      <span className="delegation-quote-price inline-flex items-center gap-[6px]">
                        {hasQuoteCounterAmount ? (
                          <del>{formatCurrency(quote.originalAmount ?? quote.amount)}</del>
                        ) : null}
                        <em className={hasQuoteCounterAmount ? "counter" : ""}>{formatCurrency(quote.amount)}</em>
                      </span>
                    </span>
                    <span>
                      {quote.quoteTime} · {quote.status}
                    </span>
                  </button>
                );
              })}
              {(ongoingQuoteTask.quotes ?? []).length === 0 ? (
                <article className="empty-state p-[14px] text-center">
                  <strong>暂无报价</strong>
                  <span>有服务方报价后会在这里展示。</span>
                </article>
              ) : null}
            </div>
            <label className="delegation-quote-counter grid gap-[6px]">
              <span>{ongoingQuoteCounterPrompt}</span>
              <input
                inputMode="decimal"
                onChange={(event) => setQuoteCounterAmount(event.target.value)}
                placeholder="输入协商金额"
                type="number"
                value={quoteCounterAmount}
              />
            </label>
            <div className="delegation-quote-actions grid gap-[8px]">
              <button
                className="primary-button inline-flex min-h-[38px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white disabled:text-[#748092]"
                disabled={!canSubmitSelectedOngoingQuote}
                onClick={handleSubmitOngoingQuoteAction}
                type="button"
              >
                <CheckCircle2 size={16} />
                {ongoingQuoteActionLabel}
              </button>
              <button
                className="danger-outline-button inline-flex min-h-[38px] items-center justify-center gap-[5px] px-[10px] py-[8px]"
                disabled={!canRejectSelectedOngoingQuote}
                onClick={handleRejectOngoingQuote}
                type="button"
              >
                拒绝报价
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {checkout ? (
        <CheckoutSheet
          checkout={checkout}
          onClose={() => setCheckout(null)}
          onDeliveryChange={(deliveryMode) => setCheckout((value) => (value ? { ...value, deliveryMode } : value))}
          onPaymentChange={(paymentMethod) => setCheckout((value) => (value ? { ...value, paymentMethod } : value))}
          onSubmit={handleSubmitPurchase}
          purchasePending={purchaseMutation.isPending}
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
          addressItems={publishAddressItems}
          childOptions={publishChildOptions}
          initialDraft={publishInfoInitialDraft}
          initialType={publishInfoInitialType}
          isPublishing={publishHuntingTaskMutation.isPending || publishTutorDemandMutation.isPending}
          onClose={() => setIsPublishInfoOpen(false)}
          onPublish={handlePublishInfo}
          onSave={handleSavePublishInfo}
          role={role}
        />
      ) : null}

      {isTutorApplicationOpen ? (
        <TutorApplicationsDialog
          candidates={tutorApplicationCandidates}
          onClose={() => setIsTutorApplicationOpen(false)}
          onConfirm={() => {
            setIsTutorApplicationOpen(false);
            showMessage("试课信息已确认，等待学生端处理。", { type: "success" });
          }}
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

/** 狩猎快捷开启后的系统推荐委托列表。 */
function HuntingRecommendationDialog({
  onClose,
  onDisable,
  tasks
}: {
  onClose: () => void;
  onDisable: () => void;
  tasks: HuntingTask[];
}) {
  return (
    <section className="checkout-sheet" aria-label="狩猎推荐委托">
      <div className="sheet-backdrop" onClick={onClose} />
      <article className="sheet-panel hunting-recommendation-panel mx-auto grid max-h-[min(74vh,620px)] max-w-[540px] gap-[12px] px-[14px] pb-[calc(16px+env(safe-area-inset-bottom))] pt-[16px]">
        <div className="card-title flex items-center justify-between gap-[10px]">
          <RadioTower size={18} />
          <div>
            <strong>系统推荐委托</strong>
            <span>{tasks.length} 个推荐任务</span>
          </div>
          <button
            aria-label="关闭"
            className="icon-only grid h-[34px] w-[34px] place-items-center text-[#475466]"
            onClick={onClose}
            type="button"
          >
            <XCircle size={20} />
          </button>
        </div>
        <div className="hunting-recommendation-list grid gap-[10px]">
          {tasks.map((task) => (
            <article className="flow-card compact hunting-recommendation-card grid gap-[8px] p-[12px]" key={task.id}>
              <div className="card-title flex items-center justify-between gap-[10px]">
                <div>
                  <strong>{task.title}</strong>
                  <span>{task.publishTime || "平台同步"}</span>
                </div>
                <em>{task.status}</em>
              </div>
              <div className="meta-line flex flex-wrap items-center gap-[6px] text-[13px] leading-[1.45] text-[#657181]">
                <span>
                  <MapPin size={13} />
                  {task.destination || task.location}
                </span>
                <span>
                  <Banknote size={13} />
                  {getHuntingTaskAmountText(task)}
                </span>
              </div>
            </article>
          ))}
          {tasks.length === 0 ? (
            <article className="empty-state p-[14px] text-center">
              <strong>暂无推荐委托</strong>
              <span>保持开启后，系统会继续推送合适任务。</span>
            </article>
          ) : null}
        </div>
        <div className="sheet-actions grid gap-[8px]">
          <button
            className="warning-button inline-flex min-h-[38px] items-center justify-center gap-[5px] px-[10px] py-[8px]"
            onClick={onDisable}
            type="button"
          >
            关闭狩猎
          </button>
          <button
            className="primary-button inline-flex min-h-[38px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white"
            onClick={onClose}
            type="button"
          >
            继续开启
          </button>
        </div>
      </article>
    </section>
  );
}

/** 家长端选择试课家教并确认试课时间。 */
function TutorApplicationsDialog({
  candidates,
  onClose,
  onConfirm
}: {
  candidates: TutorApplicationCandidate[];
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [selectedCandidateId, setSelectedCandidateId] = useState("");
  const [trialDateStart, setTrialDateStart] = useState("");
  const [trialDateEnd, setTrialDateEnd] = useState("");
  const [trialHalfDay, setTrialHalfDay] = useState("上午");
  const canConfirm = Boolean(selectedCandidateId && trialDateStart && trialDateEnd);

  return (
    <section className="checkout-sheet" aria-label="试课申请列表">
      <div className="sheet-backdrop" onClick={onClose} />
      <article className="sheet-panel tutor-applications-panel mx-auto grid max-h-[min(76vh,620px)] max-w-[540px] gap-[12px] overflow-hidden px-[14px] pb-[calc(16px+env(safe-area-inset-bottom))] pt-[16px]">
        <div className="card-title flex items-center justify-between gap-[10px]">
          <CalendarClock size={18} />
          <div>
            <strong>试课申请列表</strong>
            <span>选择家教并确认试课时间</span>
          </div>
          <button
            aria-label="关闭"
            className="icon-only grid h-[34px] w-[34px] place-items-center text-[#475466]"
            onClick={onClose}
            type="button"
          >
            <XCircle size={20} />
          </button>
        </div>

        <div className="tutor-application-list grid gap-[10px] overflow-auto pr-[2px]">
          {candidates.map((candidate) => (
            <button
              className={`tutor-application-card flow-card compact grid gap-[6px] p-[12px] text-left ${
                selectedCandidateId === candidate.id ? "active" : ""
              }`}
              key={candidate.id}
              onClick={() => setSelectedCandidateId((value) => (value === candidate.id ? "" : candidate.id))}
              type="button"
            >
              <strong>{candidate.name}</strong>
              <span>{candidate.school} · {candidate.major}</span>
              <em>{candidate.status}</em>
            </button>
          ))}
          {candidates.length === 0 ? (
            <article className="empty-state p-[14px] text-center">
              <strong>暂无试课申请</strong>
              <span>学生申请试课后会在这里展示。</span>
            </article>
          ) : null}
        </div>

        <div className="tutor-trial-form grid gap-[8px]">
          <div className="tutor-period-fields grid grid-cols-2 gap-[8px]">
            <label className={`profile-field publish-field grid gap-[7px] ${trialDateStart ? "" : "missing"}`}>
              <span>试课开始</span>
              <input onChange={(event) => setTrialDateStart(event.target.value)} type="date" value={trialDateStart} />
            </label>
            <label className={`profile-field publish-field grid gap-[7px] ${trialDateEnd ? "" : "missing"}`}>
              <span>试课结束</span>
              <input onChange={(event) => setTrialDateEnd(event.target.value)} type="date" value={trialDateEnd} />
            </label>
          </div>
          <div className="segmented-control publish-segmented-field wrap flex gap-[8px]" aria-label="选择试课时段">
            {["上午", "下午"].map((halfDay) => (
              <button
                className={trialHalfDay === halfDay ? "active" : ""}
                key={halfDay}
                onClick={() => setTrialHalfDay(halfDay)}
                type="button"
              >
                {halfDay}
              </button>
            ))}
          </div>
        </div>

        <button
          className="primary-button inline-flex min-h-[38px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white disabled:text-[#748092]"
          disabled={!canConfirm}
          onClick={onConfirm}
          type="button"
        >
          <CheckCircle2 size={16} />
          {selectedCandidateId ? "试课信息确认" : "选择试课家教"}
        </button>
      </article>
    </section>
  );
}

