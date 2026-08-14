import { getStoredClientAuthSession } from "./index";

/** 客户端实时事件类型。 */
export interface ClientRealtimeEvent {
  bizId: string;
  bizType: string;
  occurredAt: string;
  reason: string;
  scope: string;
  type: "ongoing_orders_changed" | string;
  version: number;
}

/** 客户端实时连接状态。 */
export type ClientRealtimeStatus = "closed" | "connecting" | "connected";

/** 客户端实时连接配置。 */
export interface ClientRealtimeConnectionOptions {
  onEvent: (event: ClientRealtimeEvent) => void;
  onStatusChange?: (status: ClientRealtimeStatus) => void;
  reconnectDelayMs?: number;
}

type RuntimeGlobals = typeof globalThis & {
  __UNKNOWN_API_BASE_URL__?: string;
};

/**
 * 创建客户端 WebSocket 实时连接。
 *
 * <p>连接只接收轻量事件，不直接消费业务数据；业务数据仍由 HTTP 接口查询。</p>
 */
export function createClientRealtimeConnection(options: ClientRealtimeConnectionOptions) {
  let socket: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;
  const reconnectDelayMs = options.reconnectDelayMs ?? 3000;

  /** 启动 WebSocket 连接。 */
  function start() {
    stopped = false;
    connect();
  }

  /** 主动停止 WebSocket 连接和重连定时器。 */
  function stop() {
    stopped = true;
    options.onStatusChange?.("closed");
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    socket?.close();
    socket = null;
  }

  function connect() {
    if (stopped || typeof WebSocket === "undefined") {
      return;
    }

    const session = getStoredClientAuthSession();
    if (!session?.accessToken) {
      options.onStatusChange?.("closed");
      return;
    }

    options.onStatusChange?.("connecting");
    socket = new WebSocket(getRealtimeUrl());
    socket.onopen = () => {
      socket?.send(
        JSON.stringify({
          accessToken: session.accessToken,
          type: "auth"
        })
      );
    };
    socket.onmessage = (message) => handleMessage(message.data);
    socket.onerror = () => {
      socket?.close();
    };
    socket.onclose = (event) => {
      socket = null;
      options.onStatusChange?.("closed");
      if (!stopped && event.code !== 4001 && event.code !== 4002) {
        scheduleReconnect();
      }
    };
  }

  function handleMessage(data: unknown) {
    if (typeof data !== "string") {
      return;
    }

    let message: { type?: string };
    try {
      message = JSON.parse(data) as { type?: string };
    } catch {
      return;
    }
    if (message.type === "connected") {
      options.onStatusChange?.("connected");
      return;
    }
    if (message.type === "ongoing_orders_changed") {
      options.onEvent(message as ClientRealtimeEvent);
    }
  }

  function scheduleReconnect() {
    if (reconnectTimer) {
      return;
    }

    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, reconnectDelayMs);
  }

  return {
    start,
    stop
  };
}

function getRealtimeUrl() {
  const runtime = globalThis as RuntimeGlobals;
  const apiBaseUrl = runtime.__UNKNOWN_API_BASE_URL__ ?? "http://127.0.0.1:9988";
  const url = new URL(apiBaseUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = "/ws/client";
  url.search = "";
  url.hash = "";
  return url.toString();
}
