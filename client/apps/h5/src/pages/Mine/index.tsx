/** Account center route for all roles; cross-page navigation is delegated back to App. */
export function Mine({
  role,
  onBack,
  onNavigate
}: {
  role: Role;
  onBack: () => void;
  onNavigate: (surface: PageSurface) => void;
}) {
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
        <article className="mine-account grid gap-[12px] p-[14px] pr-[54px]">
          <button
            className="settings-icon grid h-[34px] w-[34px] place-items-center text-[#475466]"
            onClick={() => onNavigate("settings")}
            type="button"
            aria-label="设置"
          >
            <Settings size={20} />
          </button>
          <div>
            <strong>{roleLabels[role]}账户</strong>
            <p>
              认证标签：{isMerchant ? "商户认证通过" : isStudent ? "学生认证通过" : "家长资料待完善"} · 信用值{" "}
              {isStudent ? "10" : "0"}
            </p>
          </div>
          <button
            className="ghost-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-[#475466]"
            onClick={() => onNavigate("wallet")}
            type="button"
          >
            <WalletCards size={15} /> 钱包详情
          </button>
        </article>
        <div className="mine-grid grid gap-[10px]">
          <MineCard title="我的交易" items={tradeItems} />
          <MineCard title="我的记录" items={isMerchant ? ["我的关注"] : ["我的收藏", "我的关注", "浏览历史"]} />
          <MineCard
            title="设置绑定"
            items={["账户信息", settingBinding, "收货地址", "平台协议", "版本&更新", "建议"]}
          />
        </div>
        <article className="flow-card p-[14px]">
          <div className="card-title flex items-center justify-between gap-[10px]">
            <CalendarClock size={18} />
            <strong>进行中的列表卡片</strong>
          </div>
          <div className="status-flow mt-[10px] grid gap-[8px] text-center">
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
