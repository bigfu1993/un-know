/** H5 页面共享模型，仅放纯配置、本地存储适配器和无副作用工具函数。 */
export const roles: Role[] = ["student", "merchant", "parent"];
export const profileDraftStorageKey = "unknown_client_profile_completion_v1";
/** H5 本地地址簿存储 key，后端地址接口上线前用于保存设置页地址卡。 */
export const addressBookStorageKey = "unknown_client_address_book_v1";
/** H5 本地密码凭据存储 key，仅保存带盐哈希，不保存明文密码。 */
export const passwordCredentialStorageKey = "unknown_client_password_credentials_v1";
/** H5 本地待完成注册存储 key，避免注册账号绕过角色选择。 */
export const pendingRegistrationStorageKey = "unknown_client_pending_registration_v1";

/** 后端密码接口上线前使用的本地带盐密码凭据。 */
export interface StoredPasswordCredential {
  salt: string;
  passwordHash: string;
  updatedAt: string;
}

/** 按手机号索引的本地密码凭据集合。 */
export type PasswordCredentialStore = Record<string, StoredPasswordCredential>;

/** 按表单原始手机号记录的本地待完成注册标记。 */
export interface PendingRegistrationRecord {
  phone: string;
  createdAt: string;
}

/** 按原始手机号索引的待完成注册标记集合。 */
export type PendingRegistrationStore = Record<string, PendingRegistrationRecord>;

export const campusAreaOptions = [
  "宿舍区",
  "教学区",
  "图书馆",
  "食堂",
  "校门口",
  "操场",
  "快递站",
  "商业街",
  "家属区",
  "校外周边"
];
export const productFilters: Array<{ key: ProductFilter; label: string }> = [
  { key: "selfRun", label: "自营" },
  { key: "stock", label: "现货" },
  { key: "hourly", label: "小时达" },
  { key: "latest", label: "最新发布" }
];
export const jobFilters: Array<{ key: JobFilter; label: string }> = [
  { key: "latest", label: "最新发布" },
  { key: "hourly", label: "时薪优先" }
];
export const tutorSorts: Array<{ key: TutorSort; label: string }> = [
  { key: "recommended", label: "系统推荐" },
  { key: "favorite", label: "收藏优先" },
  { key: "hired", label: "受聘次数" },
  { key: "duration", label: "可兼职时长" }
];

// 底部导航路由和默认重定向的唯一来源。
export const moduleRoutePaths: Partial<Record<ClientModuleKey, string>> = {
  featured: "/featured",
  partTime: "/part-time",
  hunting: "/delegation",
  merchantSales: "/merchant-sales",
  marketing: "/marketing",
  tutor: "/tutor"
};

/** 注册资料、场景资料补充和设置页预览共用的地址字段。 */
export const addressInfoFields: ProfileRequirementField[] = [
  { key: "contactName", label: "姓名", placeholder: "请输入姓名" },
  { key: "campusArea", label: "常用区域", placeholder: "选择或输入常用区域", kind: "area" },
  { key: "buildingFloor", label: "楼栋楼层", placeholder: "例如 8 号楼 5 层 / 8-512" },
  { key: "deliveryAddress", label: "收货地址", placeholder: "请输入详细收货地址" },
  { key: "contactPhone", label: "联系电话", placeholder: "请输入手机号", inputMode: "tel" }
];

/** H5 要求用户补充账户资料时共用的地址信息模板。 */
export const addressInfoTemplate: ProfileRequirementTemplate = {
  title: "补充地址信息",
  description: "请补充姓名、常用区域、楼栋楼层、收货地址和联系电话。",
  fields: addressInfoFields
};

// App、登录注册和资料补充流程共用的场景级资料要求。
export const profileRequirementTemplates: Record<Role, Partial<Record<ClientModuleKey, ProfileRequirementTemplate>>> = {
  student: {
    featured: addressInfoTemplate,
    partTime: addressInfoTemplate,
    hunting: addressInfoTemplate,
    tutor: addressInfoTemplate
  },
  merchant: {
    merchantSales: addressInfoTemplate,
    partTime: addressInfoTemplate,
    marketing: addressInfoTemplate
  },
  parent: {
    featured: addressInfoTemplate,
    tutor: addressInfoTemplate
  }
};

