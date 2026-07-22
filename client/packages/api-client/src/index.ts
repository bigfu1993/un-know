import {
  ApplyTutorTrialRequest,
  ChatConversation,
  ChatMessage,
  ChatQuickAction,
  ChatQuickActionRequest,
  ClientAddress,
  ClientAddressRequest,
  ClientHomePayload,
  ClientWorkspacePayload,
  CompleteTutorTrialEndRequest,
  ConfirmTutorTrialRequest,
  CreateChatConversationRequest,
  CreateHuntingProjectRequest,
  HuntingProjectResponse,
  LoginRequest,
  LoginResponse,
  MiniappOneTapLoginRequest,
  HuntingQuoteDecisionRequest,
  HuntingTaskFulfillmentActionRequest,
  HuntingTask,
  PartTimeJob,
  ProductSummary,
  PublishHuntingTaskRequest,
  PublishTutorDemandRequest,
  PurchaseRequest,
  PurchaseResponse,
  QuoteHuntingTaskRequest,
  RegisterRequest,
  ResetClientPasswordRequest,
  ResetClientPasswordResponse,
  Role,
  SelectRoleRequest,
  SendChatMessageRequest,
  SubmitHuntingCertificationRequest,
  SubmitHuntingCertificationResponse,
  TutorDemand,
  TutorExposureResponse
} from "@unknown/domain";

type ApiEnvelope<T> = {
  code: string;
  message: string;
  data?: T;
  requestId?: string;
};

const AUTH_STORAGE_KEY = "unknown.client.auth.session";

type RuntimeGlobals = typeof globalThis & {
  __UNKNOWN_API_BASE_URL__?: string;
  wx?: {
    request: (options: {
      url: string;
      method?: string;
      header?: Record<string, string>;
      data?: unknown;
      success: (response: { statusCode: number; data: unknown }) => void;
      fail: (error: unknown) => void;
    }) => void;
    getStorageSync?: (key: string) => string | undefined;
    setStorageSync?: (key: string, value: string) => void;
    removeStorageSync?: (key: string) => void;
  };
};

function getApiBaseUrl() {
  const runtime = globalThis as RuntimeGlobals;
  return runtime.__UNKNOWN_API_BASE_URL__ ?? "http://127.0.0.1:9988";
}

function getLocalStorage() {
  try {
    if (typeof localStorage !== "undefined") {
      return localStorage;
    }
    const runtime = globalThis as RuntimeGlobals;
    if (runtime.wx?.getStorageSync && runtime.wx.setStorageSync && runtime.wx.removeStorageSync) {
      return {
        getItem: (key: string) => runtime.wx?.getStorageSync?.(key) ?? null,
        setItem: (key: string, value: string) => runtime.wx?.setStorageSync?.(key, value),
        removeItem: (key: string) => runtime.wx?.removeStorageSync?.(key)
      };
    }
    return undefined;
  } catch {
    return undefined;
  }
}

