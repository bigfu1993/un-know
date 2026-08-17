export type Role = "student" | "merchant" | "parent";

export type AccountStatus = "normal" | "frozen" | "supervised" | "muted" | "banned";

export type CertificationStatus = "pending" | "reviewing" | "normal" | "frozen";

/** 家教资格认证状态，与服务端 app_user.tutor_certification_status 保持一致。 */
export type TutorCertificationStatus = CertificationStatus;

/** 狩猎资格认证状态，与服务端 app_user.hunting_certification_status 保持一致。 */
export type HuntingCertificationStatus = CertificationStatus;

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
  nickname: string;
  label: string;
  creditScore: number;
  balanceText: string;
  accountStatus: AccountStatus;
  tutorCertificationStatus: TutorCertificationStatus;
  huntingCertificationStatus: HuntingCertificationStatus;
  tutorExposureEnabled: boolean;
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
  role?: Role;
  nickname?: string;
}

export interface SelectRoleRequest {
  role: Role;
}

export interface MiniappOneTapLoginRequest {
  phoneCode: string;
  role?: Role;
}

/** 客户端重置登录密码时使用的服务端校验方式。 */
export type PasswordResetVerifyMode = "code" | "password";

/** 客户端重置登录密码请求，旧密码模式必须由服务端校验旧密码是否正确。 */
export interface ResetClientPasswordRequest {
  phone: string;
  verifyMode: PasswordResetVerifyMode;
  code?: string;
  oldPassword?: string;
  password: string;
  passwordConfirm: string;
}

/** 客户端重置登录密码结果。 */
export interface ResetClientPasswordResponse {
  success: boolean;
}

export interface SubmitHuntingCertificationRequest {
  realName: string;
  gender: string;
  age: string;
  nativePlace: string;
  idCard: string;
  school: string;
  major: string;
}

export interface SubmitHuntingCertificationResponse {
  huntingCertificationStatus: HuntingCertificationStatus;
}

/** 客户端地址簿条目，服务端字段与 H5 地址表单保持一一对应。 */
export interface ClientAddress {
  id: string;
  contactName: string;
  campusArea: string;
  buildingFloor: string;
  deliveryAddress: string;
  contactPhone: string;
  isCurrent: boolean;
  createdAt: string;
  updatedAt: string;
}

/** 客户端地址新增和编辑请求，isCurrent 用于主动切换当前使用地址。 */
export interface ClientAddressRequest {
  contactName: string;
  campusArea: string;
  buildingFloor: string;
  deliveryAddress: string;
  contactPhone: string;
  isCurrent?: boolean;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  role: Role;
  accountStatus: AccountStatus;
  phone: string;
  nickname: string;
  profileCompletionRequired: boolean;
}

/** 用户名称展示快照；展示名称唯一读取 nickname。 */
export interface UserNickname {
  nickname: string;
  phone?: string;
}

/** 修改当前用户昵称请求，服务端写入 app_user.nickname。 */
export interface UpdateNicknameRequest {
  nickname: string;
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
  /** 家教主卡专用：当前活跃申请的状态 KEY，非家教品类或无活跃申请时为空。 */
  activeApplicantStatus?: string;
  amount: number;
  amountLabel?: string;
  category?: "delegation" | "featured" | "hunting" | "partTime" | "tutor";
  contact: string;
  detail: string;
  phoneNumber?: string;
  /** 家教卡片专用：学科，非家教品类为空。 */
  subject?: string;
  /** 家教卡片专用：家教地址，非家教品类为空。 */
  address?: string;
  /** 家教卡片专用：计划周期实际选中的完整日期集合，允许不连续的零散日期；非家教品类为空。 */
  periodDates?: string[];
  quoteAmount?: number;
  quoteCount?: number;
  trialCount?: number;
  quoteActionLabel?: string;
  quoteId?: string;
  canCall?: boolean;
  canMessage?: boolean;
  canRequestCancel?: boolean;
  canRequestComplete?: boolean;
  canConfirmCancel?: boolean;
  canConfirmComplete?: boolean;
  canRepublish?: boolean;
  canAgreeTrial?: boolean;
  canOpenTrialResult?: boolean;
  canOpenTrialSchedule?: boolean;
  canOpenTutorTrialList?: boolean;
  canOpenTutorApplications?: boolean;
  canRejectTrial?: boolean;
  canCancelTutorApplication?: boolean;
  risk?: "payment" | "refund";
}

