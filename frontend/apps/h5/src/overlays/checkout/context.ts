/** 购买确认弹层展示状态 Context。 */
export const CheckoutStateContext = createContext<CheckoutOverlayState | null>(null);

/** 购买确认弹层内部编辑和提交命令 Context。 */
export const CheckoutActionsContext = createContext<CheckoutOverlayActions | null>(null);

/** 商品入口使用的轻量购买触发 Context。 */
export const CheckoutTriggerContext = createContext<CheckoutTriggerContextValue | null>(null);

/** 读取商品入口需要的购买打开命令和提交占用状态。 */
export function useCheckoutTrigger() {
  const context = useContext(CheckoutTriggerContext);

  if (!context) {
    throw new Error("useCheckoutTrigger 必须在 CheckoutProvider 内使用。");
  }

  return context;
}

/** 读取购买确认弹层状态。 */
export function useCheckoutState() {
  const context = useContext(CheckoutStateContext);

  if (!context) {
    throw new Error("useCheckoutState 必须在 CheckoutProvider 内使用。");
  }

  return context;
}

/** 读取购买确认弹层操作命令。 */
export function useCheckoutActions() {
  const context = useContext(CheckoutActionsContext);

  if (!context) {
    throw new Error("useCheckoutActions 必须在 CheckoutProvider 内使用。");
  }

  return context;
}
