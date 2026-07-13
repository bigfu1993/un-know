import { useGlobalStore, useGlobalUser } from "@h5/store/global";
import {
  useAcceptHuntingTask,
  useClientAddresses,
  useCreateClientAddress,
  useDecideHuntingTaskQuote,
  usePublishHuntingTask,
  useQuoteHuntingTask,
  useUpdateClientAddress
} from "@unknown/hooks";
import type { HuntingCertificationStatus } from "@unknown/domain";
import { Banknote, MapPin, RadioTower } from "lucide-react";
import { getHuntingCertificationDataFromDraft } from "./components/HuntingCertificationCard/model";
import { PublishInfoDialog } from "./components/PublishInfoDialog";
import { TutorCalendarDialog } from "./components/TutorCalendar";
import {
  TutorCertificationInfoDialog,
  type TutorCertificationInfoSaveMode
} from "./components/TutorCertificationInfoDialog";
import { HuntingCertification } from "./pages/HuntingCertification";
import { TutorCertification } from "./pages/Tutor/TutorCertification";
import {
  clientAddressesToAddressBookItems,
  clientAddressToAddressBookItem,
  getCurrentAddressDraft,
  profileDraftToClientAddressRequest
} from "./shared/clientPageModel";
import {
  buildPublishHuntingTaskRequest,
  isHuntingTaskPublishType,
  saveLocalPublishInfoDraft,
  type PublishInfoDraft,
  type PublishInfoType
} from "./tools/publishInfo";
import { getTutorCalendarTasks, getTutorDateKey } from "./tools/tutorCalendar";

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

