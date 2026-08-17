import {
  useClientAddresses,
  useClientHome,
  useClientWorkspace,
  useHuntingTasks,
  useOngoingOrders,
  usePartTimeJobs,
  useTutorApplications,
  useTutorDemands
} from "@unknown/hooks";

/** React Query 首次返回数据前使用的稳定空地址，避免 effect 因默认数组反复触发。 */
const emptyClientAddresses: ClientAddress[] = [];

/** React Query 首次返回兼职列表前使用的稳定空数组。 */
const emptyPartTimeJobs: PartTimeJob[] = [];

/** React Query 首次返回委托/狩猎列表前使用的稳定空数组。 */
const emptyHuntingTasks: HuntingTask[] = [];

/** React Query 首次返回家教列表前使用的稳定空数组。 */
const emptyTutorDemands: Array<TutorDemand | TutorCertifiedStudent> = [];

/** React Query 首次返回家教进行中申请列表前使用的稳定空数组。 */
const emptyTutorApplications: TutorDemand[] = [];

/** React Query 首次返回进行中列表前使用的稳定空数组。 */
const emptyOngoingOrders: ClientOrder[] = [];

/** React Query 首次返回工作台聚合数据前使用的稳定空值，各字段展示态各自兜底空数组/零值文案。 */
const emptyClientWorkspace: ClientWorkspacePayload = {
  partTimeJobs: [],
  huntingSummary: { studentCertification: "", secondVerification: "", depositText: "", creditText: "", onlineStatus: "" },
  huntingTasks: [],
  tutorDemands: [],
  merchantDashboard: {
    salesCount: 0,
    salesAmount: 0,
    pendingDelivery: 0,
    delivering: 0,
    afterSaleMessages: 0,
    chatMessages: 0,
    views: 0,
    favorites: 0,
    orders: 0,
    deals: 0,
    afterSaleRate: "",
    partTimeConversion: "",
    depositStatus: ""
  },
  merchantProducts: [],
  walletSummary: { withdrawable: "", observation: "", deposit: "", withdrawMethods: "" },
  walletRecords: []
};

/** H5 根级业务数据查询入参。 */
interface UseClientDataQueriesOptions {
  /** 是否允许发起登录后才能访问的数据查询。 */
  isAuthenticated: boolean;
  /** 委托/狩猎列表是否被当前 UI 需要：狩猎 tab 激活，或狩猎快捷面板/推荐/开关任一处于打开状态。 */
  isHuntingDataNeeded: boolean;
  /** 进行中列表是否被当前 UI 需要：只在悬浮"进行中"弹窗打开时才查询，弹窗徽标数字随之延迟到首次打开后才准确。 */
  isOngoingOrdersNeeded: boolean;
  /** 兼职列表是否被当前 UI 需要：只在兼职 tab 激活时查询。 */
  isPartTimeTabActive: boolean;
  /** 家教申请候选列表是否被当前 UI 需要：进行中弹窗或其派生的申请/试课列表子弹窗任一打开时查询。 */
  isTutorApplicationsNeeded: boolean;
  /** 家教需求列表是否被当前 UI 需要：家教 tab 或兼职 tab（兼职页同时展示试课兼职卡片）激活时查询。 */
  isTutorDemandsNeeded: boolean;
  /** 工作台聚合数据（钱包、商户看板/商品）是否被当前 UI 需要：我的弹窗、钱包页、兼职 tab（商户看板）或商户经营 tab 任一激活时查询。 */
  isWorkspaceNeeded: boolean;
  /** 当前用户角色，用于区分角色级缓存。 */
  role: Role;
  /** 当前登录会话标识，用于隔离地址簿缓存。 */
  sessionKey?: string;
}

/** 聚合 H5 根组件需要的真实接口查询，避免根组件直接维护多组查询默认值。业务列表查询默认按需懒加载，
 *  只在真正消费该数据的 tab/弹窗激活时才 enabled，不再统一靠登录态一个开关全量预加载；具体触发条件
 *  见各 enabled 参数注释，由调用方（App 根组件）按真实 UI 状态计算。 */
