export {};

declare global {
  type FormEvent<T = Element> = import("react").FormEvent<T>;
  type ReactNode = import("react").ReactNode;
  type CSSProperties = import("react").CSSProperties;
  type LucideIcon = import("lucide-react").LucideIcon;

  type ClientOrder = import("@unknown/domain").ClientOrder;
  type ClientModuleKey = import("@unknown/domain").ClientModuleKey;
  type DeliveryMode = import("@unknown/domain").DeliveryMode;
  type HuntingSummary = import("@unknown/domain").HuntingSummary;
  type HuntingTask = import("@unknown/domain").HuntingTask;
  type LoginResponse = import("@unknown/domain").LoginResponse;
  type MerchantDashboard = import("@unknown/domain").MerchantDashboard;
  type MerchantProduct = import("@unknown/domain").MerchantProduct;
  type PartTimeJob = import("@unknown/domain").PartTimeJob;
  type PaymentMethod = import("@unknown/domain").PaymentMethod;
  type ProductSummary = import("@unknown/domain").ProductSummary;
  type Role = import("@unknown/domain").Role;
  type TutorDemand = import("@unknown/domain").TutorDemand;
  type WalletRecord = import("@unknown/domain").WalletRecord;
  type WalletSummary = import("@unknown/domain").WalletSummary;

  type PageSurface = import("./app").PageSurface;
  type AuthMode = import("./app").AuthMode;
  type ProductFilter = import("./app").ProductFilter;
  type JobFilter = import("./app").JobFilter;
  type TutorSort = import("./app").TutorSort;
  type CheckoutState = import("./app").CheckoutState;

  type LoginRegisterCardProps = import("./auth").LoginRegisterCardProps;

  type MessageToastType = import("./message-toast").MessageToastType;
  type MessageToastState = import("./message-toast").MessageToastState;
  type MessageToastOptions = import("./message-toast").MessageToastOptions;
  type MessageToastProps = import("./message-toast").MessageToastProps;

  type ProfileRequirementTemplate = import("./profile").ProfileRequirementTemplate;
  type ProfileRequirement = import("./profile").ProfileRequirement;
  type ProfileDraftState = import("./profile").ProfileDraftState;
  type RegistrationProfileCompletionProps = import("./profile").RegistrationProfileCompletionProps;
}
