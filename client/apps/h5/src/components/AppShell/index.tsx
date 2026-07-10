/**
 * App shell widgets: navigation chrome, profile context, secondary page shell, and mine shortcuts.
 * These components receive prepared data and never fetch business data directly.
 */
export function Header({ role, activeTab }: { role: Role; activeTab: ClientModuleKey }) {
  return (
    <section className="top-bar grid gap-[14px] p-[14px] text-white">
      <div className="top-title min-w-0">
        <p>{clientPublishPlatformLabels.h5} · 本地开发调试</p>
        <h1>{getTabTitle(role, activeTab)}</h1>
      </div>
      <div className="top-role-switch p-[9px]" aria-label="当前登录身份">
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

/** Shows scene-level missing profile fields and opens the global completion dialog. */
export function ProfileContextCard({
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
    <section
      className={`context-card flex items-start justify-between gap-[12px] p-[12px] ${requirement ? "needs-profile" : "profile-ready"}`}
    >
      <div className="context-card-main grid min-w-0 gap-[8px]">
        <strong>{getRoleHint(role)}</strong>
        <p>{description}</p>
        {requirement ? (
          <div className="context-missing flex flex-wrap items-center justify-between gap-[8px]">
            <span>
              <AlertCircle size={14} />
              缺少：{requirement.missingFields.map((field) => field.label).join("、")}
            </span>
            <button
              className="context-action inline-flex min-h-[32px] items-center justify-center px-[10px] py-[7px] text-[13px] font-bold text-white"
              onClick={onOpenCompletion}
              type="button"
            >
              补充资料
            </button>
          </div>
        ) : (
          <div className="context-ready inline-flex items-center gap-[5px] text-[13px] font-bold text-[#1d6f55]">
            <CheckCircle2 size={14} />
            <span>当前模块资料已补齐</span>
          </div>
        )}
      </div>
      {requirement ? <AlertCircle size={20} /> : <BadgeCheck size={20} />}
    </section>
  );
}

/** Shared wrapper for stack-based secondary pages such as wallet and orders. */
export function PageShell({
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
    <section className="page-view grid gap-[12px]">
      <header className="page-header grid items-center gap-[10px] p-[12px]">
        <button
          className="back-button grid h-[38px] w-[38px] place-items-center text-[#17212b]"
          onClick={onBack}
          type="button"
          aria-label="返回"
        >
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

/** Floating avatar popover for shortcuts; the full account center lives at /mine. */
export function MinePopover({
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
    <section
      className="mine-popover grid w-[min(360px,calc(100vw-28px))] gap-[12px] p-[12px]"
      aria-label="我的快捷入口"
    >
      <article className="popover-account grid items-center gap-[10px] p-[10px]">
        <div className="popover-avatar grid h-[40px] w-[40px] place-items-center">
          <UserRound size={21} />
        </div>
        <div className="min-w-0">
          <div className="popover-account-title flex min-w-0 items-center gap-[6px]">
            <strong>{profileName}</strong>
            <span>{roleLabels[role]}</span>
          </div>
          <p>{mineEntryLabels[role]}</p>
          <div className="popover-tags mt-[7px] flex flex-wrap gap-[5px]">
            <span>{accountStatus}</span>
            <span>信用值 {creditScore}</span>
          </div>
        </div>
        <button
          className="popover-logout inline-flex items-center justify-center gap-[4px] px-[8px] py-[7px] text-[12px] text-[#8a2534]"
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
        className="popover-wallet-card grid w-full items-center gap-[5px] p-[10px] pr-[34px] text-left"
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
        <em>
          观察期 {walletSummary.observation} · 押金/保证金 {walletSummary.deposit}
        </em>
        <ChevronRight size={17} />
      </button>

      <strong>快捷入口</strong>
      <div className="popover-actions grid gap-[7px]">
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

/** Primary module navigation for all roles; Mine intentionally remains a floating entry. */
export function BottomTabs({
  role,
  activeTab,
  onChange
}: {
  role: Role;
  activeTab: ClientModuleKey;
  onChange: (tab: ClientModuleKey) => void;
}) {
  return (
    <nav
      className="bottom-tabs mx-auto flex max-w-[540px] px-[10px] pb-[calc(7px+env(safe-area-inset-bottom))] pt-[7px]"
      aria-label="H5 主导航"
    >
      {clientPrimaryTabs[role].map((tab) => {
        const Icon = tabIcons[tab.key] ?? Home;
        return (
          <button
            className={activeTab === tab.key ? "active" : ""}
            key={tab.key}
            onClick={() => onChange(tab.key)}
            type="button"
          >
            <Icon size={18} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
