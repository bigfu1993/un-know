import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  acceptHuntingTask,
  applyTutorTrial,
  cancelTutorApplication,
  cancelTutorDemand,
  confirmTutorTrial,
  confirmTutorTrialStart,
  createChatConversation,
  createChatQuickAction,
  createHuntingProject,
  createClientAddress,
  decideHuntingTaskQuote,
  deleteClientAddress,
  getClientAddresses,
  getClientHome,
  getPartTimeJobs,
  getHuntingTasks,
  getOngoingOrders,
  getOrderHistory,
  getTutorApplication,
  getTutorCertifiedStudents,
  getChatConversations,
  getChatMessages,
  getChatQuickActions,
  getClientWorkspace,
  getProducts,
  handleHuntingTaskFulfillmentAction,
  handleTutorWorkflowAction,
  loginClient,
  miniappOneTapLogin,
  publishHuntingTask,
  publishTutorDemand,
  purchaseProduct,
  quoteHuntingTask,
  registerClient,
  requestTutorTrialEnd,
  resetClientPassword,
  selectClientRole,
  sendChatMessage,
  submitHuntingCertification,
  submitTutorCertification,
  updateClientAddress,
  updateClientNickname,
  updateTutorExposure,
  useClientAddress
} from "@unknown/api-client";
import {
  ChatQuickActionRequest,
  ClientOrder,
  ConfirmTutorTrialRequest,
  CreateChatConversationRequest,
  CreateHuntingProjectRequest,
  ClientAddressRequest,
  HuntingQuoteDecisionRequest,
  HuntingTaskFulfillmentActionRequest,
  LoginRequest,
  MiniappOneTapLoginRequest,
  PublishHuntingTaskRequest,
  PublishTutorDemandRequest,
  PurchaseRequest,
  QuoteHuntingTaskRequest,
  RegisterRequest,
  ResetClientPasswordRequest,
  Role,
  SelectRoleRequest,
  SendChatMessageRequest,
  SubmitHuntingCertificationRequest,
  SubmitTutorCertificationRequest,
  UpdateNicknameRequest,
  TutorWorkflowActionRequest
} from "@unknown/domain";
import {
  clientAddressQueryKey,
  clientHuntingTasksQueryKey,
  clientOngoingOrdersQueryKey,
  clientOrderHistoryQueryKey,
  clientPartTimeJobsQueryKey,
  clientTutorApplicationsQueryKey,
  clientTutorCertifiedStudentsQueryKey,
  clientWorkspaceQueryKey,
  getRoleQueryKey,
  getTutorApplicationQueryKey
} from "./queryKeys";

export {
  clientAddressQueryKey,
  clientHuntingTasksQueryKey,
  clientOngoingOrdersQueryKey,
  clientOrderHistoryQueryKey,
  clientPartTimeJobsQueryKey,
  clientTutorApplicationsQueryKey,
  clientTutorCertifiedStudentsQueryKey,
  clientWorkspaceQueryKey
} from "./queryKeys";
export { useOngoingOrdersRealtime } from "./realtime";

/** 根据可选拥有者标识生成地址列表查询键。 */
function getClientAddressQueryKey(ownerKey?: string) {
  return ownerKey ? [...clientAddressQueryKey, ownerKey] : clientAddressQueryKey;
}

export function useClientHome(role: Role, enabled = true) {
  return useQuery({
    queryKey: ["client-home", role],
    queryFn: getClientHome,
    enabled
  });
}

export function useProducts(role: Role, enabled = true) {
  return useQuery({
    queryKey: ["products", role],
    queryFn: getProducts,
    enabled
  });
}

export function useClientWorkspace(role: Role, enabled = true) {
  return useQuery({
    queryKey: getRoleQueryKey(clientWorkspaceQueryKey, role),
    queryFn: getClientWorkspace,
    enabled
  });
}

/** 当前账号进行中列表，不管什么角色都查这个接口，后端按登录态聚合角色对应的业务域数据；
 *  只返回真正进行中的记录，完整订单历史见 {@link useOrderHistory}。 */
export function useOngoingOrders(role: Role, enabled = true) {
  return useQuery({
    queryKey: getRoleQueryKey(clientOngoingOrdersQueryKey, role),
    queryFn: getOngoingOrders,
    enabled
  });
}

