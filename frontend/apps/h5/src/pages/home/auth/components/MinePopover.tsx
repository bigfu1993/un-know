import { useGlobalUser } from "@h5/store/global";
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

/** 悬浮头像弹窗属性。 */
export interface MinePopoverProps {
  onClose: () => void;
  onLogout: () => void;
  onNavigate: (surface: PageSurface) => void;
  onOpenPublish: () => void;
  onOpenRecycle: () => void;
  onOpenTab: (tab: ClientModuleKey) => void;
  onOpenTutorCalendar: () => void;
  onToggleTutorExposure: () => void;
  walletSummary: WalletSummary;
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
}: MinePopoverProps) {
  const { accountStatusText, creditScore, phone, profileDraft, nickname, role } = useGlobalUser();
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
        nickname={nickname}
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
