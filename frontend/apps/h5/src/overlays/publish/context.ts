import { useOverlayState } from "../context";

/** 发布入口使用的稳定命令 Context。 */
export const PublishOverlayActionsContext = createContext<PublishOverlayActions | null>(null);

/** 发布 Host 使用的业务数据与动作 Context。 */
export const PublishOverlayHostContext = createContext<PublishOverlayHostContextValue | null>(null);

/** 读取发布入口命令。 */
export function usePublishOverlayActions() {
  const context = useContext(PublishOverlayActionsContext);

  if (!context) {
    throw new Error("usePublishOverlayActions 必须在 PublishOverlayProvider 内使用。");
  }

  return context;
}

/** 读取发布 Host 需要的真实业务数据与动作。 */
export function usePublishOverlayHost() {
  const context = useContext(PublishOverlayHostContext);

  if (!context) {
    throw new Error("usePublishOverlayHost 必须在 PublishOverlayProvider 内使用。");
  }

  return context;
}

/** 读取当前发布弹层类型。 */
export function usePublishOverlayType(): PublishOverlayType | null {
  const overlayState = useOverlayState();

  if (overlayState.confirm?.type === "publishDraftConfirm") {
    return "publishDraftConfirm";
  }

  return overlayState.primary?.type === "publishInfo" ? "publishInfo" : null;
}
