import { getDefaultDeliveryMode, getProfileRequirement } from "@shared/clientPageModel";
import { showMessage } from "@tools/messageToast";
import { useOverlayActions, useOverlayState } from "../context";
import { CheckoutActionsContext, CheckoutStateContext, CheckoutTriggerContext } from "./context";

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
