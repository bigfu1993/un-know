import { getDefaultDeliveryMode, getProfileRequirement } from "@shared/clientPageModel";
import { showMessage } from "@tools/messageToast";
import { useOverlayActions, useOverlayState } from "../provider";

/** 购买确认弹层展示状态 Context，保持文件私有。 */
const CheckoutStateContext = createContext<CheckoutOverlayState | null>(null);

/** 购买确认弹层内部编辑和提交命令 Context，保持文件私有。 */
const CheckoutActionsContext = createContext<CheckoutOverlayActions | null>(null);

/** 商品入口使用的轻量购买触发 Context，保持文件私有。 */
const CheckoutTriggerContext = createContext<CheckoutTriggerContextValue | null>(null);

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

/** 管理购买确认弹层的资料校验、编辑草稿和真实下单操作。 */
export function CheckoutProvider({
  children,
  currentAddressDraft,
  onOpenProfileCompletion,
  onOrderCreated,
  role
}: CheckoutProviderProps) {
  const { closeOverlay, openOverlay } = useOverlayActions();
  const overlayState = useOverlayState();
  const [checkoutDraft, setCheckoutDraft] = useState<CheckoutState | null>(null);
  const { isPending: purchasePending, mutate: purchaseProduct } = usePurchaseProduct();
  const isCheckoutOpen = overlayState.secondary?.type === "checkout";
  const checkout = isCheckoutOpen ? checkoutDraft : null;

  /** 关闭购买确认弹层并清除尚未提交的选择。 */
  const closeCheckout = useCallback(() => {
    closeOverlay("checkout");
    setCheckoutDraft(null);
  }, [closeOverlay]);

  /** 打开购买确认弹层；资料不完整时切换到资料完善流程。 */
  const openCheckout = useCallback(
    (product: ProductSummary) => {
      const featuredRequirement = getProfileRequirement(role, "featured", currentAddressDraft);

      if (featuredRequirement) {
        showMessage(`请先补充${featuredRequirement.missingFields.map((field) => field.label).join("、")}`, {
          type: "warning"
        });
        onOpenProfileCompletion();
        return;
      }

      setCheckoutDraft({
        deliveryMode: getDefaultDeliveryMode(role, product),
        paymentMethod: "wechat",
        product
      });
      openOverlay({ lane: "secondary", targetId: product.id, type: "checkout" });
    },
    [currentAddressDraft, onOpenProfileCompletion, openOverlay, role]
  );

  /** 更新购买确认弹层的配送方式。 */
  const setDeliveryMode = useCallback((deliveryMode: DeliveryMode) => {
    setCheckoutDraft((value) => (value ? { ...value, deliveryMode } : value));
  }, []);

  /** 更新购买确认弹层的支付方式。 */
  const setPaymentMethod = useCallback((paymentMethod: PaymentMethod) => {
    setCheckoutDraft((value) => (value ? { ...value, paymentMethod } : value));
  }, []);

  /** 将当前购买草稿提交到真实下单接口。 */
  const submitCheckout = useCallback(() => {
    if (!checkout) {
      return;
    }

    purchaseProduct(
      {
        deliveryMode: checkout.deliveryMode,
        paymentMethod: checkout.paymentMethod,
        productId: checkout.product.id,
        quantity: 1
      },
      {
        onError: (error) => {
          showMessage(getErrorMessage(error, "购买失败，请稍后重试。"), { type: "error" });
        },
        onSuccess: (order) => {
          showMessage(
            `订单 ${order.orderId} 已创建，状态：${order.status}，应付 ${formatCurrency(order.payableAmount)}。`,
            {
              type: "success"
            }
          );
          closeCheckout();
          onOrderCreated();
        }
      }
    );
  }, [checkout, closeCheckout, onOrderCreated, purchaseProduct]);

  useEffect(() => {
    if (!isCheckoutOpen && checkoutDraft) {
      setCheckoutDraft(null);
    }
  }, [checkoutDraft, isCheckoutOpen]);

  const state = useMemo(() => ({ checkout, purchasePending, role }), [checkout, purchasePending, role]);
  const actions = useMemo(
    () => ({ closeCheckout, setDeliveryMode, setPaymentMethod, submitCheckout }),
    [closeCheckout, setDeliveryMode, setPaymentMethod, submitCheckout]
  );
  const trigger = useMemo(() => ({ openCheckout, purchasePending }), [openCheckout, purchasePending]);

  return (
    <CheckoutTriggerContext.Provider value={trigger}>
      <CheckoutActionsContext.Provider value={actions}>
        <CheckoutStateContext.Provider value={state}>{children}</CheckoutStateContext.Provider>
      </CheckoutActionsContext.Provider>
    </CheckoutTriggerContext.Provider>
  );
}
