import "./index.less";
import { usePublishOverlayActions } from "@h5/overlays/publish/context";
import { useGlobalUser } from "@h5/globalProvider";

/** App 外壳组件集合，负责导航、资料提示和次级页壳。 */
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
        <div className="top-role-switch-value">
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
          className="back-button grid h-[38px] w-[38px] place-items-center text-[var(--h5-text)]"
          onClick={onBack}
          type="button"
          aria-label="返回"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="page-shell-header-copy">
          <span>{eyebrow}</span>
          <strong>{title}</strong>
        </div>
      </header>
      {children}
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
  const { openDefaultPublishInfo } = usePublishOverlayActions();
  const { role } = useGlobalUser();

  return (
    <nav
      className="bottom-tabs mx-auto flex max-w-[540px] px-[10px] pb-[calc(7px+env(safe-area-inset-bottom))] pt-[7px]"
      aria-label="H5 主导航"
    >
      {clientPrimaryTabs[role].map((tab) => {
        const isActiveTutorTab = tab.key === "tutor" && activeTab === "tutor";
        const Icon = isActiveTutorTab ? Plus : (tabIcons[tab.key] ?? Home);
        const label = isActiveTutorTab ? "发布家教" : tab.key === "hunting" ? "委托" : tab.label;
        return (
          <button
            className={[activeTab === tab.key ? "active" : "", isActiveTutorTab ? "publish-tab" : ""]
              .filter(Boolean)
              .join(" ")}
            key={tab.key}
            onClick={() => {
              if (isActiveTutorTab) {
                openDefaultPublishInfo();
                return;
              }

              onChange(tab.key);
            }}
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