// 注册资料模板允许暂时跳过，后续业务场景会再次校验必填资料。
export const registrationProfileTemplates: Record<Role, ProfileRequirementTemplate> = {
  student: addressInfoTemplate,
  merchant: addressInfoTemplate,
  parent: addressInfoTemplate
};

// 仅用于 UI 展示的模块 key 与导航图标映射。
export const tabIcons: Record<ClientModuleKey, LucideIcon> = {
  featured: ShoppingBag,
  partTime: BriefcaseBusiness,
  hunting: Crosshair,
  tutor: GraduationCap,
  orders: PackageCheck,
  wallet: WalletCards,
  settings: Settings,
  merchantSales: Store,
  marketing: Megaphone
};

// 本地草稿用于改善续填体验，认证状态仍以后端数据为准。
export function getStoredProfileDraft(): ProfileDraftState {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const stored = window.localStorage.getItem(profileDraftStorageKey);
    return stored ? (JSON.parse(stored) as ProfileDraftState) : {};
  } catch {
    return {};
  }
}

export function setStoredProfileDraft(profileDraft: ProfileDraftState) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(profileDraftStorageKey, JSON.stringify(profileDraft));
}

/** 根据地址草稿创建本地地址簿条目。 */
export function createAddressBookItem(profileDraft: ProfileDraftState, isCurrent = false): AddressBookItem {
  const now = new Date().toISOString();

  return {
    id: globalThis.crypto?.randomUUID?.() ?? `address_${Date.now()}`,
    draft: getFilledProfileDraft(profileDraft),
    isCurrent,
    createdAt: now,
    updatedAt: now
  };
}

/** 规范化地址簿，保证最多一个当前地址并补齐稳定时间字段。 */
export function normalizeAddressBookItems(items: AddressBookItem[]) {
  const currentIndex = items.findIndex((item) => item.isCurrent);
  const normalizedCurrentIndex = currentIndex >= 0 ? currentIndex : 0;

  return items.map((item, index) => {
    return {
      ...item,
      isCurrent: index === normalizedCurrentIndex,
      draft: getFilledProfileDraft(item.draft),
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: item.updatedAt || item.createdAt || new Date().toISOString()
    };
  });
}

/** 读取 H5 本地地址簿；没有地址簿时回退到当前资料草稿。 */
export function getStoredAddressBook(fallbackDraft: ProfileDraftState = {}) {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const stored = window.localStorage.getItem(addressBookStorageKey);
    const parsedItems = stored ? (JSON.parse(stored) as AddressBookItem[]) : [];

    if (parsedItems.length > 0) {
      return normalizeAddressBookItems(parsedItems);
    }
  } catch {
    // 读取失败时继续回退到当前资料草稿。
  }

  const hasFallbackAddress = addressInfoFields.some((field) => fallbackDraft[field.key]?.trim());
  return hasFallbackAddress ? [createAddressBookItem(fallbackDraft, true)] : [];
}

/** 规范化当前地址状态后持久化 H5 本地地址簿。 */
export function setStoredAddressBook(items: AddressBookItem[]) {
  if (typeof window === "undefined") {
    return [];
  }

  const normalizedItems = normalizeAddressBookItems(items);
  window.localStorage.setItem(addressBookStorageKey, JSON.stringify(normalizedItems));
  return normalizedItems;
}

/** 容错读取所有 H5 本地密码凭据。 */
function getStoredPasswordCredentials(): PasswordCredentialStore {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const stored = window.localStorage.getItem(passwordCredentialStorageKey);
    return stored ? (JSON.parse(stored) as PasswordCredentialStore) : {};
  } catch {
    return {};
  }
}

/** 获取指定手机号的 H5 本地密码凭据。 */
export function getStoredPasswordCredential(phone: string) {
  return getStoredPasswordCredentials()[phone] ?? null;
}

/** 保存指定手机号的 H5 本地密码凭据。 */
export function setStoredPasswordCredential(phone: string, credential: StoredPasswordCredential) {
  if (typeof window === "undefined") {
    return;
  }

  const credentials = getStoredPasswordCredentials();
  credentials[phone] = credential;
  window.localStorage.setItem(passwordCredentialStorageKey, JSON.stringify(credentials));
}

/** 容错读取注册后待选择角色标记。 */
function getStoredPendingRegistrations(): PendingRegistrationStore {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const stored = window.localStorage.getItem(pendingRegistrationStorageKey);
    return stored ? (JSON.parse(stored) as PendingRegistrationStore) : {};
  } catch {
    return {};
  }
}

