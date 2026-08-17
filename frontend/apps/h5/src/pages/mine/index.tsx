import "./index.less";
import { useGlobalUser } from "@h5/store/global";

/** 所有角色共用的账户中心页面，跨页面跳转由 App 统一承接。 */
export function Mine({
  onBack,
  onLogout,
  onNavigate,
  onOpenTutorCertificationInfo,
  orders,
  walletSummary
}: {
  onBack: () => void;
  onLogout: () => void;
  onNavigate: (surface: PageSurface) => void;
  onOpenTutorCertificationInfo: () => void;
  orders: ClientOrder[];
  walletSummary: WalletSummary;
}) {
  const { accountStatusText, creditScore, phone, profileDraft, nickname, role } = useGlobalUser();
  const tutorCardData = getTutorCardDataFromDraft(profileDraft);
  const tutorCardMode = getTutorCardMode(tutorCardData.certificationStatus, "default");
  const isMerchant = role === "merchant";
  const recordItems = isMerchant ? ["我的关注"] : ["我的收藏", "我的关注", "浏览历史"];
  const feedbackItems = ["投诉", "建议"];

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
        <div className="mine-header-copy">
          <span>{mineEntryLabels[role]}</span>
          <strong>我的</strong>
        </div>
      </header>

      <section className="module-stack grid gap-[10px]">
        <SectionHeader countText="独立页面" eyebrow={mineEntryLabels[role]} title="账户中心" />
        <AccountSummaryCard
          accountStatus={accountStatusText}
          birthday={profileDraft.birthday}
          className="mine-account p-[14px]"
          creditScore={creditScore}
          nickname={nickname}
          phone={phone}
          roleLabel={roleLabels[role]}
          trailingAction={
            <button
              className="settings-icon grid h-[34px] w-[34px] place-items-center text-[#475466]"
              onClick={() => onNavigate("settings")}
              type="button"
              aria-label="设置"
            >
              <Settings size={20} />
            </button>
          }
        />
        <WalletSummaryCard
          className="mine-wallet-card p-[14px]"
          onOpen={() => onNavigate("wallet")}
          walletSummary={walletSummary}
        />
        <TutorCertificationCard
          {...tutorCardData}
          className="mine-tutor-card p-[14px]"
          mode={tutorCardMode}
          onOpenInfo={onOpenTutorCertificationInfo}
          onStartCertification={() => onNavigate("tutorCertification")}
        />
        <OrderModuleCard
          className="mine-order-card p-[14px]"
          onOpen={() => onNavigate("orders")}
          orders={orders}
        />
        <div className="mine-grid grid gap-[10px]">
          <MineCard title="我的记录" items={recordItems} />
          <MineCard title="投诉建议" items={feedbackItems} />
        </div>
        <button className="mine-logout-button" onClick={onLogout} type="button">
          退出登录
        </button>
      </section>
    </section>
  );
}

function MineCard({ title, items }: { title: string; items: string[] }) {
  return (
    <article className="mine-card p-[12px]">
      <strong>{title}</strong>
      <div className="mine-card-actions">
        {items.map((item) => (
          <button key={item} type="button">
            {item}
          </button>
        ))}
      </div>
    </article>
  );
}
