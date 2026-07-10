export type PageSurface = "mine" | "wallet" | "orders" | "settings";
export type AuthMode = "login" | "register";
export type ProductFilter = "selfRun" | "stock" | "hourly" | "latest";
export type JobFilter = "latest" | "hourly";
export type TutorSort = "recommended" | "favorite" | "hired" | "duration";

export interface CheckoutState {
  product: import("@unknown/domain").ProductSummary;
  deliveryMode: import("@unknown/domain").DeliveryMode;
  paymentMethod: import("@unknown/domain").PaymentMethod;
}