/** 记录指定注册手机号进入 H5 前必须完成角色选择。 */
export function setStoredPendingRegistration(phone: string) {
  if (typeof window === "undefined") {
    return;
  }

  const pendingRegistrations = getStoredPendingRegistrations();
  pendingRegistrations[phone] = {
    phone,
    createdAt: new Date().toISOString()
  };
  window.localStorage.setItem(pendingRegistrationStorageKey, JSON.stringify(pendingRegistrations));
}

/** 检查原始手机号是否仍有未完成的注册后角色选择步骤。 */
export function hasStoredPendingRegistration(phone: string) {
  return Boolean(getStoredPendingRegistrations()[phone]);
}

/** 角色确认成功后清除未完成注册标记。 */
export function clearStoredPendingRegistration(phone: string) {
  if (typeof window === "undefined") {
    return;
  }

  const pendingRegistrations = getStoredPendingRegistrations();
  delete pendingRegistrations[phone];
  window.localStorage.setItem(pendingRegistrationStorageKey, JSON.stringify(pendingRegistrations));
}

// 持久化前规范化资料草稿，避免纯空白内容通过校验。
export function getFilledProfileDraft(profileDraft: ProfileDraftState) {
  return Object.fromEntries(
    Object.entries(profileDraft)
      .map(([key, value]) => [key, value.trim()])
      .filter(([, value]) => value.length > 0)
  );
}

// 返回 null 表示当前场景所需资料已经完整。
export function getProfileRequirement(
  role: Role,
  activeTab: ClientModuleKey,
  profileDraft: ProfileDraftState
): ProfileRequirement | null {
  const template = profileRequirementTemplates[role][activeTab];

  if (!template) {
    return null;
  }

  const missingFields = template.fields.filter((field) => !profileDraft[field.key]?.trim());

  if (missingFields.length === 0) {
    return null;
  }

  return {
    ...template,
    missingFields
  };
}

export function getProfileRequirementTemplate(role: Role, activeTab: ClientModuleKey) {
  return profileRequirementTemplates[role][activeTab] ?? null;
}

export function getDefaultRouteForRole(role: Role) {
  return moduleRoutePaths[getDefaultPrimaryTab(role)] ?? "/featured";
}

export function getRouteForTab(tab: ClientModuleKey) {
  return moduleRoutePaths[tab] ?? "/featured";
}

export function getTabFromRoute(pathname: string): ClientModuleKey | null {
  const match = Object.entries(moduleRoutePaths).find(([, routePath]) => routePath === pathname);
  return match ? (match[0] as ClientModuleKey) : null;
}

export function formatCurrency(value: number) {
  return `¥${value.toFixed(2)}`;
}

export function getDefaultDeliveryMode(role: Role, product: ProductSummary): DeliveryMode {
  if (role === "parent") {
    return "express";
  }
  return product.deliveryModes[0] ?? "scheduled";
}

export function getDeliveryFee(mode: DeliveryMode) {
  if (mode === "express") {
    return 6;
  }
  if (mode === "immediate") {
    return 4;
  }
  return 2;
}

export function getTabTitle(role: Role, activeTab: ClientModuleKey) {
  return clientPrimaryTabs[role].find((tab) => tab.key === activeTab)?.label ?? "优选";
}

export function getProductFilterLabel(filter: ProductFilter) {
  return productFilters.find((item) => item.key === filter)?.label ?? "筛选";
}

export function getRoleHint(role: Role) {
  if (role === "student") {
    return "学生可购买优选、报名兼职、发布委托或上线狩猎。";
  }
  if (role === "merchant") {
    return "商户主账号查看全量经营内容，子账号只处理售后、咨询和商品维护。";
  }
  return "家长可购买快递商品，发布家教需求并筛选学生。";
}

// 家长商品入口复用优选商品，但仅保留支持快递配送的条目。
export function filterProducts(products: ProductSummary[], role: Role, filter: ProductFilter) {
  const roleProducts =
    role === "parent" ? products.filter((product) => product.deliveryModes.includes("express")) : products;

  if (filter === "selfRun") {
    return roleProducts.filter((product) => product.source.includes("平台自营"));
  }
  if (filter === "hourly") {
    return roleProducts.filter((product) => product.deliveryModes.includes("immediate"));
  }
  if (filter === "stock") {
    return roleProducts.filter((product) => product.stock > 0);
  }
  return roleProducts;
}
