/**
 * Shared client page model.
 * Keep only pure config, local-storage adapters, and side-effect-free helpers here.
 */
export const roles: Role[] = ["student", "merchant", "parent"];
export const profileDraftStorageKey = "unknown_client_profile_completion_v1";
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
export const phonePattern = /^1[3-9]\d{9}$/;

// Single source of truth for bottom-tab routes and default redirects.
export const moduleRoutePaths: Partial<Record<ClientModuleKey, string>> = {
  featured: "/featured",
  partTime: "/part-time",
  hunting: "/delegation",
  merchantSales: "/merchant-sales",
  marketing: "/marketing",
  tutor: "/tutor"
};

// Scene-level profile requirements consumed by App and login/profile completion flows.
export const profileRequirementTemplates: Record<Role, Partial<Record<ClientModuleKey, ProfileRequirementTemplate>>> = {
  student: {
    featured: {
      title: "补充优选购买信息",
      description: "优选购买、配送和售后需要先确认校内位置与联系方式。",
      fields: [
        { key: "studentName", label: "姓名", placeholder: "请输入真实姓名" },
        { key: "studentCampusArea", label: "常用区域", placeholder: "选择或输入校内区域", kind: "area" },
        { key: "studentDormLocation", label: "楼栋楼层", placeholder: "例如 8 号楼 5 层 / 8-512" },
        { key: "studentDeliveryAddress", label: "收货位置", placeholder: "例如 8 号楼 512 / 校门口" },
        { key: "studentContactPhone", label: "联系电话", placeholder: "请输入手机号", inputMode: "tel" }
      ]
    },
    partTime: {
      title: "补充兼职报名信息",
      description: "兼职报名需要基础学籍与联系方式，报名快照会随报名记录保存。",
      fields: [
        { key: "studentName", label: "姓名", placeholder: "请输入真实姓名" },
        { key: "studentSchool", label: "学校", placeholder: "请输入学校" },
        { key: "studentMajor", label: "专业", placeholder: "请输入专业" },
        { key: "studentGrade", label: "年级", placeholder: "例如 大二" },
        { key: "studentContactPhone", label: "联系电话", placeholder: "请输入手机号", inputMode: "tel" }
      ]
    },
    hunting: {
      title: "补充委托/狩猎信息",
      description: "发布委托、上线狩猎和接单需要学生认证、押金状态与校内位置。",
      fields: [
        { key: "studentName", label: "姓名", placeholder: "请输入真实姓名" },
        { key: "studentVerifyStatus", label: "学生认证状态", placeholder: "例如 待审核 / 已通过" },
        { key: "studentDepositStatus", label: "押金状态", placeholder: "例如 已缴纳 100 元" },
        { key: "studentCampusArea", label: "常用区域", placeholder: "选择或输入校内区域", kind: "area" },
        { key: "studentDormLocation", label: "楼栋楼层", placeholder: "例如 8 号楼 5 层 / 8-512" },
        { key: "studentContactPhone", label: "联系电话", placeholder: "请输入手机号", inputMode: "tel" }
      ]
    },
    tutor: {
      title: "补充家教资格信息",
      description: "学生承接家教前需要展示家教资格、学校、专业等基础信息。",
      fields: [
        { key: "studentName", label: "姓名", placeholder: "请输入真实姓名" },
        { key: "studentSchool", label: "学校", placeholder: "请输入学校" },
        { key: "studentMajor", label: "专业", placeholder: "请输入专业" },
        { key: "studentGpa", label: "绩点", placeholder: "例如 3.7/4.0" },
        { key: "studentTutorSubjects", label: "可家教学科", placeholder: "例如 数学、英语" }
      ]
    }
  },
  merchant: {
    merchantSales: {
      title: "补充销售工作台信息",
      description: "商品上架、配送处理和售后沟通需要确认店铺与对接信息。",
      fields: [
        { key: "merchantStoreName", label: "门店名称", placeholder: "请输入门店名称" },
        { key: "merchantContactName", label: "负责人", placeholder: "请输入负责人姓名" },
        { key: "merchantContactPhone", label: "联系电话", placeholder: "请输入手机号", inputMode: "tel" },
        { key: "merchantCampusArea", label: "服务区域", placeholder: "选择或输入主要服务区域", kind: "area" },
        { key: "merchantStoreAddress", label: "门店位置", placeholder: "请输入门店地址或校内位置" },
        { key: "merchantCreditDeposit", label: "店铺信用金", placeholder: "例如 已缴纳 / 待缴纳" }
      ]
    },
    partTime: {
      title: "补充兼职发布信息",
      description: "商户发布兼职前需要联系人、结算和岗位保证金等信息。",
      fields: [
        { key: "merchantCompanyName", label: "发布主体", placeholder: "请输入公司或门店名称" },
        { key: "merchantRecruiterName", label: "招聘负责人", placeholder: "请输入负责人姓名" },
        { key: "merchantContactPhone", label: "联系电话", placeholder: "请输入手机号", inputMode: "tel" },
        { key: "merchantSettlementRule", label: "结算规则", placeholder: "例如 结束后 3 天结算" },
        { key: "merchantJobDeposit", label: "岗位保证金", placeholder: "例如 已缴纳 / 发布时缴纳" }
      ]
    },
    marketing: {
      title: "补充营销配置基础信息",
      description: "营销入口暂为预留模块，先维护门店与运营联系人。",
      fields: [
        { key: "merchantStoreName", label: "门店名称", placeholder: "请输入门店名称" },
        { key: "merchantOperatorName", label: "运营联系人", placeholder: "请输入联系人姓名" },
        { key: "merchantContactPhone", label: "联系电话", placeholder: "请输入手机号", inputMode: "tel" }
      ]
    }
  },
  parent: {
    featured: {
      title: "补充快递收货信息",
      description: "家长端商品固定快递配送，需要完整收货信息。",
      fields: [
        { key: "parentName", label: "收货人", placeholder: "请输入收货人姓名" },
        { key: "parentContactPhone", label: "联系电话", placeholder: "请输入手机号", inputMode: "tel" },
        { key: "parentExpressAddress", label: "快递地址", placeholder: "请输入详细快递地址" }
      ]
    },
    tutor: {
      title: "补充家教招募信息",
      description: "发布家教需求前需要至少维护一个孩子档案和学科偏好。",
      fields: [
        { key: "parentName", label: "联系人", placeholder: "请输入联系人姓名" },
        { key: "parentContactPhone", label: "联系电话", placeholder: "请输入手机号", inputMode: "tel" },
        { key: "childGrade", label: "孩子年级", placeholder: "例如 初二 / 高一" },
        { key: "childSubjects", label: "学科", placeholder: "例如 数学、英语" }
      ]
    }
  }
};

