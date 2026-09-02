import {
  ChatConversation,
  ChatMessage,
  ChatQuickAction,
  ChatQuickActionRequest,
  ClientAddress,
  ClientAddressRequest,
  ClientHomePayload,
  ClientOrder,
  ClientWorkspacePayload,
  ConfirmTutorTrialRequest,
  TutorWorkflowActionRequest,
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
  SelectRoleRequest,
  SendChatMessageRequest,
  ScheduleTimeTemplate,
  SubmitHuntingCertificationRequest,
  SubmitHuntingCertificationResponse,
  SubmitTutorCertificationRequest,
  SubmitTutorCertificationResponse,
  TutorApplicantProfile,
  TutorCertifiedStudent,
  TutorDemand,
  TutorExposureResponse,
  TutorTrialOccupancy,
  UpdateNicknameRequest,
  UserNickname
} from "@unknown/domain";

type ApiEnvelope<T> = {
  code: string;
  message: string;
  data?: T;
  requestId?: string;
};

const AUTH_STORAGE_KEY = "unknown.client.auth.session";
const AUTH_SESSION_EXPIRED_CODE = "AUTH_SESSION_EXPIRED";
const CLIENT_USER_ROLE_HEADER = "X-Client-User-Role";
const CLIENT_USER_PHONE_HEADER = "X-Client-User-Phone";
const CLIENT_USER_NICKNAME_HEADER = "X-Client-User-Nickname";
const CLIENT_USER_ACCOUNT_STATUS_HEADER = "X-Client-User-Account-Status";

type ApiClientErrorOptions = {
  code?: string | undefined;
  requestId?: string | undefined;
  status?: number | undefined;
};

/** API 客户端错误，保留服务端错误码、请求编号和 HTTP 状态，供业务层判断恢复方式。 */
export class ApiClientError extends Error {
  code?: string;
  requestId?: string;
  status?: number;

  constructor(message: string, options: ApiClientErrorOptions = {}) {
    super(message);
    this.name = "ApiClientError";
    this.code = options.code;
    this.requestId = options.requestId;
    this.status = options.status;
  }
}

/** 判断接口错误是否为本地登录态过期。 */
export function isAuthSessionExpiredError(error: unknown) {
  return error instanceof ApiClientError && error.code === AUTH_SESSION_EXPIRED_CODE;
}

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

function throwApiError(envelope: ApiEnvelope<unknown>, status?: number): never {
  if (envelope.code === AUTH_SESSION_EXPIRED_CODE) {
    clearStoredClientAuthSession();
  }

  throw new ApiClientError(envelope.message || "请求失败", {
    code: envelope.code,
    requestId: envelope.requestId,
    status
  });
}

/** 统一补充登录用户上下文请求头，服务端据此解析当前用户角色。 */
function getClientUserHeaders(): Record<string, string> {
  const session = getStoredClientAuthSession();

  if (!session) {
    return {};
  }

  return {
    Authorization: `Bearer ${session.accessToken}`,
    [CLIENT_USER_ROLE_HEADER]: session.role,
    [CLIENT_USER_PHONE_HEADER]: session.phone,
    [CLIENT_USER_NICKNAME_HEADER]: encodeURIComponent(session.nickname),
    [CLIENT_USER_ACCOUNT_STATUS_HEADER]: session.accountStatus
  };
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
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...getClientUserHeaders(),
      ...normalizeHeaders(init?.headers)
    }
  });
  const result = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok) {
    throwApiError(result, response.status);
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
            ...getClientUserHeaders(),
            ...normalizeHeaders(init?.headers)
          },
          data: parseRequestBody(init?.body),
          success: (response) => {
            const result = response.data as ApiEnvelope<T>;
            if (response.statusCode < 200 || response.statusCode >= 300) {
              try {
                throwApiError(result, response.statusCode);
              } catch (error) {
                reject(error);
              }
              return;
            }
            resolve(result);
          },
          fail: reject
        });
      });

  if (result.code !== "OK" || result.data === undefined) {
    throwApiError(result);
  }

  return result.data;
}

