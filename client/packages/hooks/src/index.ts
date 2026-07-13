import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  acceptHuntingTask,
  confirmHuntingTaskQuote,
  createClientAddress,
  decideHuntingTaskQuote,
  deleteClientAddress,
  getClientAddresses,
  getClientHome,
  getClientWorkspace,
  getProducts,
  handleHuntingTaskFulfillmentAction,
  loginClient,
  miniappOneTapLogin,
  publishHuntingTask,
  purchaseProduct,
  quoteHuntingTask,
  registerClient,
  selectClientRole,
  submitHuntingCertification,
  updateClientAddress,
  useClientAddress
} from "@unknown/api-client";
import {
  ClientAddressRequest,
  HuntingQuoteDecisionRequest,
  HuntingTaskFulfillmentActionRequest,
  LoginRequest,
  MiniappOneTapLoginRequest,
  PublishHuntingTaskRequest,
  PurchaseRequest,
  QuoteHuntingTaskRequest,
  RegisterRequest,
  Role,
  SelectRoleRequest,
  SubmitHuntingCertificationRequest
} from "@unknown/domain";

export const clientAddressQueryKey = ["client-addresses"] as const;

function getClientAddressQueryKey(ownerKey?: string) {
  return ownerKey ? [...clientAddressQueryKey, ownerKey] : clientAddressQueryKey;
}

export function useClientHome(role: Role, enabled = true) {
  return useQuery({
    queryKey: ["client-home", role],
    queryFn: () => getClientHome(role),
    enabled
  });
}

export function useProducts(role: Role, enabled = true) {
  return useQuery({
    queryKey: ["products", role],
    queryFn: () => getProducts(role),
    enabled
  });
}

export function useClientWorkspace(role: Role, enabled = true) {
  return useQuery({
    queryKey: ["client-workspace", role],
    queryFn: () => getClientWorkspace(role),
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
      void queryClient.invalidateQueries({ queryKey: ["client-workspace"] });
    }
  });
}

export function useAcceptHuntingTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskId: string) => acceptHuntingTask(taskId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["client-workspace"] });
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
      void queryClient.invalidateQueries({ queryKey: ["client-workspace"] });
    }
  });
}

export function useConfirmHuntingTaskQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { quoteId: string; taskId: string }) =>
      confirmHuntingTaskQuote(payload.taskId, payload.quoteId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["client-workspace"] });
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
      void queryClient.invalidateQueries({ queryKey: ["client-workspace"] });
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
      void queryClient.invalidateQueries({ queryKey: ["client-workspace"] });
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
