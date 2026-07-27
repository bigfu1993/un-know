import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  acceptHuntingTask,
  applyTutorTrial,
  cancelTutorApplication,
  cancelTutorDemand,
  confirmHuntingTaskQuote,
  completeTutorTrialEnd,
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
  getTutorDemands,
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
  updateClientAddress,
  updateClientNickname,
  updateTutorExposure,
  useClientAddress
} from "@unknown/api-client";
import {
  ApplyTutorTrialRequest,
  ChatQuickActionRequest,
  CompleteTutorTrialEndRequest,
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
  UpdateNicknameRequest,
  TutorWorkflowActionRequest
} from "@unknown/domain";

export const clientAddressQueryKey = ["client-addresses"] as const;
export const clientWorkspaceQueryKey = ["client-workspace"] as const;
export const clientPartTimeJobsQueryKey = ["client-part-time-jobs"] as const;
export const clientHuntingTasksQueryKey = ["client-hunting-tasks"] as const;
export const clientTutorDemandsQueryKey = ["client-tutor-demands"] as const;

function getClientAddressQueryKey(ownerKey?: string) {
  return ownerKey ? [...clientAddressQueryKey, ownerKey] : clientAddressQueryKey;
}

function getRoleQueryKey(baseKey: readonly string[], role: Role) {
  return [...baseKey, role] as const;
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

export function useTutorDemands(role: Role, enabled = true) {
  return useQuery({
    queryKey: getRoleQueryKey(clientTutorDemandsQueryKey, role),
    queryFn: getTutorDemands,
    enabled
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
      void queryClient.invalidateQueries({ queryKey: clientHuntingTasksQueryKey });
    }
  });
}

export function useConfirmHuntingTaskQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { quoteId: string; taskId: string }) =>
      confirmHuntingTaskQuote(payload.taskId, payload.quoteId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: clientWorkspaceQueryKey });
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
      void queryClient.invalidateQueries({ queryKey: clientTutorDemandsQueryKey });
    }
  });
}

export function useApplyTutorTrial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ApplyTutorTrialRequest & { demandId: string }) => {
      const { demandId, ...request } = payload;
      return applyTutorTrial(demandId, request);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: clientWorkspaceQueryKey });
      void queryClient.invalidateQueries({ queryKey: clientTutorDemandsQueryKey });
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
      void queryClient.invalidateQueries({ queryKey: clientTutorDemandsQueryKey });
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
      void queryClient.invalidateQueries({ queryKey: clientTutorDemandsQueryKey });
    }
  });
}

export function useConfirmTutorTrialStart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (applicationId: string) => confirmTutorTrialStart(applicationId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: clientWorkspaceQueryKey });
      void queryClient.invalidateQueries({ queryKey: clientTutorDemandsQueryKey });
    }
  });
}

export function useRequestTutorTrialEnd() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (applicationId: string) => requestTutorTrialEnd(applicationId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: clientWorkspaceQueryKey });
      void queryClient.invalidateQueries({ queryKey: clientTutorDemandsQueryKey });
    }
  });
}

export function useCompleteTutorTrialEnd() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CompleteTutorTrialEndRequest & { applicationId: string; demandId: string }) => {
      const { applicationId, demandId, ...request } = payload;
      return completeTutorTrialEnd(demandId, applicationId, request);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: clientWorkspaceQueryKey });
      void queryClient.invalidateQueries({ queryKey: clientTutorDemandsQueryKey });
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
      void queryClient.invalidateQueries({ queryKey: clientTutorDemandsQueryKey });
    }
  });
}

export function useCancelTutorDemand() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (demandId: string) => cancelTutorDemand(demandId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: clientWorkspaceQueryKey });
      void queryClient.invalidateQueries({ queryKey: clientTutorDemandsQueryKey });
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
      void queryClient.invalidateQueries({ queryKey: clientTutorDemandsQueryKey });
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