/** 从当前账号的进行中订单缓存读取目标订单快照，不触发额外网络请求。 */
export function useOngoingOrderSnapshot(role: Role, demandId: string | null): ClientOrder | null {
  const queryClient = useQueryClient();
  const orders = queryClient.getQueryData<ClientOrder[]>(getRoleQueryKey(clientOngoingOrdersQueryKey, role));

  return orders?.find((order) => order.id === demandId) ?? null;
}

/** 当前账号订单历史，跟 useOngoingOrders 同一套底层数据但不做归档过滤，只服务订单历史页。 */
export function useOrderHistory(role: Role, enabled = true) {
  return useQuery({
    queryKey: getRoleQueryKey(clientOrderHistoryQueryKey, role),
    queryFn: getOrderHistory,
    enabled
  });
}

export function usePartTimeJobs(role: Role, enabled = true) {
  return useQuery({
    queryKey: getRoleQueryKey(clientPartTimeJobsQueryKey, role),
    queryFn: getPartTimeJobs,
    enabled
  });
}

export function useHuntingTasks(role: Role, enabled = true) {
  return useQuery({
    queryKey: getRoleQueryKey(clientHuntingTasksQueryKey, role),
    queryFn: getHuntingTasks,
    enabled
  });
}

/** 家长端可浏览的认证学生列表，仅家长角色调用。 */
export function useTutorCertifiedStudents(role: Role, enabled = true) {
  return useQuery({
    queryKey: getRoleQueryKey(clientTutorCertifiedStudentsQueryKey, role),
    queryFn: getTutorCertifiedStudents,
    enabled
  });
}

/** 家长点开"进行中"弹窗某一张具体家教卡片时，按需求 id 精确查询这一条家教需求的申请人列表，
 *  独立于页面浏览列表；不再一次性拉取家长名下全部家教需求再由调用方按 id 筛选。 */
export function useTutorApplication(role: Role, demandId: string | null, enabled = true) {
  return useQuery({
    queryKey: getTutorApplicationQueryKey(role, demandId ?? ""),
    queryFn: () => getTutorApplication(demandId as string),
    enabled: enabled && !!demandId
  });
}

export function useClientAddresses(enabled = true, ownerKey?: string) {
  return useQuery({
    queryKey: getClientAddressQueryKey(ownerKey),
    queryFn: getClientAddresses,
    enabled
  });
}

export function useClientLogin() {
  return useMutation({
    mutationFn: (payload: LoginRequest) => loginClient(payload)
  });
}

export function useClientRegister() {
  return useMutation({
    mutationFn: (payload: RegisterRequest) => registerClient(payload)
  });
}

export function useSelectClientRole() {
  return useMutation({
    mutationFn: (payload: SelectRoleRequest & { accessToken: string }) =>
      selectClientRole({ role: payload.role }, payload.accessToken)
  });
}

export function useMiniappOneTapLogin() {
  return useMutation({
    mutationFn: (payload: MiniappOneTapLoginRequest) => miniappOneTapLogin(payload)
  });
}

export function useResetClientPassword() {
  return useMutation({
    mutationFn: (payload: ResetClientPasswordRequest) => resetClientPassword(payload)
  });
}

export function useUpdateClientNickname() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateNicknameRequest) => updateClientNickname(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["client-home"] });
    }
  });
}

export function usePurchaseProduct() {
  return useMutation({
    mutationFn: (payload: PurchaseRequest) => purchaseProduct(payload)
  });
}

export function usePublishHuntingTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: PublishHuntingTaskRequest) => publishHuntingTask(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: clientWorkspaceQueryKey });
      void queryClient.invalidateQueries({ queryKey: clientOngoingOrdersQueryKey });
      void queryClient.invalidateQueries({ queryKey: clientHuntingTasksQueryKey });
    }
  });
}

export function useAcceptHuntingTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskId: string) => acceptHuntingTask(taskId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: clientWorkspaceQueryKey });
      void queryClient.invalidateQueries({ queryKey: clientOngoingOrdersQueryKey });
      void queryClient.invalidateQueries({ queryKey: clientHuntingTasksQueryKey });
    }
  });
}

