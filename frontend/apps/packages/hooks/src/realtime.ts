import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClientRealtimeConnection } from "@unknown/api-client/realtime";
import type { ClientRealtimeEvent } from "@unknown/api-client/realtime";
import { clientHuntingTasksQueryKey, clientTutorDemandsQueryKey, clientWorkspaceQueryKey } from "./queryKeys";

/** 进行中模块实时刷新配置。 */
interface UseOngoingOrdersRealtimeOptions {
  enabled: boolean;
  sessionKey?: string | null;
}

/**
 * 订阅进行中模块实时事件。
 *
 * <p>WebSocket 只触发查询失效；业务数据仍通过 HTTP 接口读取，避免实时消息成为第二套数据源。</p>
 */
export function useOngoingOrdersRealtime({ enabled, sessionKey }: UseOngoingOrdersRealtimeOptions) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || !sessionKey) {
      return undefined;
    }

    /** 根据事件 scope 精准刷新相关接口缓存。 */
    function invalidateRealtimeEvent(event: ClientRealtimeEvent) {
      if (event.scope !== "ongoing_orders") {
        return;
      }

      void queryClient.invalidateQueries({ queryKey: clientWorkspaceQueryKey });
      if (event.bizType === "hunting") {
        void queryClient.invalidateQueries({ queryKey: clientHuntingTasksQueryKey });
      }
      if (event.bizType === "tutor") {
        void queryClient.invalidateQueries({ queryKey: clientTutorDemandsQueryKey });
      }
    }

    const connection = createClientRealtimeConnection({
      onEvent: (event) => {
        invalidateRealtimeEvent(event);
      }
    });

    connection.start();

    return () => {
      connection.stop();
    };
  }, [enabled, queryClient, sessionKey]);
}
