import { createContext, useContext } from "react";

import { useHomeRuntime } from "./runtime";

/** Home 领域运行时 Context，仅供 Provider 文件内部装配。 */
const HomeRuntimeContext = createContext<ReturnType<typeof useHomeRuntime> | null>(null);

/** 为一级路由和 Home 子路由提供共享运行时，避免 App 逐层转发页面数据与动作。 */
export function HomeProvider({ children }: { children: ReactNode }) {
  const runtime = useHomeRuntime();

  return <HomeRuntimeContext.Provider value={runtime}>{children}</HomeRuntimeContext.Provider>;
}

/** 读取 Home 运行时；所有消费者必须位于 HomeProvider 内。 */
export function useHomeRuntimeContext() {
  const context = useContext(HomeRuntimeContext);

  if (!context) {
    throw new Error("useHomeRuntimeContext 必须在 HomeProvider 内使用");
  }

  return context;
}