export function useClientDataQueries({
  isAuthenticated,
  isHuntingDataNeeded,
  isOngoingOrdersNeeded,
  isPartTimeTabActive,
  isTutorApplicationsNeeded,
  isTutorDemandsNeeded,
  isWorkspaceNeeded,
  role,
  sessionKey
}: UseClientDataQueriesOptions) {
  const {
    data: homeData,
    error: homeError,
    isLoading: isHomeLoading,
    refetch: refetchHome
  } = useClientHome(role, isAuthenticated);
  const {
    data: workspaceResponse = emptyClientWorkspace,
    error: workspaceError,
    isFetching: isWorkspaceFetching,
    isLoading: isWorkspaceLoading,
    refetch: refetchWorkspace
  } = useClientWorkspace(role, isAuthenticated && isWorkspaceNeeded);
  const {
    data: ongoingOrdersResponse = emptyOngoingOrders,
    error: ongoingOrdersError,
    isFetching: isOngoingOrdersFetching,
    isLoading: isOngoingOrdersLoading,
    refetch: refetchOngoingOrders
  } = useOngoingOrders(role, isAuthenticated && isOngoingOrdersNeeded);
  const {
    data: partTimeJobsResponse = emptyPartTimeJobs,
    error: partTimeJobsError,
    isFetching: isPartTimeJobsFetching,
    isLoading: isPartTimeJobsLoading,
    refetch: refetchPartTimeJobs
  } = usePartTimeJobs(role, isAuthenticated && isPartTimeTabActive);
  const {
    data: huntingTasksResponse = emptyHuntingTasks,
    error: huntingTasksError,
    isFetching: isHuntingTasksFetching,
    isLoading: isHuntingTasksLoading,
    refetch: refetchHuntingTasks
  } = useHuntingTasks(role, isAuthenticated && isHuntingDataNeeded);
  const {
    data: tutorDemandsResponse = emptyTutorDemands,
    error: tutorDemandsError,
    isFetching: isTutorDemandsFetching,
    isLoading: isTutorDemandsLoading,
    refetch: refetchTutorDemands
  } = useTutorDemands(role, isAuthenticated && isTutorDemandsNeeded);
  const {
    data: tutorApplicationsResponse = emptyTutorApplications,
    error: tutorApplicationsError,
    isFetching: isTutorApplicationsFetching,
    isLoading: isTutorApplicationsLoading,
    refetch: refetchTutorApplications
  } = useTutorApplications(role, isAuthenticated && isTutorApplicationsNeeded);
  const {
    data: clientAddresses = emptyClientAddresses,
    error: addressError,
    isLoading: isAddressLoading
  } = useClientAddresses(isAuthenticated, sessionKey);

  return {
    addressError,
    clientAddresses,
    homeData,
    homeError,
    huntingTasksError,
    huntingTasksResponse,
    isAddressLoading,
    isHomeLoading,
    isHuntingTasksFetching,
    isHuntingTasksLoading,
    isOngoingOrdersFetching,
    isOngoingOrdersLoading,
    isPartTimeJobsFetching,
    isPartTimeJobsLoading,
    isTutorApplicationsFetching,
    isTutorApplicationsLoading,
    isTutorDemandsFetching,
    isTutorDemandsLoading,
    isWorkspaceFetching,
    isWorkspaceLoading,
    ongoingOrdersError,
    ongoingOrdersResponse,
    partTimeJobsError,
    partTimeJobsResponse,
    refetchHome,
    refetchHuntingTasks,
    refetchOngoingOrders,
    refetchPartTimeJobs,
    refetchTutorApplications,
    refetchTutorDemands,
    refetchWorkspace,
    tutorApplicationsError,
    tutorApplicationsResponse,
    tutorDemandsError,
    tutorDemandsResponse,
    workspaceError,
    workspaceResponse
  };
}
