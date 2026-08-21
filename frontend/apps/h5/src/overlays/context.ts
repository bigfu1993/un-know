/** 全局弹层状态 Context，仅由弹层 Host 和展示状态消费者订阅。 */
export const OverlayStateContext = createContext<OverlayState | null>(null);

/** 全局弹层命令 Context，value 在弹层状态变化时保持稳定。 */
export const OverlayActionsContext = createContext<OverlayActions | null>(null);

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
