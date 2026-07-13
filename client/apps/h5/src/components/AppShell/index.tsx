import { useGlobalUser } from "@h5/store/global";
import type { LucideIcon } from "lucide-react";
import { HuntingCertificationCard } from "@components/HuntingCertificationCard";
import {
  getHuntingCertificationCardMode,
  getHuntingCertificationDataFromDraft
} from "@components/HuntingCertificationCard/model";
import { AccountSummaryCard, WalletSummaryCard } from "@components/SummaryCards";
import { TutorCard } from "@components/TutorCard";
import { getTutorCardDataFromDraft, getTutorCardMode } from "@components/TutorCard/model";

/** 头像弹窗快捷入口的视觉强调类型。 */
type MinePopoverActionTone = "default" | "publish" | "recycle";

/** 头像弹窗快捷入口配置。 */
interface MinePopoverAction {
  action: () => void;
  icon: LucideIcon;
  label: string;
  tone?: MinePopoverActionTone;
}

/** App 外壳组件集合，负责导航、资料提示、次级页壳和我的弹窗快捷入口。 */
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

/** 资料缺失提示卡，仅展示补充提示和入口，不展示资料详情。 */
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

/** 栈式次级页面共用容器，例如钱包、订单和认证页面。 */
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

/** 悬浮头像弹窗，承接账户概览、认证入口和快捷操作。 */
export function MinePopover({
  walletSummary,
  onClose,
  onLogout,
  onOpenPublish,
  onOpenRecycle,
  onOpenTutorCalendar,
  onOpenTab,
  onToggleTutorExposure,
  onNavigate
}: {
  walletSummary: WalletSummary;
  onClose: () => void;
  onLogout: () => void;
  onOpenPublish: () => void;
  onOpenRecycle: () => void;
  onOpenTutorCalendar: () => void;
  onOpenTab: (tab: ClientModuleKey) => void;
  onToggleTutorExposure: () => void;
  onNavigate: (surface: PageSurface) => void;
}) {
  const { accountStatusText, creditScore, phone, profileDraft, profileName, role } = useGlobalUser();
  const tutorCardData = getTutorCardDataFromDraft(profileDraft);
  const tutorCardMode = getTutorCardMode(tutorCardData.certificationStatus, "simple");
  const huntingCertificationData = getHuntingCertificationDataFromDraft(profileDraft);
  const huntingCertificationMode = getHuntingCertificationCardMode(huntingCertificationData.certificationStatus);
  const profileTags = [
    tutorCardData.certificationStatus === "normal" ? "家教" : "",
    role === "student" && huntingCertificationData.certificationStatus === "normal" ? "狩猎" : ""
  ].filter(Boolean);
  const shouldShowTutorCertificationCard = role === "student" && tutorCardData.certificationStatus !== "normal";
  const shouldShowHuntingCertificationCard =
    role === "student" && huntingCertificationData.certificationStatus !== "normal";
  const isTutorExposureEnabled = profileDraft.tutorExposureEnabled === "true";
  const isCompactCertificationRow =
    tutorCardMode === "entry" && huntingCertificationMode === "entry" && shouldShowHuntingCertificationCard;
  const certifiedTutorActions: MinePopoverAction[] =
    tutorCardData.certificationStatus === "normal"
      ? [{ label: "家教日程", icon: CalendarClock, action: onOpenTutorCalendar }]
      : [];
  const actions: MinePopoverAction[] =
    role === "student"
      ? [
          { label: "发布", icon: Plus, action: onOpenPublish, tone: "publish" },
          { label: "回收", icon: PackageCheck, action: onOpenRecycle, tone: "recycle" },
          ...certifiedTutorActions,
          { label: "消息", icon: MessageCircle, action: () => onNavigate("mine") },
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
            { label: "发布", icon: Plus, action: onOpenPublish, tone: "publish" },
            { label: "家教日程", icon: CalendarClock, action: onOpenTutorCalendar },
            { label: "孩子", icon: UserRound, action: () => onNavigate("settings") },
            { label: "消息", icon: MessageCircle, action: () => onNavigate("mine") },
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
        profileTags={profileTags}
        roleLabel={roleLabels[role]}
        trailingAction={
          <button
            className="account-logout-button inline-flex items-center gap-[4px] px-[8px] py-[6px] text-[12px] font-bold"
            onClick={() => {
              onLogout();
              onClose();
            }}
            type="button"
          >
            <LogOut size={14} />
            退出
          </button>
        }
        footerAction={
          tutorCardData.certificationStatus === "normal" ? (
            <button
              className={`tutor-exposure-switch ${isTutorExposureEnabled ? "active" : ""}`}
              onClick={onToggleTutorExposure}
              type="button"
            >
              <span>家教开关</span>
              <strong>{isTutorExposureEnabled ? "已开启" : "未开启"}</strong>
            </button>
          ) : null
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

      {shouldShowTutorCertificationCard || shouldShowHuntingCertificationCard ? (
        <div
          className={`popover-certification-cards grid gap-[8px] ${
            isCompactCertificationRow ? "compact-row" : ""
          }`}
        >
          {shouldShowTutorCertificationCard ? (
            <TutorCard
              {...tutorCardData}
              className="popover-tutor-card p-[10px]"
              mode={tutorCardMode}
              onStartCertification={() => {
                onNavigate("tutorCertification");
                onClose();
              }}
            />
          ) : null}

          {shouldShowHuntingCertificationCard ? (
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
        </div>
      ) : null}

      <strong>快捷入口</strong>
      <div className="popover-actions grid gap-[7px]">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              className={`popover-action popover-action--${action.tone ?? "default"}`}
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

/** 底部主导航，所有角色共用，我的入口固定由悬浮头像承接。 */
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
