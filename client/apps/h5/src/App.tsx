const roles: Role[] = ["student", "merchant", "parent"];
const profileDraftStorageKey = "unknown_client_profile_completion_v1";
const campusAreaOptions = ["宿舍区", "教学区", "图书馆", "食堂", "校门口", "操场", "快递站", "商业街", "家属区", "校外周边"];
const productFilters: Array<{ key: ProductFilter; label: string }> = [
  { key: "selfRun", label: "自营" },
  { key: "stock", label: "现货" },
  { key: "hourly", label: "小时达" },
  { key: "latest", label: "最新发布" }
];
const jobFilters: Array<{ key: JobFilter; label: string }> = [
  { key: "latest", label: "最新发布" },
  { key: "hourly", label: "时薪优先" }
];
const tutorSorts: Array<{ key: TutorSort; label: string }> = [
  { key: "recommended", label: "系统推荐" },
  { key: "favorite", label: "收藏优先" },
  { key: "hired", label: "受聘次数" },
  { key: "duration", label: "可兼职时长" }
];
const phonePattern = /^1[3-9]\d{9}$/;

const profileRequirementTemplates: Record<Role, Partial<Record<ClientModuleKey, ProfileRequirementTemplate>>> = {
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

const registrationProfileTemplates: Record<Role, ProfileRequirementTemplate> = {
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

const tabIcons: Record<ClientModuleKey, LucideIcon> = {
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

function getStoredProfileDraft(): ProfileDraftState {
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

function setStoredProfileDraft(profileDraft: ProfileDraftState) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(profileDraftStorageKey, JSON.stringify(profileDraft));
}

function getFilledProfileDraft(profileDraft: ProfileDraftState) {
  return Object.fromEntries(
    Object.entries(profileDraft)
      .map(([key, value]) => [key, value.trim()])
      .filter(([, value]) => value.length > 0)
  );
}

function getProfileRequirement(role: Role, activeTab: ClientModuleKey, profileDraft: ProfileDraftState): ProfileRequirement | null {
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

function getProfileRequirementTemplate(role: Role, activeTab: ClientModuleKey) {
  return profileRequirementTemplates[role][activeTab] ?? null;
}

function formatCurrency(value: number) {
  return `¥${value.toFixed(2)}`;
}

function getDefaultDeliveryMode(role: Role, product: ProductSummary): DeliveryMode {
  if (role === "parent") {
    return "express";
  }
  return product.deliveryModes[0] ?? "scheduled";
}

function getDeliveryFee(mode: DeliveryMode) {
  if (mode === "express") {
    return 6;
  }
  if (mode === "immediate") {
    return 4;
  }
  return 2;
}

function getTabTitle(role: Role, activeTab: ClientModuleKey) {
  return clientPrimaryTabs[role].find((tab) => tab.key === activeTab)?.label ?? "优选";
}

function getProductFilterLabel(filter: ProductFilter) {
  return productFilters.find((item) => item.key === filter)?.label ?? "筛选";
}

function getRoleHint(role: Role) {
  if (role === "student") {
    return "学生可购买优选、报名兼职、发布委托或上线狩猎。";
  }
  if (role === "merchant") {
    return "商户主账号查看全量经营内容，子账号只处理售后、咨询和商品维护。";
  }
  return "家长可购买快递商品，发布家教需求并筛选学生。";
}

function filterProducts(products: ProductSummary[], role: Role, filter: ProductFilter) {
  const roleProducts =
    role === "parent"
      ? products.filter((product) => product.deliveryModes.includes("express"))
      : products;

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

function Header({
  role,
  activeTab
}: {
  role: Role;
  activeTab: ClientModuleKey;
}) {
  return (
    <section className="top-bar">
      <div className="top-title">
        <p>{clientPublishPlatformLabels.h5} · 本地开发调试</p>
        <h1>{getTabTitle(role, activeTab)}</h1>
      </div>
      <div className="top-role-switch" aria-label="当前登录身份">
        <span>当前身份</span>
        <div>
          <button className="active" type="button">
            {roleLabels[role]}
          </button>
        </div>
      </div>
    </section>
  );
}

function ProfileContextCard({
  role,
  description,
  requirement,
  onOpenCompletion
}: {
  role: Role;
  description: string;
  requirement: ProfileRequirement | null;
  onOpenCompletion: () => void;
}) {
  return (
    <section className={`context-card ${requirement ? "needs-profile" : "profile-ready"}`}>
      <div className="context-card-main">
        <strong>{getRoleHint(role)}</strong>
        <p>{description}</p>
        {requirement ? (
          <div className="context-missing">
            <span>
              <AlertCircle size={14} />
              缺少：{requirement.missingFields.map((field) => field.label).join("、")}
            </span>
            <button className="context-action" onClick={onOpenCompletion} type="button">
              补充资料
            </button>
          </div>
        ) : (
          <div className="context-ready">
            <CheckCircle2 size={14} />
            <span>当前模块资料已补齐</span>
          </div>
        )}
      </div>
      {requirement ? <AlertCircle size={20} /> : <BadgeCheck size={20} />}
    </section>
  );
}

function ProductModule({
  role,
  products,
  productFilter,
  isProductsLoading,
  purchasePending,
  onFilterChange,
  onOpenCheckout
}: {
  role: Role;
  products: ProductSummary[];
  productFilter: ProductFilter;
  isProductsLoading: boolean;
  purchasePending: boolean;
  onFilterChange: (filter: ProductFilter) => void;
  onOpenCheckout: (product: ProductSummary) => void;
}) {
  const visibleProducts = filterProducts(products, role, productFilter);
  const title = role === "parent" ? "快递商品" : "优选商品/服务";

  return (
    <section className="module-stack">
      <SectionHeader
        countText={isProductsLoading ? "加载中" : `${visibleProducts.length} 个`}
        eyebrow={role === "parent" ? "家长端固定快递配送" : "自营耗材、平台闲置、商户商品与服务"}
        title={title}
      />

      <div className="segmented-control" aria-label="优选筛选">
        {productFilters.map((item) => (
          <button
            className={item.key === productFilter ? "active" : ""}
            key={item.key}
            onClick={() => onFilterChange(item.key)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="product-list" aria-label="商品和服务列表">
        {visibleProducts.map((product) => (
          <ProductListCard
            key={product.id}
            onOpenCheckout={onOpenCheckout}
            product={product}
            purchasePending={purchasePending}
            role={role}
          />
        ))}
      </div>

      <article className="flow-card compact">
        <div className="card-title">
          <PackageCheck size={18} />
          <strong>购买订单状态</strong>
        </div>
        <div className="status-flow">
          {["待配送/备货中", "配送中", "已送达", "待确认", "已完成"].map((status) => (
            <span key={status}>{status}</span>
          ))}
        </div>
        <p>待确认 48 小时自动完成；已完成 7*24 小时内可申请退款，需售后同意后进入退款流程。</p>
      </article>
    </section>
  );
}

function StudentPartTimeModule({
  jobs,
  jobFilter,
  onJobFilterChange
}: {
  jobs: PartTimeJob[];
  jobFilter: JobFilter;
  onJobFilterChange: (filter: JobFilter) => void;
}) {
  const visibleJobs = jobFilter === "hourly" ? [...jobs].sort((a, b) => b.hourlyPay - a.hourlyPay) : jobs;

  return (
    <section className="module-stack">
      <SectionHeader countText={`${visibleJobs.length} 个`} eyebrow="中长期兼职、短期任务、平台合作兼职" title="兼职列表与报名" />
      <div className="segmented-control" aria-label="兼职筛选">
        {jobFilters.map((item) => (
          <button className={item.key === jobFilter ? "active" : ""} key={item.key} onClick={() => onJobFilterChange(item.key)} type="button">
            {item.label}
          </button>
        ))}
      </div>

      <div className="card-list">
        {visibleJobs.map((job) => (
          <PartTimeJobCard job={job} key={job.id} mode="student" />
        ))}
      </div>

      <article className="flow-card compact">
        <div className="card-title">
          <CalendarClock size={18} />
          <strong>学生报名状态流</strong>
        </div>
        <div className="status-flow">
          {["已报名", "待筛选", "未通过", "已确认/待签到", "已签到", "进行中", "结算中", "已结算"].map((status) => (
            <span key={status}>{status}</span>
          ))}
        </div>
      </article>
    </section>
  );
}

function HuntingModule({
  huntingSummary,
  huntingTasks,
  isOnline,
  onToggleOnline
}: {
  huntingSummary: HuntingSummary;
  huntingTasks: HuntingTask[];
  isOnline: boolean;
  onToggleOnline: () => void;
}) {
  return (
    <section className="module-stack">
      <SectionHeader countText={isOnline ? "狩猎中" : "未上线"} eyebrow="发布方为委托，服务方为狩猎" title="委托/狩猎" />
      <article className="flow-card verification-card">
        <div className="card-title">
          <ShieldCheck size={18} />
          <div>
            <strong>狩猎准入</strong>
            <span>人工审核身份证照片 + 学信网截图，押金从钱包处理</span>
          </div>
        </div>
        <div className="metric-grid">
          <Metric label="学生认证" value={huntingSummary.studentCertification} />
          <Metric label="二次验证" value={huntingSummary.secondVerification} />
          <Metric label="狩猎押金" value={huntingSummary.depositText} />
          <Metric label="信用值" value={huntingSummary.creditText} />
        </div>
        <div className="product-actions">
          <span>不选狩猎时间默认次日 0 点下线，允许跨天。</span>
          <button className={isOnline ? "warning-button" : "primary-button"} onClick={onToggleOnline} type="button">
            <Crosshair size={15} />
            {isOnline ? "下线狩猎" : "上线狩猎"}
          </button>
        </div>
      </article>

      <div className="split-actions">
        <article className="flow-card compact">
          <div className="card-title">
            <Plus size={18} />
            <strong>发布委托</strong>
          </div>
          <p>可选报价发布或服务发布，填写地点、最晚送达、紧急程度和委托时效；系统默认通过后入池。</p>
          <div className="form-preview">
            <span>报价发布</span>
            <span>服务发布</span>
            <span>押金发布</span>
            <span>委托发布</span>
          </div>
        </article>
        <article className="flow-card compact">
          <div className="card-title">
            <WalletCards size={18} />
            <strong>结算规则</strong>
          </div>
          <p>发布方确认服务结束后进入观察期，当前默认 3 天后进入可提现钱包。</p>
        </article>
      </div>

      <div className="card-list">
        {huntingTasks.map((task) => (
          <article className="flow-card" key={task.id}>
            <div className="card-title">
              <Crosshair size={18} />
              <div>
                <strong>{task.title}</strong>
                <span>{task.mode}</span>
              </div>
              <em>{task.fee > 0 ? formatCurrency(task.fee) : "待报价"}</em>
            </div>
            <div className="meta-line">
              <span>{task.latestTime}</span>
              <span>{task.location}</span>
              <span>{task.urgency}</span>
              <span>{task.status}</span>
            </div>
            <div className="product-actions">
              <span>2 分钟内可自助取消，5 分钟内可协商取消。</span>
              <div>
                <button className="ghost-button" type="button">
                  <MessageCircle size={15} /> 联系
                </button>
                <button className="primary-button" type="button">
                  <CheckCircle2 size={15} />
                  {task.mode === "报价发布" ? "报价委托" : "接受委托"}
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function MerchantSalesModule({
  dashboard,
  merchantProducts
}: {
  dashboard: MerchantDashboard;
  merchantProducts: MerchantProduct[];
}) {
  return (
    <section className="module-stack">
      <SectionHeader countText="全部门店" eyebrow="销售、配送、消息和经营看板" title="销售工作台" />
      <WorkbenchInfoCard
        description="全部门店汇总，可按门店筛选销售、配送、消息和转化表现。"
        icon={Store}
        metrics={[
          { label: "销售数/额", value: `${dashboard.salesCount} / ${formatCurrency(dashboard.salesAmount)}` },
          { label: "待配送", value: `${dashboard.pendingDelivery}` },
          { label: "配送中", value: `${dashboard.delivering}` },
          { label: "售后/对话", value: `${dashboard.afterSaleMessages} / ${dashboard.chatMessages}` },
          { label: "浏览/收藏", value: `${dashboard.views} / ${dashboard.favorites}` },
          { label: "售后率", value: dashboard.afterSaleRate }
        ]}
        title="经营数据"
        variant="large"
      />

      <WorkbenchQuickEntryCard
        description="把销售、配送、消息和添加商品入口收在同一张快捷卡片中。"
        entries={[
          { icon: PackageCheck, label: "销售列表", text: "订单卡片、详情弹窗、订单诉求" },
          { icon: Truck, label: "配送入口", text: "待配送、配送中、物流单号、人工配送" },
          { icon: MessageCircle, label: "消息列表", text: "售后置顶、常规交流对话" },
          { icon: Plus, label: "添加产品", text: "名称、型号、售价、库存、图片" }
        ]}
        icon={ClipboardCheck}
        title="快捷入口"
      />

      <div className="card-list">
        {merchantProducts.map((product) => (
          <MerchantProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}

function MerchantPartTimeModule({
  dashboard,
  jobs
}: {
  dashboard: MerchantDashboard;
  jobs: PartTimeJob[];
}) {
  return (
    <section className="module-stack">
      <SectionHeader countText="2 个招募中" eyebrow="发布兼职、筛选名单、招募结束" title="兼职工作台" />
      <WorkbenchInfoCard
        description="展示招募沉淀、历史人员和发布前资金状态。"
        icon={BriefcaseBusiness}
        metrics={[
          { label: "已完成招募", value: "12 次" },
          { label: "历史人员", value: "68 人" },
          { label: "岗位保证金", value: dashboard.depositStatus },
          { label: "钱款状态", value: "预算托管中" }
        ]}
        title="招募数据"
      />
      <WorkbenchQuickEntryCard
        description="发布、名单筛选、报名表和结算配置聚合为兼职快捷入口。"
        entries={[
          { icon: Plus, label: "发布兼职", text: "填写主题、周期、人数、薪资、结算日期" },
          { icon: ClipboardCheck, label: "报名表", text: "籍贯、年龄、身高、性别、体重、近视、是否本地" },
          { icon: UserRound, label: "筛选名单", text: "查看报名信息、确认招募、邮件发送名单" },
          { icon: WalletCards, label: "结算配置", text: "岗位保证金、签到保证金、结束后结算时间" }
        ]}
        icon={Plus}
        title="快捷入口"
      />
      <div className="card-list">
        {jobs.map((job) => (
          <PartTimeJobCard job={job} key={job.id} mode="merchant" />
        ))}
      </div>
    </section>
  );
}

function MarketingModule() {
  return (
    <section className="module-stack">
      <SectionHeader countText="预留" eyebrow="后续营销活动统一从这里设置" title="营销" />
      <article className="empty-state">
        <Megaphone size={28} />
        <strong>营销主入口已预留</strong>
        <p>后续承接优惠券、活动价、置顶、套餐、复购提醒、活动数据、费用扣减和审核规则。</p>
      </article>
    </section>
  );
}

function TutorModule({
  tutorDemands,
  tutorSort,
  onTutorSortChange
}: {
  tutorDemands: TutorDemand[];
  tutorSort: TutorSort;
  onTutorSortChange: (sort: TutorSort) => void;
}) {
  return (
    <section className="module-stack">
      <SectionHeader countText="1 个需求" eyebrow="按学校、学科筛选，按收藏、受聘次数、系统推荐、可兼职时长排序" title="家教招募" />
      <div className="segmented-control wrap" aria-label="家教排序">
        {tutorSorts.map((item) => (
          <button className={item.key === tutorSort ? "active" : ""} key={item.key} onClick={() => onTutorSortChange(item.key)} type="button">
            {item.label}
          </button>
        ))}
      </div>
      <article className="flow-card compact">
        <div className="card-title">
          <Plus size={18} />
          <strong>发布家教需求</strong>
        </div>
        <p>发布时选择孩子档案，强校验年级和科目；可填写是否试课、试课时长和试课费用。</p>
      </article>
      {tutorDemands.map((demand) => (
        <article className="flow-card" key={demand.id}>
          <div className="card-title">
            <GraduationCap size={18} />
            <div>
              <strong>{demand.child} · {demand.subject}</strong>
              <span>{demand.school} · {demand.budget}</span>
            </div>
            <em>{demand.status}</em>
          </div>
          <div className="card-list nested">
            {demand.applicants.map((applicant) => (
              <article className="applicant-row" key={applicant.id}>
                <div>
                  <strong>{applicant.name}</strong>
                  <p>{applicant.school} · {applicant.major} · GPA {applicant.gpa}</p>
                  <div className="meta-line">
                    <span>受聘 {applicant.hiredTimes} 次</span>
                    <span>{applicant.availability}</span>
                    <span>{applicant.status}</span>
                  </div>
                </div>
                <div className="vertical-actions">
                  <button className="ghost-button" type="button">拒绝</button>
                  <button className="ghost-button" type="button">交换电话</button>
                  <button className="primary-button" type="button">确认招募</button>
                </div>
              </article>
            ))}
          </div>
          <div className="product-actions">
            <span>完成家教后可互评，家长可收藏优秀学生。</span>
            <button className="ghost-button" type="button">
              <Heart size={15} /> 收藏学生
            </button>
          </div>
        </article>
      ))}
    </section>
  );
}

function MineContent({ role, onNavigate }: { role: Role; onNavigate: (surface: PageSurface) => void }) {
  const isStudent = role === "student";
  const isMerchant = role === "merchant";
  const tradeItems = isStudent
    ? ["我买到的", "我的发布", "狩猎记录", "我的兼职", "家教卡片", "投诉入口"]
    : isMerchant
      ? ["我卖出的", "我的兼职", "投诉入口"]
      : ["我买到的", "我的家教", "投诉入口"];
  const settingBinding = isStudent ? "家教资质/学生认证" : isMerchant ? "工商信息/门店/员工" : "孩子信息/多学科";

  return (
    <section className="module-stack">
      <SectionHeader countText="独立页面" eyebrow={mineEntryLabels[role]} title="账户中心" />
      <article className="mine-account">
        <button className="settings-icon" onClick={() => onNavigate("settings")} type="button" aria-label="设置">
          <Settings size={20} />
        </button>
        <div>
          <strong>{roleLabels[role]}账户</strong>
          <p>认证标签：{isMerchant ? "商户认证通过" : isStudent ? "学生认证通过" : "家长资料待完善"} · 信用值 {isStudent ? "10" : "0"}</p>
        </div>
        <button className="ghost-button" onClick={() => onNavigate("wallet")} type="button">
          <WalletCards size={15} /> 钱包详情
        </button>
      </article>
      <div className="mine-grid">
        <MineCard title="我的交易" items={tradeItems} />
        <MineCard title="我的记录" items={isMerchant ? ["我的关注"] : ["我的收藏", "我的关注", "浏览历史"]} />
        <MineCard title="设置绑定" items={["账户信息", settingBinding, "收货地址", "平台协议", "版本&更新", "建议"]} />
      </div>
      <article className="flow-card">
        <div className="card-title">
          <CalendarClock size={18} />
          <strong>进行中的列表卡片</strong>
        </div>
        <div className="status-flow">
          {(isStudent
            ? ["配送中的商品", "发布委托", "执行狩猎", "兼职中", "家教服务中"]
            : isMerchant
              ? ["配送中的卡片", "招募中的兼职卡片"]
              : ["配送中的卡片", "招募中的家教卡片"]
          ).map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
        <p>按待处理、即将超时、最近更新的优先级动态排序。</p>
      </article>
    </section>
  );
}

function WalletContent({
  walletRecords,
  walletSummary
}: {
  walletRecords: WalletRecord[];
  walletSummary: WalletSummary;
}) {
  return (
    <section className="module-stack">
      <SectionHeader countText="支持类型筛选" eyebrow="可提现钱包 + 观察期/保护期账户" title="账户资金" />
      <div className="metric-grid">
        <Metric label="可提现" value={walletSummary.withdrawable} />
        <Metric label="观察期" value={walletSummary.observation} />
        <Metric label="押金/保证金" value={walletSummary.deposit} />
        <Metric label="提现方式" value={walletSummary.withdrawMethods} />
      </div>
      <div className="segmented-control wrap">
        {["全部", "购买", "退款", "押金", "观察期", "提现"].map((item) => (
          <button className={item === "全部" ? "active" : ""} key={item} type="button">{item}</button>
        ))}
      </div>
      <div className="card-list">
        {walletRecords.map((record) => (
          <article className="wallet-row" key={record.id}>
            <div>
              <strong>{record.title}</strong>
              <span>{record.type} · {record.status}</span>
            </div>
            <em>{record.amount}</em>
          </article>
        ))}
      </div>
    </section>
  );
}

function OrdersContent({ orders }: { orders: ClientOrder[] }) {
  return (
    <section className="module-stack">
      <SectionHeader countText={`${orders.length} 单`} eyebrow="订单快捷入口、联系电话、取消/改约/售后" title="订单列表" />
      <div className="card-list">
        {orders.map((order) => (
          <article className={`flow-card ${order.risk ? "risk-card" : ""}`} key={order.id}>
            <div className="card-title">
              <PackageCheck size={18} />
              <div>
                <strong>{order.title}</strong>
                <span>{order.id}</span>
              </div>
              <em>{order.status}</em>
            </div>
            <p>{order.detail}</p>
            <div className="meta-line">
              <span>{formatCurrency(order.amount)}</span>
              <span>{order.contact}</span>
            </div>
            <div className="product-actions">
              <span>已完成订单补充入口：评价、申请退款、举报/投诉。</span>
              <div>
                <button className="ghost-button" type="button">取消/改约</button>
                <button className="ghost-button" type="button">申请退款</button>
                <button className="primary-button" type="button">查看详情</button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function SettingsContent({ role }: { role: Role }) {
  const bindingText = role === "student" ? "学生认证、家教资质、宿舍楼栋楼层" : role === "merchant" ? "工商信息、门店、员工子账号" : "多个孩子档案和多学科";

  return (
    <section className="module-stack">
      <SectionHeader countText="设置" eyebrow="账户、绑定、地址、协议、建议" title="设置项目" />
      <div className="settings-list">
        {[
          ["账户信息", "手机号、角色身份、账号状态"],
          ["绑定信息", bindingText],
          ["收货地址", role === "parent" ? "家长商品固定快递配送地址" : "校内位置块和自定义位置"],
          ["平台协议", "用户协议、隐私政策、交易规则"],
          ["版本&更新", "H5 本地调试版本"],
          ["建议", "点击打开文本框提交建议"]
        ].map(([title, text]) => (
          <button className="settings-row" key={title} type="button">
            <span>
              <strong>{title}</strong>
              <em>{text}</em>
            </span>
            <ChevronRight size={18} />
          </button>
        ))}
      </div>
    </section>
  );
}

function PageShell({
  title,
  eyebrow,
  onBack,
  children
}: {
  title: string;
  eyebrow: string;
  onBack: () => void;
  children: ReactNode;
}) {
  return (
    <section className="page-view">
      <header className="page-header">
        <button className="back-button" onClick={onBack} type="button" aria-label="返回">
          <ArrowLeft size={20} />
        </button>
        <div>
          <span>{eyebrow}</span>
          <strong>{title}</strong>
        </div>
      </header>
      {children}
    </section>
  );
}

function getPageMeta(page: PageSurface, role: Role) {
  if (page === "mine") {
    return { title: "我的", eyebrow: roleLabels[role] };
  }
  if (page === "wallet") {
    return { title: "钱包详情", eyebrow: "可提现与观察期账户" };
  }
  if (page === "orders") {
    return { title: "订单详情", eyebrow: "订单与配送" };
  }
  return { title: "设置", eyebrow: "账户与绑定信息" };
}

function OngoingOrdersDialog({
  orders,
  onClose,
  onOpenOrders
}: {
  orders: ClientOrder[];
  onClose: () => void;
  onOpenOrders: () => void;
}) {
  return (
    <section className="ongoing-dialog" aria-label="进行中的列表">
      <div className="sheet-backdrop" onClick={onClose} />
      <article className="ongoing-panel">
        <div className="card-title">
          <PackageCheck size={18} />
          <div>
            <strong>进行中的列表卡片</strong>
            <span>{orders.length} 个配送/订单事项</span>
          </div>
          <button className="icon-only" onClick={onClose} type="button" aria-label="关闭">
            <XCircle size={20} />
          </button>
        </div>
        <div className="ongoing-list">
          {orders.map((order) => (
            <article className={`flow-card compact ${order.risk ? "risk-card" : ""}`} key={order.id}>
              <div className="card-title">
                <div>
                  <strong>{order.title}</strong>
                  <span>{order.id}</span>
                </div>
                <em>{order.status}</em>
              </div>
              <p>{order.detail}</p>
              <div className="meta-line">
                <span>{formatCurrency(order.amount)}</span>
                <span>{order.contact}</span>
              </div>
            </article>
          ))}
        </div>
        <button className="primary-button full" onClick={onOpenOrders} type="button">
          <PackageCheck size={16} />
          查看订单详情
        </button>
      </article>
    </section>
  );
}

function ProfileCompletionDialog({
  template,
  profileDraft,
  onChange,
  onClose,
  onSave
}: {
  template: ProfileRequirementTemplate;
  profileDraft: ProfileDraftState;
  onChange: (key: string, value: string) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const hasMissingFields = template.fields.some((field) => !profileDraft[field.key]?.trim());

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!hasMissingFields) {
      onSave();
    }
  }

  return (
    <section className="checkout-sheet" aria-label="补充资料">
      <div className="sheet-backdrop" onClick={onClose} />
      <form className="sheet-panel profile-sheet" onSubmit={handleSubmit}>
        <div className="card-title">
          <BadgeCheck size={18} />
          <div>
            <strong>{template.title}</strong>
            <span>{template.description}</span>
          </div>
          <button className="icon-only" onClick={onClose} type="button" aria-label="关闭">
            <XCircle size={20} />
          </button>
        </div>

        <div className="profile-field-list">
          {template.fields.map((field) => {
            const value = profileDraft[field.key] ?? "";
            const isMissing = !value.trim();

            return (
              <label className={`profile-field ${isMissing ? "missing" : ""}`} key={field.key}>
                <span>{field.label}</span>
                <input
                  inputMode={field.inputMode ?? "text"}
                  list={field.kind === "area" ? `profile-area-${field.key}` : undefined}
                  onChange={(event) => onChange(field.key, event.target.value)}
                  placeholder={field.placeholder}
                  value={value}
                />
                {field.kind === "area" ? (
                  <datalist id={`profile-area-${field.key}`}>
                    {campusAreaOptions.map((area) => (
                      <option key={area} value={area} />
                    ))}
                  </datalist>
                ) : null}
              </label>
            );
          })}
        </div>

        <div className="sheet-actions">
          <button className="ghost-button" onClick={onClose} type="button">
            取消
          </button>
          <button className="primary-button" disabled={hasMissingFields} type="submit">
            <CheckCircle2 size={16} />
            保存资料
          </button>
        </div>
      </form>
    </section>
  );
}

function CheckoutSheet({
  checkout,
  role,
  purchasePending,
  onClose,
  onDeliveryChange,
  onPaymentChange,
  onSubmit
}: {
  checkout: CheckoutState;
  role: Role;
  purchasePending: boolean;
  onClose: () => void;
  onDeliveryChange: (mode: DeliveryMode) => void;
  onPaymentChange: (method: PaymentMethod) => void;
  onSubmit: () => void;
}) {
  const availableModes = role === "parent" ? ["express" as DeliveryMode] : checkout.product.deliveryModes;
  const deliveryFee = getDeliveryFee(checkout.deliveryMode);
  const total = checkout.product.price + checkout.product.serviceFee + deliveryFee;

  return (
    <section className="checkout-sheet" aria-label="购买确认">
      <div className="sheet-backdrop" onClick={onClose} />
      <article className="sheet-panel">
        <div className="card-title">
          <ShoppingBag size={18} />
          <div>
            <strong>{checkout.product.title}</strong>
            <span>购买确认 · 产品金额 + 服务费/物流费</span>
          </div>
          <button className="icon-only" onClick={onClose} type="button" aria-label="关闭">
            <XCircle size={20} />
          </button>
        </div>
        <div className="sheet-section">
          <span>配送方式</span>
          <div className="segmented-control wrap">
            {availableModes.map((mode) => (
              <button className={checkout.deliveryMode === mode ? "active" : ""} key={mode} onClick={() => onDeliveryChange(mode)} type="button">
                {deliveryModeLabels[mode]}
              </button>
            ))}
          </div>
        </div>
        <div className="sheet-section">
          <span>付款方式</span>
          <div className="segmented-control wrap">
            {(["wechat", "alipay", "balance"] as PaymentMethod[]).map((method) => (
              <button className={checkout.paymentMethod === method ? "active" : ""} key={method} onClick={() => onPaymentChange(method)} type="button">
                {paymentMethodLabels[method]}
              </button>
            ))}
          </div>
        </div>
        <div className="price-breakdown">
          <span>商品 {formatCurrency(checkout.product.price)}</span>
          <span>服务费 {formatCurrency(checkout.product.serviceFee)}</span>
          <span>履约费 {formatCurrency(deliveryFee)}</span>
          <strong>合计 {formatCurrency(total)}</strong>
        </div>
        <button className="primary-button full" disabled={purchasePending} onClick={onSubmit} type="button">
          <CircleDollarSign size={16} />
          {purchasePending ? "提交中" : "提交支付"}
        </button>
      </article>
    </section>
  );
}

function MinePopover({
  role,
  profileName,
  accountStatus,
  creditScore,
  walletSummary,
  onClose,
  onLogout,
  onOpenTab,
  onNavigate
}: {
  role: Role;
  profileName: string;
  accountStatus: string;
  creditScore: number;
  walletSummary: WalletSummary;
  onClose: () => void;
  onLogout: () => void;
  onOpenTab: (tab: ClientModuleKey) => void;
  onNavigate: (surface: PageSurface) => void;
}) {
  const actions =
    role === "student"
      ? [
          { label: "狩猎", icon: Crosshair, action: () => onOpenTab("hunting") },
          { label: "发布", icon: Plus, action: () => onOpenTab("hunting") },
          { label: "余额", icon: WalletCards, action: () => onNavigate("wallet") },
          { label: "更多", icon: UserRound, action: () => onNavigate("mine") }
        ]
      : role === "merchant"
        ? [
            { label: "商品", icon: Plus, action: () => onOpenTab("merchantSales") },
            { label: "消息", icon: MessageCircle, action: () => onOpenTab("merchantSales") },
            { label: "余额", icon: WalletCards, action: () => onNavigate("wallet") },
            { label: "更多", icon: UserRound, action: () => onNavigate("mine") }
          ]
        : [
            { label: "家教", icon: GraduationCap, action: () => onOpenTab("tutor") },
            { label: "孩子", icon: UserRound, action: () => onNavigate("settings") },
            { label: "余额", icon: WalletCards, action: () => onNavigate("wallet") },
            { label: "更多", icon: UserRound, action: () => onNavigate("mine") }
          ];

  return (
    <section className="mine-popover" aria-label="我的快捷入口">
      <article className="popover-account">
        <div className="popover-avatar">
          <UserRound size={21} />
        </div>
        <div>
          <div className="popover-account-title">
            <strong>{profileName}</strong>
            <span>{roleLabels[role]}</span>
          </div>
          <p>{mineEntryLabels[role]}</p>
          <div className="popover-tags">
            <span>{accountStatus}</span>
            <span>信用值 {creditScore}</span>
          </div>
        </div>
        <button
          className="popover-logout"
          onClick={() => {
            onClose();
            onLogout();
          }}
          type="button"
        >
          <LogOut size={14} />
          退出
        </button>
      </article>

      <button
        className="popover-wallet-card"
        onClick={() => {
          onNavigate("wallet");
          onClose();
        }}
        type="button"
      >
        <span>
          <WalletCards size={18} />
          钱包
        </span>
        <strong>{walletSummary.withdrawable}</strong>
        <em>观察期 {walletSummary.observation} · 押金/保证金 {walletSummary.deposit}</em>
        <ChevronRight size={17} />
      </button>

      <strong>快捷入口</strong>
      <div className="popover-actions">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.label}
              onClick={() => {
                action.action();
                onClose();
              }}
              type="button"
            >
              <Icon size={16} />
              {action.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function BottomTabs({
  role,
  activeTab,
  onChange
}: {
  role: Role;
  activeTab: ClientModuleKey;
  onChange: (tab: ClientModuleKey) => void;
}) {
  return (
    <nav className="bottom-tabs" aria-label="H5 主导航">
      {clientPrimaryTabs[role].map((tab) => {
        const Icon = tabIcons[tab.key] ?? Home;
        return (
          <button className={activeTab === tab.key ? "active" : ""} key={tab.key} onClick={() => onChange(tab.key)} type="button">
            <Icon size={18} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function SectionHeader({ eyebrow, title, countText }: { eyebrow: string; title: string; countText: string }) {
  return (
    <section className="section-title">
      <div>
        <p>{eyebrow}</p>
        <h2>{title}</h2>
      </div>
      <span>{countText}</span>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function WorkbenchInfoCard({
  icon: Icon,
  title,
  description,
  metrics,
  variant = "default"
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  metrics: Array<{ label: string; value: string }>;
  variant?: "default" | "large";
}) {
  return (
    <article className="flow-card compact workbench-info-card">
      <div className="card-title">
        <Icon size={18} />
        <div>
          <strong>{title}</strong>
          <span>{description}</span>
        </div>
      </div>
      <div className={`metric-grid workbench-metric-grid ${variant === "large" ? "large" : ""}`}>
        {metrics.map((metric) => (
          <Metric key={metric.label} label={metric.label} value={metric.value} />
        ))}
      </div>
    </article>
  );
}

function WorkbenchQuickEntryCard({
  icon: Icon,
  title,
  description,
  entries
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  entries: Array<{ icon: LucideIcon; label: string; text: string }>;
}) {
  return (
    <article className="flow-card compact workbench-quick-card">
      <div className="card-title">
        <Icon size={18} />
        <div>
          <strong>{title}</strong>
          <span>{description}</span>
        </div>
      </div>
      <div className="quick-entry-grid workbench-quick-grid">
        {entries.map((entry) => (
          <QuickEntry icon={entry.icon} key={entry.label} label={entry.label} text={entry.text} />
        ))}
      </div>
    </article>
  );
}

function QuickEntry({ icon: Icon, label, text }: { icon: LucideIcon; label: string; text: string }) {
  return (
    <article className="quick-entry">
      <Icon size={18} />
      <div>
        <strong>{label}</strong>
        <span>{text}</span>
      </div>
    </article>
  );
}

function ProductListCard({
  role,
  product,
  purchasePending,
  onOpenCheckout
}: {
  role: Role;
  product: ProductSummary;
  purchasePending: boolean;
  onOpenCheckout: (product: ProductSummary) => void;
}) {
  const deliveryMode = getDefaultDeliveryMode(role, product);
  const deliveryFee = getDeliveryFee(deliveryMode);
  const payableAmount = product.price + product.serviceFee + deliveryFee;

  return (
    <article className="product-row">
      <div className="product-thumb">
        <ShoppingBag size={24} />
        <span>{product.category.slice(0, 4)}</span>
      </div>
      <div className="product-main">
        <div className="product-line">
          <div>
            <h3>{product.title}</h3>
            <p>{product.description}</p>
          </div>
          <strong>{formatCurrency(product.price)}</strong>
        </div>
        <div className="meta-line">
          <span>{product.source}</span>
          <span>{deliveryModeLabels[deliveryMode]}</span>
          <span>库存 {product.stock}</span>
          <span>{product.location}</span>
          <span>零售价 {formatCurrency(product.retailPrice)}</span>
        </div>
        <div className="product-actions">
          <span>合计 {formatCurrency(payableAmount)}</span>
          <div>
            <button className="ghost-button" type="button">
              <Heart size={15} /> 收藏
            </button>
            <button className="ghost-button" type="button">
              <AlertCircle size={15} /> 举报
            </button>
            <button
              className="primary-button"
              disabled={role === "merchant" || purchasePending}
              onClick={() => onOpenCheckout(product)}
              type="button"
            >
              <ShoppingBag size={15} />
              {role === "parent" ? "快递购买" : "购买/预约"}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function PartTimeJobCard({ job, mode }: { job: PartTimeJob; mode: "student" | "merchant" }) {
  if (mode === "merchant") {
    return (
      <article className="flow-card">
        <div className="card-title">
          <BriefcaseBusiness size={18} />
          <div>
            <strong>{job.title}</strong>
            <span>负责人：王店长 188****2201</span>
          </div>
          <em>{job.status}</em>
        </div>
        <p>{job.description}</p>
        <div className="meta-line">
          <span>人数 6</span>
          <span>{job.period}</span>
          <span>{job.requirement}</span>
          <span>{job.signRule}</span>
        </div>
        <div className="product-actions">
          <span>{job.fundingState}，可配置签到保证金。</span>
          <div>
            <button className="ghost-button" type="button">发布</button>
            <button className="ghost-button" type="button">取消发布</button>
            <button className="ghost-button" type="button">招募结束</button>
            <button className="primary-button" type="button">编辑</button>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="flow-card">
      <div className="card-title">
        <BriefcaseBusiness size={18} />
        <div>
          <strong>{job.title}</strong>
          <span>{job.publisher}</span>
        </div>
        <em>{formatCurrency(job.hourlyPay)}/时</em>
      </div>
      <p>{job.description}</p>
      <div className="meta-line">
        <span>{job.period}</span>
        <span>{job.location}</span>
        <span>{job.status}</span>
        <span>{job.fundingState}</span>
      </div>
      <div className="form-preview">
        {job.formFields.map((field) => (
          <span key={field}>{field}</span>
        ))}
      </div>
      <div className="product-actions">
        <span>{job.signRule}</span>
        <div>
          <button className="ghost-button" type="button">
            <ClipboardCheck size={15} /> 报名快照
          </button>
          <button className="primary-button" type="button">
            <CheckCircle2 size={15} /> 报名
          </button>
        </div>
      </div>
    </article>
  );
}

function MerchantProductCard({ product }: { product: MerchantProduct }) {
  return (
    <article className="flow-card">
      <div className="card-title">
        <Store size={18} />
        <div>
          <strong>{product.name}</strong>
          <span>{product.code} · {product.model}</span>
        </div>
        <em>{formatCurrency(product.price)}</em>
      </div>
      <div className="meta-line">
        <span>{product.category}</span>
        <span>库存 {product.stock}</span>
        <span>限购 {product.purchaseLimit}</span>
        <span>{product.status}</span>
        <span>{product.visible}</span>
      </div>
      <div className="product-actions">
        <span>商户发布商品交易责任边界为商户自售。</span>
        <div>
          <button className="ghost-button" type="button">上下架</button>
          <button className="ghost-button" type="button">隐藏</button>
          <button className="ghost-button" type="button">编辑</button>
          <button className="primary-button" type="button">价格</button>
        </div>
      </div>
    </article>
  );
}

function MineCard({ title, items }: { title: string; items: string[] }) {
  return (
    <article className="mine-card">
      <strong>{title}</strong>
      <div>
        {items.map((item) => (
          <button key={item} type="button">
            {item}
          </button>
        ))}
      </div>
    </article>
  );
}

function LoginScreen({
  initialRole,
  onLoginSuccess
}: {
  initialRole: Role;
  onLoginSuccess: (session: LoginResponse) => void;
}) {
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [loginRole, setLoginRole] = useState<Role>(initialRole);
  const [phone, setPhone] = useState("13800000000");
  const [code, setCode] = useState("123456");
  const [pendingRegisterSession, setPendingRegisterSession] = useState<LoginResponse | null>(null);
  const [registrationDraft, setRegistrationDraft] = useState<ProfileDraftState>({});
  const { hideMessage, showMessage, toast } = useMessageToast();
  const loginMutation = useClientLogin();
  const registerMutation = useClientRegister();
  const isAuthPending = loginMutation.isPending || registerMutation.isPending;

  function handleAuthModeChange(nextMode: AuthMode) {
    setAuthMode(nextMode);
    hideMessage();
    if (nextMode === "register" && phone === "13800000000") {
      setPhone("13700000000");
    }
    if (nextMode === "login" && phone === "13700000000") {
      setPhone("13800000000");
    }
  }

  function handleRegistrationDraftChange(key: string, value: string) {
    setRegistrationDraft((draft) => ({
      ...draft,
      [key]: value
    }));
  }

  function handleRegisterSuccess(session: LoginResponse) {
    const storedDraft = getStoredProfileDraft();
    const template = registrationProfileTemplates[session.role];
    const nextDraft = Object.fromEntries(template.fields.map((field) => [field.key, storedDraft[field.key] ?? ""]));

    setRegistrationDraft(nextDraft);
    setPendingRegisterSession(session);
    showMessage("注册成功，请补充资料或跳过后直接进入。", { type: "success" });
  }

  function completeRegistration(shouldSaveProfile: boolean) {
    if (!pendingRegisterSession) {
      return;
    }

    if (shouldSaveProfile) {
      setStoredProfileDraft({
        ...getStoredProfileDraft(),
        ...getFilledProfileDraft(registrationDraft)
      });
    }

    setStoredClientAuthSession(pendingRegisterSession);
    onLoginSuccess(pendingRegisterSession);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    hideMessage();

    if (!phonePattern.test(phone)) {
      showMessage("请输入正确的手机号", { type: "warning" });
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      showMessage("请输入 6 位验证码", { type: "warning" });
      return;
    }

    if (authMode === "register") {
      registerMutation.mutate(
        { phone, code, role: loginRole },
      {
        onSuccess: handleRegisterSuccess,
        onError: (error) => {
          showMessage(getErrorMessage(error, "注册失败，请稍后重试"), { type: "error" });
        }
      }
    );
      return;
    }

    loginMutation.mutate(
      { phone, code },
      {
        onSuccess: (session) => {
          setStoredClientAuthSession(session);
          onLoginSuccess(session);
        },
        onError: (error) => {
          showMessage(getErrorMessage(error, "登录失败，请稍后重试"), { type: "error" });
        }
      }
    );
  }

  if (pendingRegisterSession) {
    return (
      <main className="login-shell">
        <MessageToast onClose={hideMessage} toast={toast} />
        <section className="login-brand">
          <span>{clientPublishPlatformLabels.h5} · 注册资料补充</span>
          <h1>佚名</h1>
          <p>注册已完成，可以先补充关键信息，也可以跳过并直接进入主页面。</p>
        </section>
        <RegistrationProfileCompletion
          areaOptions={campusAreaOptions}
          draft={registrationDraft}
          onChange={handleRegistrationDraftChange}
          onSkip={() => completeRegistration(false)}
          onSubmit={() => completeRegistration(true)}
          roleLabel={roleLabels[pendingRegisterSession.role]}
          template={registrationProfileTemplates[pendingRegisterSession.role]}
        />
      </main>
    );
  }

  return (
    <main className="login-shell">
      <MessageToast onClose={hideMessage} toast={toast} />
      <section className="login-brand">
        <span>{clientPublishPlatformLabels.h5} · 本地真实接口联调</span>
        <h1>佚名</h1>
        <p>使用手机号和验证码登录；注册时选择学生、商户或家长身份，登录后按账号身份进入对应客户端。</p>
      </section>

      <LoginRegisterCard
        authMode={authMode}
        code={code}
        isAuthPending={isAuthPending}
        loginRole={loginRole}
        onAuthModeChange={handleAuthModeChange}
        onCodeChange={setCode}
        onFillDefaultCode={() => setCode("123456")}
        onPhoneChange={setPhone}
        onRoleChange={setLoginRole}
        onSubmit={handleSubmit}
        phone={phone}
        roles={roles}
      />
    </main>
  );
}

export function App() {
  const [authSession, setAuthSession] = useState<LoginResponse | null>(() => getStoredClientAuthSession());
  const [role, setRole] = useState<Role>(() => getStoredClientAuthSession()?.role ?? "student");
  const [activeTab, setActiveTab] = useState<ClientModuleKey>(() => getDefaultPrimaryTab(authSession?.role ?? "student"));
  const [pageStack, setPageStack] = useState<PageSurface[]>([]);
  const [isOngoingOpen, setIsOngoingOpen] = useState(false);
  const [isMineOpen, setIsMineOpen] = useState(false);
  const { hideMessage, showMessage, toast } = useMessageToast();
  const [productFilter, setProductFilter] = useState<ProductFilter>("selfRun");
  const [jobFilter, setJobFilter] = useState<JobFilter>("latest");
  const [tutorSort, setTutorSort] = useState<TutorSort>("recommended");
  const [isHuntingOnline, setIsHuntingOnline] = useState(false);
  const [checkout, setCheckout] = useState<CheckoutState | null>(null);
  const [profileDraft, setProfileDraft] = useState<ProfileDraftState>(() => getStoredProfileDraft());
  const [isProfileCompletionOpen, setIsProfileCompletionOpen] = useState(false);
  const isAuthenticated = authSession !== null;
  const { data: homeData, error: homeError, isLoading: isHomeLoading } = useClientHome(role, isAuthenticated);
  const { data: products = [], error: productsError, isLoading: isProductsLoading } = useProducts(role, isAuthenticated);
  const { data: workspaceResponse, error: workspaceError, isLoading: isWorkspaceLoading } = useClientWorkspace(role, isAuthenticated);
  const purchaseMutation = usePurchaseProduct();

  const roleOrders = useMemo(() => (workspaceResponse?.orders ?? []).filter((order) => order.role === role), [workspaceResponse?.orders, role]);
  const hasPaymentRisk = roleOrders.some((order) => order.risk === "payment");
  const activeDescription = clientPrimaryTabs[role].find((tab) => tab.key === activeTab)?.description ?? getRoleHint(role);
  const profileRequirement = getProfileRequirement(role, activeTab, profileDraft);
  const profileCompletionTemplate = getProfileRequirementTemplate(role, activeTab);
  const activePage = pageStack.length > 0 ? pageStack[pageStack.length - 1] : null;
  const dataError = homeError ?? productsError ?? workspaceError;
  const isInitialDataLoading = isHomeLoading || isWorkspaceLoading || (isProductsLoading && products.length === 0);

  function handleLoginSuccess(session: LoginResponse) {
    setAuthSession(session);
    setRole(session.role);
    setActiveTab(getDefaultPrimaryTab(session.role));
    setPageStack([]);
    setIsOngoingOpen(false);
    setIsMineOpen(false);
    setIsProfileCompletionOpen(false);
    setProfileDraft(getStoredProfileDraft());
    showMessage(session.profileCompletionRequired ? "登录成功，可稍后进入设置补充资料。" : "登录成功。", { type: "success" });
    setCheckout(null);
  }

  function handleLogout() {
    clearStoredClientAuthSession();
    setAuthSession(null);
    setRole("student");
    setActiveTab(getDefaultPrimaryTab("student"));
    setPageStack([]);
    setIsOngoingOpen(false);
    setIsMineOpen(false);
    setIsProfileCompletionOpen(false);
    hideMessage();
    setCheckout(null);
  }

  function handleOpenTab(tab: ClientModuleKey) {
    setActiveTab(tab);
    setPageStack([]);
    setIsOngoingOpen(false);
    setIsMineOpen(false);
    setIsProfileCompletionOpen(false);
  }

  function handleNavigate(page: PageSurface) {
    setPageStack((stack) => [...stack, page]);
    setIsMineOpen(false);
    setIsOngoingOpen(false);
    setIsProfileCompletionOpen(false);
  }

  function handleBack() {
    setPageStack((stack) => stack.slice(0, -1));
    setIsMineOpen(false);
    setIsProfileCompletionOpen(false);
  }

  function handleOpenCheckout(product: ProductSummary) {
    const featuredRequirement = getProfileRequirement(role, "featured", profileDraft);

    if (featuredRequirement) {
      showMessage(`请先补充${featuredRequirement.missingFields.map((field) => field.label).join("、")}`, { type: "warning" });
      setIsProfileCompletionOpen(true);
      return;
    }

    setCheckout({
      product,
      deliveryMode: getDefaultDeliveryMode(role, product),
      paymentMethod: "wechat"
    });
  }

  function handleProfileDraftChange(key: string, value: string) {
    setProfileDraft((draft) => ({
      ...draft,
      [key]: value
    }));
  }

  function handleSaveProfileDraft() {
    try {
      setStoredProfileDraft(profileDraft);
      setIsProfileCompletionOpen(false);
      showMessage("资料已保存，当前模块可以继续操作。", { type: "success" });
    } catch {
      showMessage("资料保存失败，请检查浏览器存储权限。", { type: "error" });
    }
  }

  function handleOpenProfileCompletion() {
    setIsMineOpen(false);
    setIsOngoingOpen(false);
    setIsProfileCompletionOpen(true);
  }

  function handleToggleHuntingOnline() {
    const huntingRequirement = getProfileRequirement(role, "hunting", profileDraft);

    if (huntingRequirement) {
      showMessage(`请先补充${huntingRequirement.missingFields.map((field) => field.label).join("、")}`, { type: "warning" });
      setIsProfileCompletionOpen(true);
      return;
    }

    setIsHuntingOnline((value) => !value);
  }

  function handleSubmitPurchase() {
    if (!checkout) {
      return;
    }

    purchaseMutation.mutate(
      {
        productId: checkout.product.id,
        role,
        deliveryMode: checkout.deliveryMode,
        paymentMethod: checkout.paymentMethod,
        quantity: 1
      },
      {
        onSuccess: (order) => {
          showMessage(`订单 ${order.orderId} 已创建，状态：${order.status}，应付 ${formatCurrency(order.payableAmount)}。`, {
            type: "success"
          });
          setCheckout(null);
          handleNavigate("orders");
        },
        onError: (error) => {
          showMessage(getErrorMessage(error, "购买失败，请稍后重试。"), { type: "error" });
        }
      }
    );
  }

  const profileName = homeData?.profile.name ?? roleLabels[role];
  const accountStatus = homeData ? accountStatusLabels[homeData.profile.accountStatus] : "正常";
  const creditScore = homeData?.profile.creditScore ?? 0;
  const pageMeta = activePage ? getPageMeta(activePage, role) : null;

  if (!isAuthenticated) {
    return <LoginScreen initialRole={role} onLoginSuccess={handleLoginSuccess} />;
  }

  if (dataError) {
    return (
      <main className="login-shell">
        <section className="login-card">
          <div className="card-title">
            <AlertCircle size={18} />
            <strong>真实接口连接失败</strong>
          </div>
          <p className="notice danger">{dataError instanceof Error ? dataError.message : "请检查后端服务和云数据库连接。"}</p>
          <button className="primary-button full" onClick={handleLogout} type="button">
            <LogOut size={16} />
            退出并重新登录
          </button>
        </section>
      </main>
    );
  }

  if (!homeData || !workspaceResponse || isInitialDataLoading) {
    return (
      <main className="login-shell">
        <section className="login-card">
          <div className="card-title">
            <ShieldCheck size={18} />
            <strong>正在加载云端真实数据</strong>
          </div>
          <p className="login-tip">正在读取 PostgreSQL 中的首页、商品、订单、钱包和工作台数据。</p>
        </section>
      </main>
    );
  }

  const workspaceData = workspaceResponse;

  return (
    <main className={`h5-shell${activePage ? " page-mode" : ""}`}>
      <MessageToast onClose={hideMessage} toast={toast} />
      {activePage && pageMeta ? (
        <PageShell eyebrow={pageMeta.eyebrow} onBack={handleBack} title={pageMeta.title}>
          {activePage === "mine" ? (
            <MineContent role={role} onNavigate={handleNavigate} />
          ) : activePage === "wallet" ? (
            <WalletContent walletRecords={workspaceData.walletRecords} walletSummary={workspaceData.walletSummary} />
          ) : activePage === "orders" ? (
            <OrdersContent orders={roleOrders} />
          ) : (
            <SettingsContent role={role} />
          )}
        </PageShell>
      ) : (
        <>
          <Header
            activeTab={activeTab}
            role={role}
          />

          <ProfileContextCard
            description={activeDescription}
            onOpenCompletion={handleOpenProfileCompletion}
            requirement={profileRequirement}
            role={role}
          />

          {activeTab === "featured" ? (
            <ProductModule
              isProductsLoading={isProductsLoading}
              onFilterChange={setProductFilter}
              onOpenCheckout={handleOpenCheckout}
              productFilter={productFilter}
              products={products}
              purchasePending={purchaseMutation.isPending}
              role={role}
            />
          ) : activeTab === "partTime" && role === "student" ? (
            <StudentPartTimeModule jobs={workspaceData.partTimeJobs} jobFilter={jobFilter} onJobFilterChange={setJobFilter} />
          ) : activeTab === "partTime" && role === "merchant" ? (
            <MerchantPartTimeModule dashboard={workspaceData.merchantDashboard} jobs={workspaceData.partTimeJobs} />
          ) : activeTab === "hunting" ? (
            <HuntingModule
              huntingSummary={workspaceData.huntingSummary}
              huntingTasks={workspaceData.huntingTasks}
              isOnline={isHuntingOnline}
              onToggleOnline={handleToggleHuntingOnline}
            />
          ) : activeTab === "merchantSales" ? (
            <MerchantSalesModule dashboard={workspaceData.merchantDashboard} merchantProducts={workspaceData.merchantProducts} />
          ) : activeTab === "marketing" ? (
            <MarketingModule />
          ) : activeTab === "tutor" ? (
            <TutorModule tutorDemands={workspaceData.tutorDemands} tutorSort={tutorSort} onTutorSortChange={setTutorSort} />
          ) : (
            <ProductModule
              isProductsLoading={isProductsLoading}
              onFilterChange={setProductFilter}
              onOpenCheckout={handleOpenCheckout}
              productFilter={productFilter}
              products={products}
              purchasePending={purchaseMutation.isPending}
              role={role}
            />
          )}

          {isMineOpen ? (
            <MinePopover
              accountStatus={accountStatus}
              creditScore={creditScore}
              onClose={() => setIsMineOpen(false)}
              onLogout={handleLogout}
              onNavigate={handleNavigate}
              onOpenTab={handleOpenTab}
              profileName={profileName}
              role={role}
              walletSummary={workspaceData.walletSummary}
            />
          ) : null}

          {roleOrders.length > 0 ? (
            <button
              className={`order-shortcut ${hasPaymentRisk ? "danger" : ""}`}
              onClick={() => {
                setIsOngoingOpen(true);
                setIsMineOpen(false);
              }}
              type="button"
            >
              <PackageCheck size={18} />
              {roleOrders.length}
            </button>
          ) : null}

          <button className="floating-avatar" onClick={() => setIsMineOpen((value) => !value)} type="button">
            <UserRound size={22} />
          </button>

          <BottomTabs role={role} activeTab={activeTab} onChange={handleOpenTab} />
        </>
      )}

      {isOngoingOpen ? (
        <OngoingOrdersDialog
          onClose={() => setIsOngoingOpen(false)}
          onOpenOrders={() => {
            setIsOngoingOpen(false);
            handleNavigate("orders");
          }}
          orders={roleOrders}
        />
      ) : null}

      {checkout ? (
        <CheckoutSheet
          checkout={checkout}
          onClose={() => setCheckout(null)}
          onDeliveryChange={(deliveryMode) => setCheckout((value) => (value ? { ...value, deliveryMode } : value))}
          onPaymentChange={(paymentMethod) => setCheckout((value) => (value ? { ...value, paymentMethod } : value))}
          onSubmit={handleSubmitPurchase}
          purchasePending={purchaseMutation.isPending}
          role={role}
        />
      ) : null}

      {isProfileCompletionOpen && profileCompletionTemplate ? (
        <ProfileCompletionDialog
          onChange={handleProfileDraftChange}
          onClose={() => setIsProfileCompletionOpen(false)}
          onSave={handleSaveProfileDraft}
          profileDraft={profileDraft}
          template={profileCompletionTemplate}
        />
      ) : null}
    </main>
  );
}