export interface PartTimeJob {
  id: string;
  publisher: UserNickname;
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
  amountNegotiable?: boolean;
  description?: string;
  destination?: string;
  depositAmount?: number;
  depositRequired?: boolean;
  id: string;
  title: string;
  mode: string;
  fee: number;
  isAcceptedByMe?: boolean;
  isMine?: boolean;
  isQuotedByMe?: boolean;
  latestTime: string;
  location: string;
  pendingAmount?: number;
  pendingQuoteId?: string;
  pendingQuoteStatus?: string;
  acceptedUser?: UserNickname | null;
  fulfillmentAction?: string | null;
  fulfillmentActionByMe?: boolean;
  publisher: UserNickname;
  publishTime?: string;
  quoteCount?: number;
  quotes?: HuntingQuote[];
  requirement?: string;
  requirementTags?: string[];
  urgency: string;
  status: string;
}

export interface HuntingQuote {
  id: string;
  bidder: UserNickname;
  amount: number;
  originalAmount?: number;
  quoteTime: string;
  status: string;
  isSelected?: boolean;
}

/** 委托发布请求，提交后由服务端写入 hunting_task。 */
export interface PublishHuntingTaskRequest {
  amount: number | null;
  amountNegotiable?: boolean;
  depositAmount?: number | null;
  depositRequired?: boolean;
  description?: string;
  latestTime: string;
  destination?: string;
  location: string;
  requirement: string;
  requirementTags?: string[];
  title: string;
  type: "delegation" | "recycle";
}

export interface QuoteHuntingTaskRequest {
  amount: number;
}

export interface HuntingQuoteDecisionRequest {
  action: "confirm" | "reject" | "counter";
  amount?: number;
}

export interface HuntingTaskFulfillmentActionRequest {
  action: "confirm_cancel" | "confirm_complete" | "republish" | "request_cancel" | "request_complete";
}

export interface TutorApplicant {
  id: string;
  nickname: string;
  school: string;
  major: string;
  gpa: string;
  hiredTimes: number;
  availability: string;
  serviceConfirmationCancelledBy?: string;
  status: string;
  trialFee?: number;
  serviceSchedule?: string;
  trialSchedule: string;
}

export interface TutorDemand {
  id: string;
  child: string;
  subject: string;
  school: string;
  budget: string;
  status: string;
  title?: string;
  description?: string;
  addressLabel?: string;
  availableDuration?: number;
  favoriteCount?: number;
  goodReviewCount?: number;
  period?: string;
  /** 计划周期实际选中的完整日期集合，允许不连续的零散日期；period 只是这个集合的开始至结束摘要文案。 */
  periodDates?: string[];
  publisher?: UserNickname;
  recommendationScore?: number;
  sourceType?: "tutorDemand" | "tutorStudent";
  applicants: TutorApplicant[];
}

/** 家长发布家教需求请求。 */
export interface PublishTutorDemandRequest {
  title: string;
  description?: string;
  subject: string;
  addressId: string;
  addressLabel: string;
  childId?: string;
  childName?: string;
  periodStart: string;
  periodEnd: string;
  /** 计划周期实际选中的完整日期集合，允许不连续的零散日期；periodStart/periodEnd 是这个集合里的最早/最晚日期，仅作连续区间摘要。 */
  periodDates?: string[];
  trialEnabled?: boolean;
  trialDuration?: string;
  wageAmount?: number | null;
  wageMode?: string;
  schoolTags?: string[];
  requirement?: string;
}

