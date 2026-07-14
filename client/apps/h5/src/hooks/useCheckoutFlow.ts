import { getDefaultDeliveryMode, getProfileRequirement } from "@shared/clientPageModel";

/** 购买下单 mutation 回调参数。 */
interface PurchaseMutationCallbacks {
  onError: (error: unknown) => void;
  onSuccess: (order: { orderId: string; payableAmount: number; status: string }) => void;
}

/** 购买流程入参。 */
interface UseCheckoutFlowOptions {
  currentAddressDraft: ProfileDraftState;
  onOrderCreated: () => void;
  openProfileCompletion: () => void;
  purchaseProduct: (
    payload: {
      deliveryMode: DeliveryMode;
      paymentMethod: PaymentMethod;
      productId: string;
      quantity: number;
      role: Role;
    },
    callbacks: PurchaseMutationCallbacks
  ) => void;
  purchasePending: boolean;
  role: Role;
  showMessage: (content: string, options?: MessageToastOptions) => void;
}

/** 购买流程控制器，集中处理资料校验、配送支付选择和下单提交。 */
export function useCheckoutFlow({
  currentAddressDraft,
  onOrderCreated,
  openProfileCompletion,
  purchaseProduct,
  purchasePending,
  role,
  showMessage
}: UseCheckoutFlowOptions) {
  const [checkout, setCheckout] = useState<CheckoutState | null>(null);

  /** 打开购买确认弹窗；资料缺失时先引导补充资料。 */
  function openCheckout(product: ProductSummary) {
    const featuredRequirement = getProfileRequirement(role, "featured", currentAddressDraft);

    if (featuredRequirement) {
      showMessage(`请先补充${featuredRequirement.missingFields.map((field) => field.label).join("、")}`, {
        type: "warning"
      });
      openProfileCompletion();
      return;
    }

    setCheckout({
      product,
      deliveryMode: getDefaultDeliveryMode(role, product),
      paymentMethod: "wechat"
    });
  }

  /** 提交购买订单。 */
  function submitPurchase() {
    if (!checkout) {
      return;
    }

    purchaseProduct(
      {
        productId: checkout.product.id,
        role,
        deliveryMode: checkout.deliveryMode,
        paymentMethod: checkout.paymentMethod,
        quantity: 1
      },
      {
        onSuccess: (order) => {
          showMessage(`订单 ${order.orderId} 已创建，状态：${order.status}，应付 ${formatCurrency(order.payableAmount)}。`, {
            type: "success"
          });
          setCheckout(null);
          onOrderCreated();
        },
        onError: (error) => {
          showMessage(getErrorMessage(error, "购买失败，请稍后重试。"), { type: "error" });
        }
      }
    );
  }

  return {
    checkout,
    openCheckout,
    purchasePending,
    setCheckout,
    submitPurchase
  };
}