export function getStoredClientAuthSession(): LoginResponse | null {
  const storage = getLocalStorage();
  const raw = storage?.getItem(AUTH_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as LoginResponse;
  } catch {
    storage?.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

export function setStoredClientAuthSession(session: LoginResponse) {
  getLocalStorage()?.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

export function clearStoredClientAuthSession() {
  getLocalStorage()?.removeItem(AUTH_STORAGE_KEY);
}

function getAuthHeaders(): Record<string, string> {
  const token = getStoredClientAuthSession()?.accessToken;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function normalizeHeaders(headers?: HeadersInit): Record<string, string> {
  if (!headers) {
    return {};
  }
  if (headers instanceof Headers) {
    const result: Record<string, string> = {};
    headers.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }
  if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }
  return headers;
}

function parseRequestBody(body: RequestInit["body"] | undefined) {
  if (!body) {
    return undefined;
  }
  if (typeof body === "string") {
    return JSON.parse(body);
  }
  return body;
}

async function requestWithFetch<T>(url: string, init?: RequestInit): Promise<ApiEnvelope<T>> {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
      ...normalizeHeaders(init?.headers)
    },
    ...init
  });
  const result = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok) {
    throw new Error(result.message || `HTTP ${response.status}`);
  }
  return result;
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${getApiBaseUrl()}${path}`;
  const runtime = globalThis as RuntimeGlobals;
  const hasFetch = typeof fetch === "function";

  const result = hasFetch
    ? await requestWithFetch<T>(url, init)
    : await new Promise<ApiEnvelope<T>>((resolve, reject) => {
        if (!runtime.wx?.request) {
          reject(new Error("当前运行环境不支持网络请求"));
          return;
        }

        runtime.wx.request({
          url,
          method: init?.method ?? "GET",
          header: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
            ...normalizeHeaders(init?.headers)
          },
          data: parseRequestBody(init?.body),
          success: (response) => {
            if (response.statusCode < 200 || response.statusCode >= 300) {
              reject(new Error(`HTTP ${response.statusCode}`));
              return;
            }
            resolve(response.data as ApiEnvelope<T>);
          },
          fail: reject
        });
      });

  if (result.code !== "OK" || result.data === undefined) {
    throw new Error(result.message || "请求失败");
  }

  return result.data;
}

export async function loginClient(payload: LoginRequest): Promise<LoginResponse> {
  return requestJson<LoginResponse>("/api/client/auth/login", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function registerClient(payload: RegisterRequest): Promise<LoginResponse> {
  return requestJson<LoginResponse>("/api/client/auth/register", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function selectClientRole(payload: SelectRoleRequest, accessToken: string): Promise<LoginResponse> {
  return requestJson<LoginResponse>("/api/client/auth/select-role", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify(payload)
  });
}

export async function miniappOneTapLogin(payload: MiniappOneTapLoginRequest): Promise<LoginResponse> {
  return requestJson<LoginResponse>("/api/client/auth/miniapp/one-tap-login", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function resetClientPassword(
  payload: ResetClientPasswordRequest
): Promise<ResetClientPasswordResponse> {
  return requestJson<ResetClientPasswordResponse>("/api/client/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function getClientHome(role: Role): Promise<ClientHomePayload> {
  return requestJson<ClientHomePayload>(`/api/client/home?role=${role}`);
}

export async function getProducts(role: Role): Promise<ProductSummary[]> {
  return requestJson<ProductSummary[]>(`/api/client/products?role=${role}`);
}

export async function getClientWorkspace(role: Role): Promise<ClientWorkspacePayload> {
  return requestJson<ClientWorkspacePayload>(`/api/client/workspace?role=${role}`);
}

export async function getPartTimeJobs(role: Role): Promise<PartTimeJob[]> {
  return requestJson<PartTimeJob[]>(`/api/client/workspace/part-time-jobs?role=${role}`);
}

export async function getHuntingTasks(role: Role): Promise<HuntingTask[]> {
  return requestJson<HuntingTask[]>(`/api/client/workspace/hunting-tasks?role=${role}`);
}

export async function getTutorDemands(role: Role): Promise<TutorDemand[]> {
  return requestJson<TutorDemand[]>(`/api/client/workspace/tutor-demands?role=${role}`);
}

export async function getClientAddresses(): Promise<ClientAddress[]> {
  return requestJson<ClientAddress[]>("/api/client/profile/addresses");
}

export async function createClientAddress(payload: ClientAddressRequest): Promise<ClientAddress> {
  return requestJson<ClientAddress>("/api/client/profile/addresses", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateClientAddress(addressId: string, payload: ClientAddressRequest): Promise<ClientAddress> {
  return requestJson<ClientAddress>(`/api/client/profile/addresses/${encodeURIComponent(addressId)}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export async function useClientAddress(addressId: string): Promise<ClientAddress[]> {
  return requestJson<ClientAddress[]>(`/api/client/profile/addresses/${encodeURIComponent(addressId)}/current`, {
    method: "POST"
  });
}

export async function deleteClientAddress(addressId: string): Promise<ClientAddress[]> {
  return requestJson<ClientAddress[]>(`/api/client/profile/addresses/${encodeURIComponent(addressId)}`, {
    method: "DELETE"
  });
}