export function useQuoteHuntingTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: QuoteHuntingTaskRequest & { taskId: string }) => {
      const { taskId, ...quote } = payload;
      return quoteHuntingTask(taskId, quote);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: clientWorkspaceQueryKey });
      void queryClient.invalidateQueries({ queryKey: clientOngoingOrdersQueryKey });
      void queryClient.invalidateQueries({ queryKey: clientHuntingTasksQueryKey });
    }
  });
}

export function useDecideHuntingTaskQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: HuntingQuoteDecisionRequest & { quoteId: string; taskId: string }) => {
      const { quoteId, taskId, ...decision } = payload;
      return decideHuntingTaskQuote(taskId, quoteId, decision);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: clientWorkspaceQueryKey });
      void queryClient.invalidateQueries({ queryKey: clientOngoingOrdersQueryKey });
      void queryClient.invalidateQueries({ queryKey: clientHuntingTasksQueryKey });
    }
  });
}

export function useHandleHuntingTaskFulfillmentAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: HuntingTaskFulfillmentActionRequest & { taskId: string }) => {
      const { taskId, ...request } = payload;
      return handleHuntingTaskFulfillmentAction(taskId, request);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: clientWorkspaceQueryKey });
      void queryClient.invalidateQueries({ queryKey: clientOngoingOrdersQueryKey });
      void queryClient.invalidateQueries({ queryKey: clientHuntingTasksQueryKey });
    }
  });
}

export function useCreateHuntingProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateHuntingProjectRequest) => createHuntingProject(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: clientWorkspaceQueryKey });
      void queryClient.invalidateQueries({ queryKey: clientOngoingOrdersQueryKey });
      void queryClient.invalidateQueries({ queryKey: clientHuntingTasksQueryKey });
    }
  });
}

export function usePublishTutorDemand() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: PublishTutorDemandRequest) => publishTutorDemand(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: clientWorkspaceQueryKey });
      void queryClient.invalidateQueries({ queryKey: clientOngoingOrdersQueryKey });
      void queryClient.invalidateQueries({ queryKey: clientPartTimeJobsQueryKey });
      void queryClient.invalidateQueries({ queryKey: clientTutorApplicationsQueryKey });
    }
  });
}

/** 学生直接提交试课申请，不需要 payload；申请记录并入进行中列表，成功后只刷新进行中数据。 */
export function useApplyTutorTrial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (demandId: string) => applyTutorTrial(demandId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: clientWorkspaceQueryKey });
      void queryClient.invalidateQueries({ queryKey: clientOngoingOrdersQueryKey });
    }
  });
}

/** 取消学生自己的试课申请，并刷新家教需求与工作台订单。 */
export function useCancelTutorApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (applicationId: string) => cancelTutorApplication(applicationId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: clientWorkspaceQueryKey });
      void queryClient.invalidateQueries({ queryKey: clientOngoingOrdersQueryKey });
      void queryClient.invalidateQueries({ queryKey: clientPartTimeJobsQueryKey });
      void queryClient.invalidateQueries({ queryKey: clientTutorApplicationsQueryKey });
    }
  });
}

export function useConfirmTutorTrial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ConfirmTutorTrialRequest & { applicationId: string; demandId: string }) => {
      const { applicationId, demandId, ...request } = payload;
      return confirmTutorTrial(demandId, applicationId, request);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: clientWorkspaceQueryKey });
      void queryClient.invalidateQueries({ queryKey: clientOngoingOrdersQueryKey });
      void queryClient.invalidateQueries({ queryKey: clientPartTimeJobsQueryKey });
      void queryClient.invalidateQueries({ queryKey: clientTutorApplicationsQueryKey });
    }
  });
}

export function useConfirmTutorTrialStart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (applicationId: string) => confirmTutorTrialStart(applicationId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: clientWorkspaceQueryKey });
      void queryClient.invalidateQueries({ queryKey: clientOngoingOrdersQueryKey });
      void queryClient.invalidateQueries({ queryKey: clientPartTimeJobsQueryKey });
      void queryClient.invalidateQueries({ queryKey: clientTutorApplicationsQueryKey });
    }
  });
}

