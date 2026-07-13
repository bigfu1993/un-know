import { useGlobalUser } from "@h5/store/global";
import { OrderModuleCard } from "../../components/OrderModuleCard";
import { AccountSummaryCard, WalletSummaryCard } from "../../components/SummaryCards";
import { TutorCard } from "../../components/TutorCard";
import { getTutorCardDataFromDraft, getTutorCardMode } from "../../components/TutorCard/model";

/** 所有角色共用的账户中心页面，跨页面跳转由 App 统一承接。 */
export function Mine({
  onBack,
  onNavigate,
  onOpenTutorCertificationInfo,
  orders,
  walletSummary
}: {
  onBack: () => void;
  onNavigate: (surface: PageSurface) => void;
  onOpenTutorCertificationInfo: () => void;
  orders: ClientOrder[];
  walletSummary: WalletSummary;
}) {
  const { accountStatusText, creditScore, phone, profileDraft, profileName, role } = useGlobalUser();
  const tutorCardData = getTutorCardDataFromDraft(profileDraft);
  const tutorCardMode = getTutorCardMode(tutorCardData.certificationStatus, "default");
  const isStudent = role === "student";
  const isMerchant = role === "merchant";
  const tradeItems = isStudent
    ? ["我买到的", "我的发布", "狩猎记录", "我的兼职", "家教卡片", "投诉入口"]
    : isMerchant
      ? ["我卖出的", "我的兼职", "投诉入口"]
      : ["我买到的", "我的家教", "投诉入口"];
  const settingBinding = isStudent ? "家教资质/学生认证" : isMerchant ? "工商信息/门店/员工" : "孩子信息/多学科";

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
          followerCount={0}
          followingCount={0}
          nickname={profileName}
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
        <TutorCard
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
          variant="default"
        />
        <div className="mine-grid grid gap-[10px]">
          <MineCard title="我的交易" items={tradeItems} />
          <MineCard title="我的记录" items={isMerchant ? ["我的关注"] : ["我的收藏", "我的关注", "浏览历史"]} />
          <MineCard
            title="设置绑定"
            items={["账户信息", settingBinding, "收货地址", "平台协议", "版本&更新"]}
          />
        </div>
      </section>
    </section>
  );
}

function MineCard({ title, items }: { title: string; items: string[] }) {
  return (
    <article className="mine-card p-[12px]">
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
