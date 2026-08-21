import { CheckoutSheet } from "@components/WorkflowOverlays";
import { useCheckoutActions, useCheckoutState } from "./context";

/** 在根级 Overlay Host 中渲染购买确认弹层。 */
export function CheckoutHost() {
  const { checkout, purchasePending, role } = useCheckoutState();
  const { closeCheckout, setDeliveryMode, setPaymentMethod, submitCheckout } = useCheckoutActions();

  if (!checkout) {
    return null;
  }

  return (
    <CheckoutSheet
      checkout={checkout}
      onClose={closeCheckout}
      onDeliveryChange={setDeliveryMode}
      onPaymentChange={setPaymentMethod}
      onSubmit={submitCheckout}
      purchasePending={purchasePending}
      role={role}
    />
  );
}
