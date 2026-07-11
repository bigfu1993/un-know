import { useGlobalUser } from "@h5/store/global";
import { HuntingCertificationCard } from "../HuntingCertificationCard";
import {
  getHuntingCertificationCardMode,
  getHuntingCertificationDataFromDraft
} from "../HuntingCertificationCard/model";
import { AccountSummaryCard, WalletSummaryCard } from "../SummaryCards";
import { TutorCard } from "../TutorCard";
import { getTutorCardDataFromDraft, getTutorCardMode } from "../TutorCard/model";

/**
 * App shell widgets: navigation chrome, profile context, secondary page shell, and mine shortcuts.
 * These components read global user context but never fetch business data directly.
 */
export function Header({ activeTab }: { activeTab: ClientModuleKey }) {
  const { role } = useGlobalUser();

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

/** Prompts users to complete required profile fields and opens the global completion dialog. */
export function ProfileContextCard({
  requirement,
  onOpenCompletion
}: {
  requirement: ProfileRequirement | null;
  onOpenCompletion: () => void;
}) {
  if (!requirement) {
    return null;
  }

  return (
    <section className="context-card needs-profile flex items-center justify-between gap-[12px] p-[12px]">
      <div className="context-card-main grid min-w-0 gap-[8px]">
        <strong>补充资料后继续使用</strong>
        <p>完善当前场景所需信息，可继续购买、报名或发布。</p>
      </div>
      <button
        className="context-action inline-flex min-h-[32px] shrink-0 items-center justify-center px-[10px] py-[7px] text-[13px] font-bold text-white"
        onClick={onOpenCompletion}
        type="button"
      >
        补充资料
      </button>
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
  walletSummary,
  onClose,
  onEditTutorSubject,
  onLogout,
  onOpenTutorCalendar,
  onOpenTab,
  onNavigate
}: {
  walletSummary: WalletSummary;
  onClose: () => void;
  onEditTutorSubject: () => void;
  onLogout: () => void;
  onOpenTutorCalendar: () => void;
  onOpenTab: (tab: ClientModuleKey) => void;
  onNavigate: (surface: PageSurface) => void;
}) {
  const { accountStatusText, creditScore, phone, profileDraft, profileName, role } = useGlobalUser();
  const tutorCardData = getTutorCardDataFromDraft(profileDraft);
  const tutorCardMode = getTutorCardMode(tutorCardData.certificationStatus, "simple");
  const huntingCertificationData = getHuntingCertificationDataFromDraft(profileDraft);
  const huntingCertificationMode = getHuntingCertificationCardMode(huntingCertificationData.certificationStatus);
  const actions =
    role === "student"
      ? [
          { label: "发布", icon: Plus, action: () => onOpenTab("hunting") },
          { label: "建议/投诉", icon: ClipboardCheck, action: () => onNavigate("mine") },
          { label: "更多", icon: UserRound, action: () => onNavigate("mine") }
        ]
      : role === "merchant"
        ? [
            { label: "商品", icon: Plus, action: () => onOpenTab("merchantSales") },
            { label: "消息", icon: MessageCircle, action: () => onOpenTab("merchantSales") },
            { label: "建议/投诉", icon: ClipboardCheck, action: () => onNavigate("mine") },
            { label: "更多", icon: UserRound, action: () => onNavigate("mine") }
          ]
        : [
            { label: "家教", icon: GraduationCap, action: () => onOpenTab("tutor") },
            { label: "孩子", icon: UserRound, action: () => onNavigate("settings") },
            { label: "建议/投诉", icon: ClipboardCheck, action: () => onNavigate("mine") },
            { label: "更多", icon: UserRound, action: () => onNavigate("mine") }
          ];

  return (
    <section
      className="mine-popover grid w-[min(360px,calc(100vw-28px))] gap-[12px] p-[12px]"
      aria-label="我的快捷入口"
    >
      <AccountSummaryCard
        accountStatus={accountStatusText}
        birthday={profileDraft.birthday}
        className="popover-account p-[10px]"
        creditScore={creditScore}
        followerCount={0}
        followingCount={0}
        nickname={profileName}
        phone={phone}
        roleLabel={roleLabels[role]}
        trailingAction={
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
        }
        variant="simple"
      />

      <WalletSummaryCard
        className="popover-wallet-card p-[10px]"
        onOpen={() => {
          onNavigate("wallet");
          onClose();
        }}
        walletSummary={walletSummary}
        variant="simple"
      />

      <TutorCard
        {...tutorCardData}
        className="popover-tutor-card p-[10px]"
        mode={tutorCardMode}
        onEditSubject={() => {
          onEditTutorSubject();
          onClose();
        }}
        onOpenCalendar={() => {
          onOpenTutorCalendar();
          onClose();
        }}
        onOpenMessages={() => {
          onNavigate("mine");
          onClose();
        }}
        onStartCertification={() => {
          onNavigate("tutorCertification");
          onClose();
        }}
      />

      {role === "student" ? (
        <HuntingCertificationCard
          {...huntingCertificationData}
          className="popover-hunting-certification-card p-[10px]"
          mode={huntingCertificationMode}
          onStartCertification={() => {
            onNavigate("huntingCertification");
            onClose();
          }}
        />
      ) : null}

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
  activeTab,
  onChange
}: {
  activeTab: ClientModuleKey;
  onChange: (tab: ClientModuleKey) => void;
}) {
  const { role } = useGlobalUser();

  return (
    <nav
      className="bottom-tabs mx-auto flex max-w-[540px] px-[10px] pb-[calc(7px+env(safe-area-inset-bottom))] pt-[7px]"
      aria-label="H5 主导航"
    >
      {clientPrimaryTabs[role].map((tab) => {
        const Icon = tabIcons[tab.key] ?? Home;
        const label = tab.key === "hunting" ? "委托" : tab.label;
        return (
          <button
            className={activeTab === tab.key ? "active" : ""}
            key={tab.key}
            onClick={() => onChange(tab.key)}
            type="button"
          >
            <Icon size={18} />
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