/** 学生申请家教试课请求。 */
export interface ApplyTutorTrialRequest {
  /** 可试课时间，学生端直接提交申请时不再收集，留空由双方后续另行协商。 */
  availability?: string;
  message?: string;
}

/** 家长确认家教试课安排请求。 */
export interface ConfirmTutorTrialRequest {
  trialStart: string;
  trialEnd: string;
  trialHalfDay: string;
}

/** 家长确认结束试课时的试课结算请求，正式雇佣决策可后续单独选择。 */
export interface CompleteTutorTrialEndRequest {
  hireTutor?: boolean;
  trialFee: number;
  tutorSchedule?: string;
}

/** 家教流程动作，与流程图节点保持一致。 */
export type TutorWorkflowAction =
  | "accept_service_offer"
  | "cancel_trial"
  | "close_trial_end_demand"
  | "close_trial_continue_recruiting"
  | "cancel_service_confirmation"
  | "confirm_service_schedule"
  | "confirm_settlement"
  | "confirm_trial_end"
  | "offer_service"
  | "reject_service_offer"
  | "reject_service_offer_salary"
  | "reject_trial"
  | "request_service_end"
  | "request_service_schedule_change"
  | "request_settlement_revision"
  | "remove_rejected_service_offer"
  | "request_trial_result"
  | "request_trial_settlement"
  | "resubmit_settlement"
  | "submit_service_schedule"
  | "update_trial_availability";

/** 家教流程动作请求，支持后续按节点补充日程、可用时间和原因。 */
export interface TutorWorkflowActionRequest {
  action: TutorWorkflowAction;
  availability?: string;
  continueRecruiting?: boolean;
  hireTutor?: boolean;
  reasonType?: string;
  trialFee?: number;
  tutorSchedule?: string;
}

/** 家教公开开关响应。 */
export interface TutorExposureResponse {
  enabled: boolean;
}

/** 狩猎项目下一站。 */
export interface HuntingProjectStopPayload {
  inputMode: "select" | "custom" | string;
  area: string;
  customArea: string;
  etaStart: string;
  etaEnd: string;
}

/** 创建狩猎项目请求。 */
export interface CreateHuntingProjectRequest {
  currentArea: string;
  nextStops: HuntingProjectStopPayload[];
}

/** 狩猎项目响应。 */
export interface HuntingProjectResponse {
  id: string;
  currentArea: string;
  status: string;
  matchedCount: number;
  nextStops: HuntingProjectStopPayload[];
}

/** 聊天会话摘要。 */
export interface ChatConversation {
  id: string;
  peer: UserNickname;
  title: string;
  relatedBizType?: string;
  relatedBizId?: string;
  lastMessage: string;
  updatedAt: string;
  unreadCount: number;
}

/** 聊天消息，支持文本、进行中卡片和订单卡片。 */
export interface ChatMessage {
  id: string;
  conversationId: string;
  mine: boolean;
  sender: UserNickname;
  messageType: "text" | "order" | "ongoing" | string;
  content: string;
  relatedCardType?: string;
  relatedCardId?: string;
  createdAt: string;
}

/** 聊天快捷按钮。 */
export interface ChatQuickAction {
  id: string;
  label: string;
  content: string;
  sortOrder: number;
}

/** 创建或复用聊天会话请求。 */
export interface CreateChatConversationRequest {
  peerUserId: string;
  title?: string;
  relatedBizType?: string;
  relatedBizId?: string;
}

/** 发送聊天消息请求。 */
export interface SendChatMessageRequest {
  content: string;
  messageType?: "text" | "order" | "ongoing" | string;
  relatedCardType?: string;
  relatedCardId?: string;
}

/** 新增聊天快捷按钮请求。 */
export interface ChatQuickActionRequest {
  label: string;
  content: string;
  sortOrder?: number;
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
    { key: "featured", label: "优选", description: "快递配送购买" },
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
