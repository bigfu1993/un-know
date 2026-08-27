import { initialOverlayState, overlayReducer } from "./reducer";

/** 全局弹层状态 Context，仅由弹层 Host 和展示状态消费者订阅，保持文件私有。 */
const OverlayStateContext = createContext<OverlayState | null>(null);

/** 全局弹层命令 Context，value 在弹层状态变化时保持稳定，保持文件私有。 */
const OverlayActionsContext = createContext<OverlayActions | null>(null);

/** 读取全局弹层状态；仅弹层 Host 和需要展示状态的组件使用。 */
export function useOverlayState() {
  const context = useContext(OverlayStateContext);

  if (!context) {
    throw new Error("useOverlayState 必须在 OverlayProvider 内使用。");
  }

  return context;
}

/** 读取稳定的全局弹层操作命令。 */
export function useOverlayActions() {
  const context = useContext(OverlayActionsContext);

  if (!context) {
    throw new Error("useOverlayActions 必须在 OverlayProvider 内使用。");
  }

  return context;
}

/** 为全局弹窗和侧拉层提供分层状态及稳定操作命令。 */
export function OverlayProvider({ children }: OverlayProviderProps) {
  const [state, dispatch] = useReducer(overlayReducer, initialOverlayState);
  const closeAllOverlays = useCallback(() => dispatch({ type: "closeAll" }), []);
  const closeOverlay = useCallback((overlayType: GlobalOverlayType) => dispatch({ overlayType, type: "close" }), []);
  const closeOverlays = useCallback(
    (overlayTypes: GlobalOverlayType[]) => dispatch({ overlayTypes, type: "closeMany" }),
    []
  );
  const openOverlay = useCallback((entry: GlobalOverlayEntry) => dispatch({ entry, type: "open" }), []);
  const actions = useMemo(
    () => ({ closeAllOverlays, closeOverlay, closeOverlays, openOverlay }),
    [closeAllOverlays, closeOverlay, closeOverlays, openOverlay]
  );

  return (
    <OverlayActionsContext.Provider value={actions}>
      <OverlayStateContext.Provider value={state}>{children}</OverlayStateContext.Provider>
    </OverlayActionsContext.Provider>
  );
}