export async function loginClient(payload: LoginRequest): Promise<LoginResponse> {
  return requestJson<LoginResponse>("/client/auth/login", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function registerClient(payload: RegisterRequest): Promise<LoginResponse> {
  return requestJson<LoginResponse>("/client/auth/register", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function selectClientRole(payload: SelectRoleRequest, accessToken: string): Promise<LoginResponse> {
  return requestJson<LoginResponse>("/client/auth/select-role", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify(payload)
  });
}

export async function miniappOneTapLogin(payload: MiniappOneTapLoginRequest): Promise<LoginResponse> {
  return requestJson<LoginResponse>("/client/auth/miniapp/one-tap-login", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function resetClientPassword(
  payload: ResetClientPasswordRequest
): Promise<ResetClientPasswordResponse> {
  return requestJson<ResetClientPasswordResponse>("/client/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function getClientHome(): Promise<ClientHomePayload> {
  return requestJson<ClientHomePayload>("/client/home");
}

export async function getProducts(): Promise<ProductSummary[]> {
  return requestJson<ProductSummary[]>("/client/products");
}

export async function getClientWorkspace(): Promise<ClientWorkspacePayload> {
  return requestJson<ClientWorkspacePayload>("/client/workspace");
}

/** 获取当前账号"进行中"列表，不管什么角色都查这同一个接口，后端按登录态解析角色和用户 ID
 *  聚合不同业务域：学生角色含优选/委托/狩猎/家教，家长角色含优选/家教。只返回真正进行中的记录，
 *  已完成/已取消/已结束等归档状态已在服务端过滤掉；完整历史见 {@link getOrderHistory}。 */
export async function getOngoingOrders(): Promise<ClientOrder[]> {
  return requestJson<ClientOrder[]>("/client/workspace/ongoing");
}

/** 获取当前账号订单历史独立接口，跟 getOngoingOrders 同一套底层数据，但不做归档过滤，供订单历史页展示全部订单。 */
export async function getOrderHistory(): Promise<ClientOrder[]> {
  return requestJson<ClientOrder[]>("/client/workspace/orders");
}

/** 兼职列表：家教是兼职的一种类型，学生角色下会与兼职岗位聚合在同一个数组里返回，字段结构不同，调用方按结构判断类型。 */
export async function getPartTimeJobs(): Promise<Array<PartTimeJob | TutorDemand>> {
  return requestJson<Array<PartTimeJob | TutorDemand>>("/client/workspace/jobs");
}

export async function getHuntingTasks(): Promise<HuntingTask[]> {
  return requestJson<HuntingTask[]>("/client/workspace/commission");
}

/** 家长端可浏览的认证学生列表独立接口，仅家长角色可见。 */
export async function getTutorCertifiedStudents(): Promise<TutorCertifiedStudent[]> {
  return requestJson<TutorCertifiedStudent[]>("/client/workspace/tutors");
}

/** 按需求 id 精确获取家长自己名下某一条家教需求的申请人列表（含完整认证资料，字段口径跟
 *  {@link getTutorCertifiedStudents} 保持一致），只服务"进行中"弹窗点开具体某张卡片时按需加载，跟页面
 *  浏览列表分开请求；不再一次性拉取全部家教需求再由调用方按 id 筛选。 */
export async function getTutorApplication(demandId: string): Promise<TutorApplicantProfile[]> {
  return requestJson<TutorApplicantProfile[]>(
    `/client/workspace/ongoing/tutor/application?id=${encodeURIComponent(demandId)}`
  );
}

/** 获取家长账号下除当前申请外仍有效的试课占用日程。 */
export async function getTutorTrialOccupancy(excludeApplicationId: string): Promise<TutorTrialOccupancy> {
  return requestJson<TutorTrialOccupancy>(
    `/client/workspace/ongoing/tutor/trial-occupancy?excludeApplicationId=${encodeURIComponent(excludeApplicationId)}`
  );
}

export async function getClientAddresses(): Promise<ClientAddress[]> {
  return requestJson<ClientAddress[]>("/client/profile/addresses");
}

export async function updateClientNickname(payload: UpdateNicknameRequest): Promise<UserNickname> {
  return requestJson<UserNickname>("/client/profile/nickname", {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

/** 更新当前用户的早、中、晚可用时间模板。 */
export async function updateClientScheduleTimeTemplate(
  payload: ScheduleTimeTemplate
): Promise<ScheduleTimeTemplate> {
  return requestJson<ScheduleTimeTemplate>("/client/profile/schedule-time-template", {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export async function createClientAddress(payload: ClientAddressRequest): Promise<ClientAddress> {
  return requestJson<ClientAddress>("/client/profile/addresses", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateClientAddress(addressId: string, payload: ClientAddressRequest): Promise<ClientAddress> {
  return requestJson<ClientAddress>(`/client/profile/addresses/${encodeURIComponent(addressId)}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export async function useClientAddress(addressId: string): Promise<ClientAddress[]> {
  return requestJson<ClientAddress[]>(`/client/profile/addresses/${encodeURIComponent(addressId)}/current`, {
    method: "POST"
  });
}

export async function deleteClientAddress(addressId: string): Promise<ClientAddress[]> {
  return requestJson<ClientAddress[]>(`/client/profile/addresses/${encodeURIComponent(addressId)}`, {
    method: "DELETE"
  });
}

export async function publishHuntingTask(payload: PublishHuntingTaskRequest): Promise<HuntingTask> {
  return requestJson<HuntingTask>("/client/workspace/commission", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function acceptHuntingTask(taskId: string): Promise<HuntingTask> {
  return requestJson<HuntingTask>(`/client/workspace/commission/${encodeURIComponent(taskId)}/accept`, {
    method: "POST"
  });
}

export async function quoteHuntingTask(taskId: string, payload: QuoteHuntingTaskRequest): Promise<HuntingTask> {
  return requestJson<HuntingTask>(`/client/workspace/commission/${encodeURIComponent(taskId)}/quotes`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function decideHuntingTaskQuote(
  taskId: string,
  quoteId: string,
  payload: HuntingQuoteDecisionRequest
): Promise<HuntingTask> {
  return requestJson<HuntingTask>(
    `/client/workspace/commission/${encodeURIComponent(taskId)}/quotes/${encodeURIComponent(quoteId)}/decision`,
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
    `/client/workspace/commission/${encodeURIComponent(taskId)}/fulfillment-action`,
    {
      method: "POST",
      body: JSON.stringify(payload)
    }
  );
}

export async function submitHuntingCertification(
  payload: SubmitHuntingCertificationRequest
): Promise<SubmitHuntingCertificationResponse> {
  return requestJson<SubmitHuntingCertificationResponse>("/client/profile/hunting-certification", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function submitTutorCertification(
  payload: SubmitTutorCertificationRequest
): Promise<SubmitTutorCertificationResponse> {
  return requestJson<SubmitTutorCertificationResponse>("/client/profile/tutor-certification", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}


export async function updateTutorExposure(enabled: boolean): Promise<TutorExposureResponse> {
  return requestJson<TutorExposureResponse>("/client/profile/tutor-exposure", {
    method: "PUT",
    body: JSON.stringify({ enabled })
  });
}

export async function createHuntingProject(payload: CreateHuntingProjectRequest): Promise<HuntingProjectResponse> {
  return requestJson<HuntingProjectResponse>("/client/workspace/hunting-projects", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function publishTutorDemand(payload: PublishTutorDemandRequest): Promise<TutorDemand> {
  return requestJson<TutorDemand>("/client/workspace/tutor-demands", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

/** 学生直接提交试课申请，demandId 已经在 URL 里，不需要额外 payload。 */
export async function applyTutorTrial(demandId: string): Promise<TutorDemand> {
  return requestJson<TutorDemand>(`/client/workspace/tutor-demands/${encodeURIComponent(demandId)}/applications`, {
    method: "POST"
  });
}

/** 学生取消自己的家教试课申请。 */
export async function cancelTutorApplication(applicationId: string): Promise<TutorDemand> {
  return requestJson<TutorDemand>(
    `/client/workspace/tutor-applications/${encodeURIComponent(applicationId)}/cancel`,
    { method: "POST" }
  );
}

export async function confirmTutorTrial(
  demandId: string,
  applicationId: string,
  payload: ConfirmTutorTrialRequest
): Promise<TutorDemand> {
  return requestJson<TutorDemand>(
    `/client/workspace/tutor-demands/${encodeURIComponent(demandId)}/applications/${encodeURIComponent(applicationId)}/trial`,
    {
      method: "POST",
      body: JSON.stringify(payload)
    }
  );
}

export async function confirmTutorTrialStart(applicationId: string): Promise<TutorDemand> {
  return requestJson<TutorDemand>(
    `/client/workspace/tutor-applications/${encodeURIComponent(applicationId)}/trial/confirm`,
    {
      method: "POST"
    }
  );
}

export async function requestTutorTrialEnd(applicationId: string): Promise<TutorDemand> {
  return requestJson<TutorDemand>(
    `/client/workspace/tutor-applications/${encodeURIComponent(applicationId)}/trial/end-request`,
    {
      method: "POST"
    }
  );
}

export async function cancelTutorDemand(demandId: string): Promise<TutorDemand> {
  return requestJson<TutorDemand>(`/client/workspace/tutor-demands/${encodeURIComponent(demandId)}/cancel`, {
    method: "POST"
  });
}

export async function handleTutorWorkflowAction(
  applicationId: string,
  payload: TutorWorkflowActionRequest
): Promise<TutorDemand> {
  return requestJson<TutorDemand>(
    `/client/workspace/tutor-applications/${encodeURIComponent(applicationId)}/workflow-action`,
    {
      method: "POST",
      body: JSON.stringify(payload)
    }
  );
}

export async function getChatConversations(): Promise<ChatConversation[]> {
  return requestJson<ChatConversation[]>("/client/chat/conversations");
}

export async function createChatConversation(payload: CreateChatConversationRequest): Promise<ChatConversation> {
  return requestJson<ChatConversation>("/client/chat/conversations", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function getChatMessages(conversationId: string): Promise<ChatMessage[]> {
  return requestJson<ChatMessage[]>(`/client/chat/conversations/${encodeURIComponent(conversationId)}/messages`);
}

export async function sendChatMessage(conversationId: string, payload: SendChatMessageRequest): Promise<ChatMessage> {
  return requestJson<ChatMessage>(`/client/chat/conversations/${encodeURIComponent(conversationId)}/messages`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function getChatQuickActions(): Promise<ChatQuickAction[]> {
  return requestJson<ChatQuickAction[]>("/client/chat/quick-actions");
}

export async function createChatQuickAction(payload: ChatQuickActionRequest): Promise<ChatQuickAction> {
  return requestJson<ChatQuickAction>("/client/chat/quick-actions", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function purchaseProduct(payload: PurchaseRequest): Promise<PurchaseResponse> {
  return requestJson<PurchaseResponse>("/client/products/purchase", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}
