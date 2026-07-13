import { useMutation, useQuery } from "@tanstack/react-query";
import {
  getClientHome,
  getClientWorkspace,
  getProducts,
  loginClient,
  miniappOneTapLogin,
  publishHuntingTask,
  purchaseProduct,
  registerClient,
  selectClientRole
} from "@unknown/api-client";
import {
  LoginRequest,
  MiniappOneTapLoginRequest,
  PublishHuntingTaskRequest,
  PurchaseRequest,
  RegisterRequest,
  Role,
  SelectRoleRequest
} from "@unknown/domain";

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
  return useMutation({
    mutationFn: (payload: PublishHuntingTaskRequest) => publishHuntingTask(payload)
  });
}