export async function publishHuntingTask(payload: PublishHuntingTaskRequest): Promise<HuntingTask> {
  return requestJson<HuntingTask>("/api/client/workspace/hunting-tasks", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function acceptHuntingTask(taskId: string): Promise<HuntingTask> {
  return requestJson<HuntingTask>(`/api/client/workspace/hunting-tasks/${encodeURIComponent(taskId)}/accept`, {
    method: "POST"
  });
}

export async function quoteHuntingTask(taskId: string, payload: QuoteHuntingTaskRequest): Promise<HuntingTask> {
  return requestJson<HuntingTask>(`/api/client/workspace/hunting-tasks/${encodeURIComponent(taskId)}/quotes`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function confirmHuntingTaskQuote(taskId: string, quoteId: string): Promise<HuntingTask> {
  return requestJson<HuntingTask>(
    `/api/client/workspace/hunting-tasks/${encodeURIComponent(taskId)}/quotes/${encodeURIComponent(quoteId)}/confirm`,
    {
      method: "POST"
    }
  );
}

export async function decideHuntingTaskQuote(
  taskId: string,
  quoteId: string,
  payload: HuntingQuoteDecisionRequest
): Promise<HuntingTask> {
  return requestJson<HuntingTask>(
    `/api/client/workspace/hunting-tasks/${encodeURIComponent(taskId)}/quotes/${encodeURIComponent(quoteId)}/decision`,
    {
      method: "POST",
      body: JSON.stringify(payload)
    }
  );
}

export async function handleHuntingTaskFulfillmentAction(
  taskId: string,
  payload: HuntingTaskFulfillmentActionRequest
): Promise<HuntingTask> {
  return requestJson<HuntingTask>(
    `/api/client/workspace/hunting-tasks/${encodeURIComponent(taskId)}/fulfillment-action`,
    {
      method: "POST",
      body: JSON.stringify(payload)
    }
  );
}

export async function submitHuntingCertification(
  payload: SubmitHuntingCertificationRequest
): Promise<SubmitHuntingCertificationResponse> {
  return requestJson<SubmitHuntingCertificationResponse>("/api/client/profile/hunting-certification", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}


export async function updateTutorExposure(enabled: boolean): Promise<TutorExposureResponse> {
  return requestJson<TutorExposureResponse>("/api/client/profile/tutor-exposure", {
    method: "PUT",
    body: JSON.stringify({ enabled })
  });
}

export async function createHuntingProject(payload: CreateHuntingProjectRequest): Promise<HuntingProjectResponse> {
  return requestJson<HuntingProjectResponse>("/api/client/workspace/hunting-projects", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function publishTutorDemand(payload: PublishTutorDemandRequest): Promise<TutorDemand> {
  return requestJson<TutorDemand>("/api/client/workspace/tutor-demands", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function applyTutorTrial(demandId: string, payload: ApplyTutorTrialRequest): Promise<TutorDemand> {
  return requestJson<TutorDemand>(`/api/client/workspace/tutor-demands/${encodeURIComponent(demandId)}/applications`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

/** 学生取消自己的家教试课申请。 */
export async function cancelTutorApplication(applicationId: string): Promise<TutorDemand> {
  return requestJson<TutorDemand>(
    `/api/client/workspace/tutor-applications/${encodeURIComponent(applicationId)}/cancel`,
    { method: "POST" }
  );
}

export async function confirmTutorTrial(
  demandId: string,
  applicationId: string,
  payload: ConfirmTutorTrialRequest
): Promise<TutorDemand> {
  return requestJson<TutorDemand>(
    `/api/client/workspace/tutor-demands/${encodeURIComponent(demandId)}/applications/${encodeURIComponent(applicationId)}/trial`,
    {
      method: "POST",
      body: JSON.stringify(payload)
    }
  );
}

export async function confirmTutorTrialStart(applicationId: string): Promise<TutorDemand> {
  return requestJson<TutorDemand>(
    `/api/client/workspace/tutor-applications/${encodeURIComponent(applicationId)}/trial/confirm`,
    {
      method: "POST"
    }
  );
}

export async function requestTutorTrialEnd(applicationId: string): Promise<TutorDemand> {
  return requestJson<TutorDemand>(
    `/api/client/workspace/tutor-applications/${encodeURIComponent(applicationId)}/trial/end-request`,
    {
      method: "POST"
    }
  );
}

export async function completeTutorTrialEnd(
  demandId: string,
  applicationId: string,
  payload: CompleteTutorTrialEndRequest
): Promise<TutorDemand> {
  return requestJson<TutorDemand>(
    `/api/client/workspace/tutor-demands/${encodeURIComponent(demandId)}/applications/${encodeURIComponent(applicationId)}/trial/end`,
    {
      method: "POST",
      body: JSON.stringify(payload)
    }
  );
}

export async function cancelTutorDemand(demandId: string): Promise<TutorDemand> {
  return requestJson<TutorDemand>(`/api/client/workspace/tutor-demands/${encodeURIComponent(demandId)}/cancel`, {
    method: "POST"
  });
}

export async function getChatConversations(): Promise<ChatConversation[]> {
  return requestJson<ChatConversation[]>("/api/client/chat/conversations");
}

export async function createChatConversation(payload: CreateChatConversationRequest): Promise<ChatConversation> {
  return requestJson<ChatConversation>("/api/client/chat/conversations", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function getChatMessages(conversationId: string): Promise<ChatMessage[]> {
  return requestJson<ChatMessage[]>(`/api/client/chat/conversations/${encodeURIComponent(conversationId)}/messages`);
}

export async function sendChatMessage(conversationId: string, payload: SendChatMessageRequest): Promise<ChatMessage> {
  return requestJson<ChatMessage>(`/api/client/chat/conversations/${encodeURIComponent(conversationId)}/messages`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function getChatQuickActions(): Promise<ChatQuickAction[]> {
  return requestJson<ChatQuickAction[]>("/api/client/chat/quick-actions");
}

export async function createChatQuickAction(payload: ChatQuickActionRequest): Promise<ChatQuickAction> {
  return requestJson<ChatQuickAction>("/api/client/chat/quick-actions", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function purchaseProduct(payload: PurchaseRequest): Promise<PurchaseResponse> {
  return requestJson<PurchaseResponse>("/api/client/products/purchase", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}
