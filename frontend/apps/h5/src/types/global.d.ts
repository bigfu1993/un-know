export {};

declare global {
  type FormEvent<T = Element> = import("react").FormEvent<T>;
  type ReactNode = import("react").ReactNode;
  type CSSProperties = import("react").CSSProperties;
  type LucideIcon = import("lucide-react").LucideIcon;
  type StoreApi<T> = import("zustand/vanilla").StoreApi<T>;

  type ClientOrder = import("@unknown/domain").ClientOrder;
  type ClientModuleKey = import("@unknown/domain").ClientModuleKey;
  type DeliveryMode = import("@unknown/domain").DeliveryMode;
  type HuntingSummary = import("@unknown/domain").HuntingSummary;
  type HuntingQuote = import("@unknown/domain").HuntingQuote;
  type HuntingCertificationStatus = import("@unknown/domain").HuntingCertificationStatus;
  type HuntingTask = import("@unknown/domain").HuntingTask;
  type HuntingTaskFulfillmentActionRequest = import("@unknown/domain").HuntingTaskFulfillmentActionRequest;
  type PublishHuntingTaskRequest = import("@unknown/domain").PublishHuntingTaskRequest;
  type PublishTutorDemandRequest = import("@unknown/domain").PublishTutorDemandRequest;
  type LoginResponse = import("@unknown/domain").LoginResponse;
  type MerchantDashboard = import("@unknown/domain").MerchantDashboard;
  type MerchantProduct = import("@unknown/domain").MerchantProduct;
  type PartTimeJob = import("@unknown/domain").PartTimeJob;
  type PasswordResetVerifyMode = import("@unknown/domain").PasswordResetVerifyMode;
  type PaymentMethod = import("@unknown/domain").PaymentMethod;
  type ProductSummary = import("@unknown/domain").ProductSummary;
  type Role = import("@unknown/domain").Role;
  type TutorDemand = import("@unknown/domain").TutorDemand;
  type TutorApplicant = import("@unknown/domain").TutorApplicant;
  type TutorExposureResponse = import("@unknown/domain").TutorExposureResponse;
  type ChatConversation = import("@unknown/domain").ChatConversation;
  type ChatMessage = import("@unknown/domain").ChatMessage;
  type ChatQuickAction = import("@unknown/domain").ChatQuickAction;
  type WalletRecord = import("@unknown/domain").WalletRecord;
  type WalletSummary = import("@unknown/domain").WalletSummary;

  type PageSurface = import("@app-types/app").PageSurface;
  type AuthMode = import("@app-types/app").AuthMode;
  type LoginCredentialMode = import("@app-types/app").LoginCredentialMode;
  type ProductFilter = import("@app-types/app").ProductFilter;
  type JobFilter = import("@app-types/app").JobFilter;
  type TutorSort = import("@app-types/app").TutorSort;
  type CheckoutState = import("@app-types/app").CheckoutState;
  type ClientAddress = import("@unknown/domain").ClientAddress;
  type ClientAddressRequest = import("@unknown/domain").ClientAddressRequest;

  type H5RuntimeGlobals = import("@app-types/auth").H5RuntimeGlobals;
  type ApiEnvelope<T> = import("@app-types/auth").ApiEnvelope<T>;
  type LoginProps = import("@app-types/auth").LoginProps;
  type PasswordResetResult = import("@app-types/auth").PasswordResetResult;
  type LoginFormProps = import("@app-types/auth").LoginFormProps;
  type RegisterFormProps = import("@app-types/auth").RegisterFormProps;
  type PasswordResetCardProps = import("@app-types/auth").PasswordResetCardProps;
  type RegistrationGuideProps = import("@app-types/auth").RegistrationGuideProps;
  type LoginRegisterCardProps = import("@app-types/auth").LoginRegisterCardProps;

  type MessageToastType = import("@app-types/message-toast").MessageToastType;
  type MessageToastState = import("@app-types/message-toast").MessageToastState;
  type MessageToastOptions = import("@app-types/message-toast").MessageToastOptions;

  type ProfileRequirementField = import("@app-types/profile").ProfileRequirementField;
  type ProfileRequirementTemplate = import("@app-types/profile").ProfileRequirementTemplate;
  type ProfileRequirement = import("@app-types/profile").ProfileRequirement;
  type ProfileDraftState = import("@app-types/profile").ProfileDraftState;
  type AddressBookItem = import("@app-types/profile").AddressBookItem;
  type AddressInfoFormProps = import("@app-types/profile").AddressInfoFormProps;

  type HuntingAreaInputMode = import("@app-types/hunting-project").HuntingAreaInputMode;
  type HuntingProjectStop = import("@app-types/hunting-project").HuntingProjectStop;
  type HuntingProjectDraft = import("@app-types/hunting-project").HuntingProjectDraft;
  type HuntingProject = import("@app-types/hunting-project").HuntingProject;
  type HuntingProjectProps = import("@app-types/hunting-project").HuntingProjectProps;

  type PublishInfoType = import("@tools/publishInfo").PublishInfoType;
  type DelegationAmountMode = import("@tools/publishInfo").DelegationAmountMode;
  type PublishInfoDraft = import("@tools/publishInfo").PublishInfoDraft;
  type LocalPublishInfoDraft = import("@tools/publishInfo").LocalPublishInfoDraft;

  type ChildProfileOption = import("@app-types/tutor-workflow").ChildProfileOption;
  type TutorTrialJob = import("@app-types/tutor-workflow").TutorTrialJob;
  type TutorApplicationCandidate = import("@app-types/tutor-workflow").TutorApplicationCandidate;
  type TutorCalendarTask = import("@components/TutorCalendar").TutorCalendarTask;
  type TutorCardData = import("@components/TutorCard/model").TutorCardData;
  type TutorCardMode = import("@components/TutorCard/model").TutorCardMode;
  type TutorCertificationStatus = import("@unknown/domain").TutorCertificationStatus;
  type TutorCertificationInfoSaveMode = import("@components/TutorCertificationInfo").TutorCertificationInfoSaveMode;
}