export function useRequestTutorTrialEnd() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (applicationId: string) => requestTutorTrialEnd(applicationId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: clientWorkspaceQueryKey });
      void queryClient.invalidateQueries({ queryKey: clientOngoingOrdersQueryKey });
      void queryClient.invalidateQueries({ queryKey: clientPartTimeJobsQueryKey });
      void queryClient.invalidateQueries({ queryKey: clientTutorApplicationsQueryKey });
    }
  });
}

export function useHandleTutorWorkflowAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: TutorWorkflowActionRequest & { applicationId: string }) => {
      const { applicationId, ...request } = payload;
      return handleTutorWorkflowAction(applicationId, request);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: clientWorkspaceQueryKey });
      void queryClient.invalidateQueries({ queryKey: clientOngoingOrdersQueryKey });
      void queryClient.invalidateQueries({ queryKey: clientPartTimeJobsQueryKey });
      void queryClient.invalidateQueries({ queryKey: clientTutorApplicationsQueryKey });
    }
  });
}

export function useCancelTutorDemand() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (demandId: string) => cancelTutorDemand(demandId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: clientWorkspaceQueryKey });
      void queryClient.invalidateQueries({ queryKey: clientOngoingOrdersQueryKey });
      void queryClient.invalidateQueries({ queryKey: clientPartTimeJobsQueryKey });
      void queryClient.invalidateQueries({ queryKey: clientTutorApplicationsQueryKey });
    }
  });
}

export function useUpdateTutorExposure() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (enabled: boolean) => updateTutorExposure(enabled),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["client-home"] });
      void queryClient.invalidateQueries({ queryKey: clientWorkspaceQueryKey });
      void queryClient.invalidateQueries({ queryKey: clientOngoingOrdersQueryKey });
      void queryClient.invalidateQueries({ queryKey: clientTutorCertifiedStudentsQueryKey });
    }
  });
}

export function useCreateClientAddress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ClientAddressRequest) => createClientAddress(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: clientAddressQueryKey });
    }
  });
}

export function useUpdateClientAddress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ClientAddressRequest & { addressId: string }) => {
      const { addressId, ...address } = payload;
      return updateClientAddress(addressId, address);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: clientAddressQueryKey });
    }
  });
}

export function useUseClientAddress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (addressId: string) => useClientAddress(addressId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: clientAddressQueryKey });
    }
  });
}

export function useDeleteClientAddress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (addressId: string) => deleteClientAddress(addressId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: clientAddressQueryKey });
    }
  });
}

export function useSubmitHuntingCertification() {
  return useMutation({
    mutationFn: (payload: SubmitHuntingCertificationRequest) => submitHuntingCertification(payload)
  });
}

export function useSubmitTutorCertification() {
  return useMutation({
    mutationFn: (payload: SubmitTutorCertificationRequest) => submitTutorCertification(payload)
  });
}

export function useChatConversations(enabled = true) {
  return useQuery({
    queryKey: ["client-chat", "conversations"],
    queryFn: getChatConversations,
    enabled
  });
}

export function useChatMessages(conversationId: string | null, enabled = true) {
  return useQuery({
    queryKey: ["client-chat", "messages", conversationId],
    queryFn: () => getChatMessages(conversationId ?? ""),
    enabled: enabled && Boolean(conversationId)
  });
}

export function useChatQuickActions(enabled = true) {
  return useQuery({
    queryKey: ["client-chat", "quick-actions"],
    queryFn: getChatQuickActions,
    enabled
  });
}

export function useCreateChatConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateChatConversationRequest) => createChatConversation(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["client-chat", "conversations"] });
    }
  });
}

export function useSendChatMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SendChatMessageRequest & { conversationId: string }) => {
      const { conversationId, ...message } = payload;
      return sendChatMessage(conversationId, message);
    },
    onSuccess: (_message, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["client-chat", "conversations"] });
      void queryClient.invalidateQueries({ queryKey: ["client-chat", "messages", variables.conversationId] });
    }
  });
}

export function useCreateChatQuickAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ChatQuickActionRequest) => createChatQuickAction(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["client-chat", "quick-actions"] });
    }
  });
}
