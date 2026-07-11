/**
 * Shared client page model.
 * Keep only pure config, local-storage adapters, and side-effect-free helpers here.
 */
export const roles: Role[] = ["student", "merchant", "parent"];
export const profileDraftStorageKey = "unknown_client_profile_completion_v1";
/** Local H5 address-book storage key; stores settings-page address cards before backend APIs exist. */
export const addressBookStorageKey = "unknown_client_address_book_v1";
/** Local H5 password credential storage key; stores salted hashes, never plaintext passwords. */
export const passwordCredentialStorageKey = "unknown_client_password_credentials_v1";
/** Local H5 pending registration storage key; keeps accounts from bypassing role selection. */
export const pendingRegistrationStorageKey = "unknown_client_pending_registration_v1";

/** Salted local password credential used before backend password APIs are available. */
export interface StoredPasswordCredential {
  salt: string;
  passwordHash: string;
  updatedAt: string;
}

/** Local password credentials indexed by phone number. */
export type PasswordCredentialStore = Record<string, StoredPasswordCredential>;

/** Local pending registration marker keyed by the raw phone number used in the form. */
export interface PendingRegistrationRecord {
  phone: string;
  createdAt: string;
}

/** Pending registration markers indexed by raw phone number. */
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

// Single source of truth for bottom-tab routes and default redirects.
export const moduleRoutePaths: Partial<Record<ClientModuleKey, string>> = {
  featured: "/featured",
  partTime: "/part-time",
  hunting: "/delegation",
  merchantSales: "/merchant-sales",
  marketing: "/marketing",
  tutor: "/tutor"
};

/** Unified address fields shared by registration completion, scene profile completion, and settings preview. */
export const addressInfoFields: ProfileRequirementField[] = [
  { key: "contactName", label: "姓名", placeholder: "请输入姓名" },
  { key: "campusArea", label: "常用区域", placeholder: "选择或输入常用区域", kind: "area" },
  { key: "buildingFloor", label: "楼栋楼层", placeholder: "例如 8 号楼 5 层 / 8-512" },
  { key: "deliveryAddress", label: "收货地址", placeholder: "请输入详细收货地址" },
  { key: "contactPhone", label: "联系电话", placeholder: "请输入手机号", inputMode: "tel" }
];

/** Unified address template used wherever H5 asks the user to supplement account information. */
export const addressInfoTemplate: ProfileRequirementTemplate = {
  title: "补充地址信息",
  description: "请补充姓名、常用区域、楼栋楼层、收货地址和联系电话。",
  fields: addressInfoFields
};

// Scene-level profile requirements consumed by App and login/profile completion flows.
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

// Registration completion templates can be skipped, but later scene actions re-check requirements.
export const registrationProfileTemplates: Record<Role, ProfileRequirementTemplate> = {
  student: addressInfoTemplate,
  merchant: addressInfoTemplate,
  parent: addressInfoTemplate
};

// UI-only mapping from module key to navigation icon.
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

// Local drafts improve continuation UX; server-side certification remains authoritative.
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

/** Creates a local address-book item from an address draft. */
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

/** Ensures address-book items have at most one current address and stable item dates. */
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

/** Reads local H5 address-book items and falls back to the current profile draft when present. */
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
    // Fall back to the current profile draft below.
  }

  const hasFallbackAddress = addressInfoFields.some((field) => fallbackDraft[field.key]?.trim());
  return hasFallbackAddress ? [createAddressBookItem(fallbackDraft, true)] : [];
}

/** Persists local H5 address-book items after normalizing current-address state. */
export function setStoredAddressBook(items: AddressBookItem[]) {
  if (typeof window === "undefined") {
    return [];
  }

  const normalizedItems = normalizeAddressBookItems(items);
  window.localStorage.setItem(addressBookStorageKey, JSON.stringify(normalizedItems));
  return normalizedItems;
}

/** Reads all local H5 password credentials from storage with corrupt-data tolerance. */
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

/** Gets the local H5 password credential for one phone number. */
export function getStoredPasswordCredential(phone: string) {
  return getStoredPasswordCredentials()[phone] ?? null;
}

/** Saves the local H5 password credential for one phone number. */
export function setStoredPasswordCredential(phone: string, credential: StoredPasswordCredential) {
  if (typeof window === "undefined") {
    return;
  }

  const credentials = getStoredPasswordCredentials();
  credentials[phone] = credential;
  window.localStorage.setItem(passwordCredentialStorageKey, JSON.stringify(credentials));
}

/** Reads pending post-registration role markers with corrupt-data tolerance. */
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

/** Records that a registered phone must complete role selection before entering H5. */
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

/** Checks whether the raw phone number still has an unfinished post-registration role step. */
export function hasStoredPendingRegistration(phone: string) {
  return Boolean(getStoredPendingRegistrations()[phone]);
}

/** Clears the unfinished post-registration role marker after role confirmation succeeds. */
export function clearStoredPendingRegistration(phone: string) {
  if (typeof window === "undefined") {
    return;
  }

  const pendingRegistrations = getStoredPendingRegistrations();
  delete pendingRegistrations[phone];
  window.localStorage.setItem(pendingRegistrationStorageKey, JSON.stringify(pendingRegistrations));
}

// Normalize profile drafts before persistence so empty whitespace does not pass validation.
export function getFilledProfileDraft(profileDraft: ProfileDraftState) {
  return Object.fromEntries(
    Object.entries(profileDraft)
      .map(([key, value]) => [key, value.trim()])
      .filter(([, value]) => value.length > 0)
  );
}

// Null means the current scene has all required profile fields.
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

// Parent product access reuses featured products but narrows delivery to express-capable items.
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
