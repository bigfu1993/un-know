import { OverlayActionsContext, OverlayStateContext } from "./context";
import { initialOverlayState, overlayReducer } from "./reducer";

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
