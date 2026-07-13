import {
  ClientHomePayload,
  ClientWorkspacePayload,
  LoginRequest,
  LoginResponse,
  MiniappOneTapLoginRequest,
  HuntingTask,
  ProductSummary,
  PublishHuntingTaskRequest,
  PurchaseRequest,
  PurchaseResponse,
  RegisterRequest,
  Role,
  SelectRoleRequest
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
  return runtime.__UNKNOWN_API_BASE_URL__ ?? "http://127.0.0.1:8080";
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

export async function getClientHome(role: Role): Promise<ClientHomePayload> {
  return requestJson<ClientHomePayload>(`/api/client/home?role=${role}`);
}

export async function getProducts(role: Role): Promise<ProductSummary[]> {
  return requestJson<ProductSummary[]>(`/api/client/products?role=${role}`);
}

export async function getClientWorkspace(role: Role): Promise<ClientWorkspacePayload> {
  return requestJson<ClientWorkspacePayload>(`/api/client/workspace?role=${role}`);
}

export async function publishHuntingTask(payload: PublishHuntingTaskRequest): Promise<HuntingTask> {
  return requestJson<HuntingTask>("/api/client/workspace/hunting-tasks", {
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
