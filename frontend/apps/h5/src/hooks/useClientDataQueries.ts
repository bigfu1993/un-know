import {
  useClientAddresses,
  useClientHome,
  useClientWorkspace,
  useHuntingTasks,
  usePartTimeJobs,
  useTutorDemands
} from "@unknown/hooks";

/** React Query 首次返回数据前使用的稳定空地址，避免 effect 因默认数组反复触发。 */
const emptyClientAddresses: ClientAddress[] = [];

/** React Query 首次返回兼职列表前使用的稳定空数组。 */
const emptyPartTimeJobs: PartTimeJob[] = [];

/** React Query 首次返回委托/狩猎列表前使用的稳定空数组。 */
const emptyHuntingTasks: HuntingTask[] = [];

/** React Query 首次返回家教列表前使用的稳定空数组。 */
const emptyTutorDemands: TutorDemand[] = [];

/** H5 根级业务数据查询入参。 */
interface UseClientDataQueriesOptions {
  /** 是否允许发起登录后才能访问的数据查询。 */
  isAuthenticated: boolean;
  /** 当前用户角色，用于区分角色级缓存。 */
  role: Role;
  /** 当前登录会话标识，用于隔离地址簿缓存。 */
  sessionKey?: string;
}

/** 聚合 H5 根组件需要的真实接口查询，避免根组件直接维护多组查询默认值。 */
export function useClientDataQueries({ isAuthenticated, role, sessionKey }: UseClientDataQueriesOptions) {
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
    isPartTimeJobsFetching,
    isPartTimeJobsLoading,
    isTutorDemandsFetching,
    isTutorDemandsLoading,
    isWorkspaceFetching,
    isWorkspaceLoading,
    partTimeJobsError,
    partTimeJobsResponse,
    refetchHome,
    refetchHuntingTasks,
    refetchPartTimeJobs,
    refetchTutorDemands,
    refetchWorkspace,
    tutorDemandsError,
    tutorDemandsResponse,
    workspaceError,
    workspaceResponse
  };
}
