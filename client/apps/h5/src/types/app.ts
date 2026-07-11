export type PageSurface = "mine" | "wallet" | "orders" | "settings" | "tutorCertification" | "huntingCertification";
export type AuthMode = "login" | "register";
/** Login credential mode supported by the H5 login form. */
export type LoginCredentialMode = "code" | "password";
export type ProductFilter = "selfRun" | "stock" | "hourly" | "latest";
export type JobFilter = "latest" | "hourly";
export type TutorSort = "recommended" | "favorite" | "hired" | "duration";

export interface CheckoutState {
  product: import("@unknown/domain").ProductSummary;
  deliveryMode: import("@unknown/domain").DeliveryMode;
  paymentMethod: import("@unknown/domain").PaymentMethod;
}