// Registration completion templates can be skipped, but later scene actions re-check requirements.
export const registrationProfileTemplates: Record<Role, ProfileRequirementTemplate> = {
  student: {
    title: "补充学生信息",
    description: "先填写常用宿舍位置，后续购买、配送和发布需求会优先使用。",
    fields: [
      { key: "studentCampusArea", label: "常用区域", placeholder: "选择或输入校内区域", kind: "area" },
      { key: "studentDormLocation", label: "楼栋楼层", placeholder: "例如 8 号楼 5 层 / 8-512" }
    ]
  },
  merchant: {
    title: "补充商户信息",
    description: "先填写基础经营信息，认证资料后续可在设置中继续完善。",
    fields: [
      { key: "merchantType", label: "商户类型", placeholder: "校园店铺 / 个人商户 / 校外服务商 / 校企合作" },
      { key: "merchantCampusArea", label: "服务区域", placeholder: "选择或输入主要服务区域", kind: "area" },
      { key: "merchantStoreName", label: "门店名称", placeholder: "请输入门店或主体名称" }
    ]
  },
  parent: {
    title: "补充孩子信息",
    description: "先维护孩子年级和学科，后续发布家教需求时会强校验。",
    fields: [
      { key: "childGrade", label: "孩子年级", placeholder: "例如 初二 / 高一" },
      { key: "childSubjects", label: "学科", placeholder: "例如 数学、英语" }
    ]
  }
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