/** 获取进行中弹窗内委托/狩猎卡片展示状态。 */
function getHuntingOngoingStatus(task: HuntingTask) {
  const hasPendingQuote = isHuntingQuoteStatus(task) && (Boolean(task.isQuotedByMe) || (task.quoteCount ?? 0) > 0);

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

/** 将当前账号相关的发布方委托或服务方报价/履约任务转换为进行中弹窗展示项。 */
function getHuntingOngoingOrders(tasks: HuntingTask[], role: Role): ClientOrder[] {
  return tasks.filter((task) => {
    const isDelegationInProgress =
      Boolean(task.isMine) &&
      (isHuntingPublishedStatus(task) || isHuntingQuoteStatus(task) || isHuntingFulfillingStatus(task));
    const isQuotedHunting = Boolean(task.isQuotedByMe) && isHuntingQuoteStatus(task);
    const isHuntingInProgress = Boolean(task.isAcceptedByMe) && isHuntingFulfillingStatus(task);

    return isDelegationInProgress || isQuotedHunting || isHuntingInProgress;
  }).map((task) => ({
    amount: task.pendingAmount ?? task.fee,
    amountLabel: getHuntingOngoingAmountLabel(task),
    category: task.isMine ? "delegation" : "hunting",
    contact: task.isMine ? "我发布的委托" : isHuntingQuoteStatus(task) ? "我报价的委托" : "我履约的委托",
    detail: `${task.mode} · ${task.latestTime} · ${task.destination ?? task.location}`,
    id: task.id,
    quoteAmount: task.pendingAmount,
    quoteCount: task.isMine ? task.quoteCount : undefined,
    quoteId: task.pendingQuoteId,
    role,
    status: getHuntingOngoingStatus(task),
    title: task.title
  }));
}

/** 获取委托任务金额展示文案，协商任务不展示 0 元。 */
function getHuntingTaskAmountText(task: HuntingTask) {
  return task.amountNegotiable || task.fee <= 0 ? "协商" : formatCurrency(task.fee);
}

/** 获取狩猎快捷开启后系统推荐的委托任务。 */
function getRecommendedHuntingTasks(tasks: HuntingTask[]) {
  const recommendableStatusKeywords = ["发布", "待", "报价", "领取", "已发布"];

  return tasks
    .filter(
      (task) =>
        !task.isMine &&
        !isHuntingFulfillingStatus(task) &&
        recommendableStatusKeywords.some((keyword) => task.status.includes(keyword))
    )
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
    return quote.status.includes("待发布方确认") || quote.status.includes("待确认");
  }
  return Boolean(task.isQuotedByMe) && quote.status.includes("待服务方确认");
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
  const [isHuntingRecommendationOpen, setIsHuntingRecommendationOpen] = useState(false);
  const [isHuntingShortcutConfirmOpen, setIsHuntingShortcutConfirmOpen] = useState(false);
  const [huntingShortcutConfirmStep, setHuntingShortcutConfirmStep] = useState<1 | 2>(1);
  const [isHuntingShortcutEnabled, setIsHuntingShortcutEnabled] = useState(false);
  const [publishedHuntingTasks, setPublishedHuntingTasks] = useState<HuntingTask[]>([]);
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
  const acceptHuntingTaskMutation = useAcceptHuntingTask();
  const quoteHuntingTaskMutation = useQuoteHuntingTask();
  const decideHuntingTaskQuoteMutation = useDecideHuntingTaskQuote();
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
    setIsHuntingShortcutConfirmOpen(false);
    setHuntingShortcutConfirmStep(1);
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
      setIsHuntingShortcutConfirmOpen(false);
      setIsMineOpen(false);
      setIsOngoingOpen(false);
      return;
    }

    if (!handleRequestHuntingOnline()) {
      setIsMineOpen(false);
      return;
    }

    setHuntingShortcutConfirmStep(1);
    setIsHuntingShortcutConfirmOpen(true);
    setIsHuntingRecommendationOpen(false);
    setIsMineOpen(false);
    setIsOngoingOpen(false);
  }

  /** 确认开启狩猎快捷，第二次确认后进入委托页并展示推荐角标。 */
  function handleConfirmHuntingShortcut() {
    if (huntingShortcutConfirmStep === 1) {
      setHuntingShortcutConfirmStep(2);
      return;
    }

    setIsHuntingShortcutEnabled(true);
    setIsHuntingShortcutConfirmOpen(false);
    setHuntingShortcutConfirmStep(1);
    setActiveTab("hunting");
    setPageStack([]);
    setIsOngoingOpen(false);
    setIsMineOpen(false);
    setIsProfileCompletionOpen(false);
    closeTutorDialogs();
    closeHuntingShortcutDialogs();
    navigate(getRouteForTab("hunting"));
    showMessage("狩猎快捷已开启，系统将自动推送推荐委托。", { type: "success" });
  }

  /** 关闭狩猎快捷推荐推送。 */
  function handleDisableHuntingShortcut() {
    setIsHuntingShortcutEnabled(false);
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
    setIsHuntingShortcutEnabled(false);
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
    setIsHuntingShortcutEnabled(false);
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

  /** 打开发布信息弹窗。 */
  function handleOpenPublishInfo() {
    setIsMineOpen(false);
    setIsOngoingOpen(false);
    setIsQuickDockExpanded(true);
    setIsProfileCompletionOpen(false);
    closeTutorDialogs();
    closeHuntingShortcutDialogs();
    setPublishInfoInitialType("delegation");
    setIsPublishInfoOpen(true);
  }

  /** 打开回收发布弹窗，复用发布表单但固定为回收类型。 */
  function handleOpenRecycleInfo() {
    setIsMineOpen(false);
    setIsOngoingOpen(false);
    setIsQuickDockExpanded(true);
    setIsProfileCompletionOpen(false);
    closeTutorDialogs();
    closeHuntingShortcutDialogs();
    setPublishInfoInitialType("recycle");
    setIsPublishInfoOpen(true);
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
    const nextProfileDraft = {
      ...user.profileDraft,
      tutorExposureEnabled: nextEnabled ? "true" : "false"
    };

    setUserProfileDraft(nextProfileDraft);
    setSavedProfileDraft(nextProfileDraft);
    setProfileDraft(nextProfileDraft);
    showMessage(nextEnabled ? "开启家教，认证信息可被查看，我的-家教卡片可修改信息。" : "已关闭家教资料公开。", {
      type: "success"
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

  /** 发布委托或回收任务，其他类型当前保存为草稿等待后续接口。 */
  function handlePublishInfo(draft: PublishInfoDraft) {
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
  const ongoingOrders = [...getHuntingOngoingOrders(mergedHuntingTasks, role), ...baseOngoingOrders];
  const recommendedHuntingTasks = getRecommendedHuntingTasks(mergedHuntingTasks);
  const ongoingQuoteTask = ongoingQuoteTaskId
    ? mergedHuntingTasks.find((task) => task.id === ongoingQuoteTaskId) ?? null
    : null;
  const selectedOngoingQuote =
    ongoingQuoteTask?.quotes?.find((quote) => quote.id === selectedOngoingQuoteId) ?? null;
  const canConfirmSelectedOngoingQuote = canConfirmHuntingQuote(ongoingQuoteTask, selectedOngoingQuote);
  const canNegotiateSelectedOngoingQuote = isNegotiatingHuntingQuote(selectedOngoingQuote);
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

    setOngoingQuoteTaskId(task.id);
    setSelectedOngoingQuoteId(task.quotes[0].id);
    setQuoteCounterAmount(String(task.quotes[0].amount));
  }

  /** 关闭进行中入口打开的报价列表弹窗。 */
  function handleCloseOngoingQuoteList() {
    setOngoingQuoteTaskId(null);
    setSelectedOngoingQuoteId("");
    setQuoteCounterAmount("");
  }

  /** 确认进行中弹窗内选中的委托报价。 */
  function handleConfirmOngoingQuote() {
    if (!ongoingQuoteTask || !selectedOngoingQuote) {
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

  /** 改价后提交给对方确认。 */
  function handleCounterOngoingQuote() {
    if (!ongoingQuoteTask || !selectedOngoingQuote) {
      return;
    }
    const amount = Number(quoteCounterAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      showMessage("请输入大于 0 的报价金额。", { type: "warning" });
      return;
    }

    void Promise.resolve(handleCounterHuntingQuote(ongoingQuoteTask, selectedOngoingQuote, amount))
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
            <Orders orders={roleOrders} />
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
                <PartTime dashboard={workspaceData.merchantDashboard} jobs={workspaceData.partTimeJobs} role={role} />
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

      {isHuntingShortcutConfirmOpen ? (
        <HuntingShortcutConfirmDialog
          onClose={closeHuntingShortcutDialogs}
          onConfirm={handleConfirmHuntingShortcut}
          step={huntingShortcutConfirmStep}
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
          onClose={() => setIsOngoingOpen(false)}
          onOpenQuoteList={handleOpenOngoingQuoteList}
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
              {(ongoingQuoteTask.quotes ?? []).map((quote) => (
                <button
                  className={`delegation-quote-option grid gap-[5px] p-[10px] text-left ${
                    selectedOngoingQuoteId === quote.id ? "active" : ""
                  }`}
                  key={quote.id}
                  onClick={() => {
                    setSelectedOngoingQuoteId(quote.id);
                    setQuoteCounterAmount(String(quote.amount));
                  }}
                  type="button"
                >
                  <span className="flex items-center justify-between gap-[8px]">
                    <strong>{quote.bidderName}</strong>
                    <em>{formatCurrency(quote.amount)}</em>
                  </span>
                  <span>
                    {quote.quoteTime} · {quote.status}
                  </span>
                </button>
              ))}
              {(ongoingQuoteTask.quotes ?? []).length === 0 ? (
                <article className="empty-state p-[14px] text-center">
                  <strong>暂无报价</strong>
                  <span>有服务方报价后会在这里展示。</span>
                </article>
              ) : null}
            </div>
            <label className="delegation-quote-counter grid gap-[6px]">
              <span>{ongoingQuoteTask.isMine ? "修改报价并推送给服务方" : "修改报价并推送给发布方"}</span>
              <input
                inputMode="decimal"
                onChange={(event) => setQuoteCounterAmount(event.target.value)}
                placeholder="输入修改后的报价"
                type="number"
                value={quoteCounterAmount}
              />
            </label>
            <div className="delegation-quote-actions grid gap-[8px]">
              <button
                className="primary-button inline-flex min-h-[38px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white disabled:text-[#748092]"
                disabled={!canConfirmSelectedOngoingQuote}
                onClick={handleConfirmOngoingQuote}
                type="button"
              >
                <CheckCircle2 size={16} />
                确认报价并开始履约
              </button>
              <button
                className="secondary-button inline-flex min-h-[38px] items-center justify-center gap-[5px] px-[10px] py-[8px]"
                disabled={!canNegotiateSelectedOngoingQuote}
                onClick={handleCounterOngoingQuote}
                type="button"
              >
                修改后提交
              </button>
              <button
                className="danger-outline-button inline-flex min-h-[38px] items-center justify-center gap-[5px] px-[10px] py-[8px]"
                disabled={!canNegotiateSelectedOngoingQuote}
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

      {isPublishInfoOpen ? (
        <PublishInfoDialog
          addressItems={publishAddressItems}
          initialType={publishInfoInitialType}
          isPublishing={publishHuntingTaskMutation.isPending}
          onClose={() => setIsPublishInfoOpen(false)}
          onPublish={handlePublishInfo}
          onSave={handleSavePublishInfo}
          role={role}
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

/** 狩猎快捷开启确认弹窗，使用两步确认降低误触上线概率。 */
function HuntingShortcutConfirmDialog({
  onClose,
  onConfirm,
  step
}: {
  onClose: () => void;
  onConfirm: () => void;
  step: 1 | 2;
}) {
  const isFinalStep = step === 2;

  return (
    <section className="checkout-sheet" aria-label="开启狩猎快捷确认">
      <div className="sheet-backdrop" onClick={onClose} />
      <article className="sheet-panel hunting-shortcut-sheet mx-auto grid max-w-[420px] gap-[12px] p-[14px]">
        <div className="card-title flex items-center justify-between gap-[10px]">
          <RadioTower size={18} />
          <div>
            <strong>{isFinalStep ? "再次确认开启狩猎" : "开启狩猎快捷"}</strong>
            <span>{isFinalStep ? "系统将开始推荐委托" : "开启后会显示实时推荐数量"}</span>
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
        <p className="hunting-shortcut-copy m-0 text-[13px] leading-[1.55] text-[#657181]">
          {isFinalStep
            ? "确认后狩猎快捷按钮进入开启状态，系统推荐的委托数量会显示在角标中。"
            : "开启狩猎快捷后，平台会基于当前任务池推送推荐委托。请确认你已准备好及时响应。"}
        </p>
        <div className="sheet-actions grid gap-[8px]">
          <button
            className="ghost-button inline-flex min-h-[38px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-[#475466]"
            onClick={onClose}
            type="button"
          >
            取消
          </button>
          <button
            className="primary-button inline-flex min-h-[38px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white"
            onClick={onConfirm}
            type="button"
          >
            <CheckCircle2 size={16} />
            {isFinalStep ? "确认开启" : "继续确认"}
          </button>
        </div>
      </article>
    </section>
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
