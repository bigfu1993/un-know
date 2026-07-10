export type Role = "student" | "merchant" | "parent";

export type AccountStatus = "normal" | "frozen" | "supervised" | "muted" | "banned";

export type ClientModuleKey =
  | "featured"
  | "partTime"
  | "hunting"
  | "tutor"
  | "orders"
  | "wallet"
  | "settings"
  | "merchantSales"
  | "marketing";

export type DeliveryMode = "express" | "immediate" | "scheduled";

export type PaymentMethod = "wechat" | "alipay" | "balance";

export type ClientPublishPlatform = "miniapp" | "nativeApp" | "h5";

export interface ModuleCard {
  key: ClientModuleKey;
  title: string;
  description: string;
  action: string;
  priority: "high" | "normal" | "low";
}

export interface ClientPrimaryTab {
  key: ClientModuleKey;
  label: string;
  description: string;
}

export interface RoleProfile {
  role: Role;
  name: string;
  label: string;
  creditScore: number;
  balanceText: string;
  accountStatus: AccountStatus;
}

export interface ClientHomePayload {
  profile: RoleProfile;
  modules: ModuleCard[];
  alerts: string[];
}

export interface LoginRequest {
  phone: string;
  code: string;
}

export interface RegisterRequest {
  phone: string;
  code: string;
  role: Role;
  displayName?: string;
}

export interface MiniappOneTapLoginRequest {
  phoneCode: string;
  role?: Role;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  role: Role;
  accountStatus: AccountStatus;
  phone: string;
  displayName: string;
  profileCompletionRequired: boolean;
}

export interface ProductSummary {
  id: string;
  title: string;
  category: string;
  source: string;
  model: string;
  description: string;
  price: number;
  retailPrice: number;
  serviceFee: number;
  stock: number;
  location: string;
  urgency: string;
  deliveryModes: DeliveryMode[];
}

export interface PurchaseRequest {
  productId: string;
  role: Role;
  deliveryMode: DeliveryMode;
  paymentMethod: PaymentMethod;
  quantity: number;
}

export interface PurchaseResponse {
  orderId: string;
  productId: string;
  status: string;
  quantity: number;
  productAmount: number;
  serviceFee: number;
  deliveryFee: number;
  payableAmount: number;
  deliveryMode: DeliveryMode;
  paymentMethod: PaymentMethod;
  contactPhone: string;
  message: string;
}

export interface ClientOrder {
  id: string;
  role: Role;
  title: string;
  status: string;
  amount: number;
  contact: string;
  detail: string;
  risk?: "payment" | "refund";
}

export interface PartTimeJob {
  id: string;
  publisher: string;
  title: string;
  description: string;
  hourlyPay: number;
  period: string;
  location: string;
  status: string;
  requirement: string;
  formFields: string[];
  fundingState: string;
  signRule: string;
}

export interface HuntingSummary {
  studentCertification: string;
  secondVerification: string;
  depositText: string;
  creditText: string;
  onlineStatus: string;
}

export interface HuntingTask {
  id: string;
  title: string;
  mode: string;
  fee: number;
  latestTime: string;
  location: string;
  urgency: string;
  status: string;
}

export interface TutorApplicant {
  id: string;
  name: string;
  school: string;
  major: string;
  gpa: string;
  hiredTimes: number;
  availability: string;
  status: string;
}

export interface TutorDemand {
  id: string;
  child: string;
  subject: string;
  school: string;
  budget: string;
  status: string;
  applicants: TutorApplicant[];
}

export interface MerchantDashboard {
  salesCount: number;
  salesAmount: number;
  pendingDelivery: number;
  delivering: number;
  afterSaleMessages: number;
  chatMessages: number;
  views: number;
  favorites: number;
  orders: number;
  deals: number;
  afterSaleRate: string;
  partTimeConversion: string;
  depositStatus: string;
}

export interface MerchantProduct {
  id: string;
  name: string;
  code: string;
  model: string;
  category: string;
  price: number;
  stock: number;
  purchaseLimit: number;
  status: string;
  visible: string;
}

export interface WalletSummary {
  withdrawable: string;
  observation: string;
  deposit: string;
  withdrawMethods: string;
}

export interface WalletRecord {
  id: string;
  type: string;
  title: string;
  amount: string;
  status: string;
}

export interface ClientWorkspacePayload {
  orders: ClientOrder[];
  partTimeJobs: PartTimeJob[];
  huntingSummary: HuntingSummary;
  huntingTasks: HuntingTask[];
  tutorDemands: TutorDemand[];
  merchantDashboard: MerchantDashboard;
  merchantProducts: MerchantProduct[];
  walletSummary: WalletSummary;
  walletRecords: WalletRecord[];
}

export const roleLabels: Record<Role, string> = {
  student: "学生",
  merchant: "商户",
  parent: "家长"
};

export const accountStatusLabels: Record<AccountStatus, string> = {
  normal: "正常",
  frozen: "冻结",
  supervised: "监管中",
  muted: "禁言",
  banned: "封禁"
};

export const deliveryModeLabels: Record<DeliveryMode, string> = {
  express: "快递配送",
  immediate: "立刻配送",
  scheduled: "指定时间"
};

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  wechat: "微信",
  alipay: "支付宝",
  balance: "余额"
};

export const clientPublishPlatformLabels: Record<ClientPublishPlatform, string> = {
  miniapp: "微信小程序",
  nativeApp: "原生 App",
  h5: "H5"
};

export const clientPrimaryTabs: Record<Role, ClientPrimaryTab[]> = {
  student: [
    { key: "featured", label: "优选", description: "商品、服务、回收" },
    { key: "partTime", label: "兼职", description: "兼职列表和报名" },
    { key: "hunting", label: "委托/狩猎", description: "发布委托和接单" }
  ],
  merchant: [
    { key: "merchantSales", label: "商品", description: "销售和配送" },
    { key: "partTime", label: "兼职", description: "发布和招募" },
    { key: "marketing", label: "营销", description: "活动能力预留" }
  ],
  parent: [
    { key: "featured", label: "商品", description: "快递配送购买" },
    { key: "tutor", label: "家教", description: "家教招募" }
  ]
};

export const mineEntryLabels: Record<Role, string> = {
  student: "学生我的",
  merchant: "商户我的",
  parent: "家长我的"
};

export function getDefaultPrimaryTab(role: Role): ClientModuleKey {
  return clientPrimaryTabs[role][0].key;
}
