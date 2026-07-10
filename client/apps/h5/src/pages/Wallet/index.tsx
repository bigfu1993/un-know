/** Wallet route: displays account buckets and ledger records prepared by workspace data. */
export function Wallet({
  walletRecords,
  walletSummary
}: {
  walletRecords: WalletRecord[];
  walletSummary: WalletSummary;
}) {
  return (
    <section className="module-stack grid gap-[10px]">
      <SectionHeader countText="支持类型筛选" eyebrow="可提现钱包 + 观察期/保护期账户" title="账户资金" />
      <div className="metric-grid grid gap-[8px]">
        <Metric label="可提现" value={walletSummary.withdrawable} />
        <Metric label="观察期" value={walletSummary.observation} />
        <Metric label="押金/保证金" value={walletSummary.deposit} />
        <Metric label="提现方式" value={walletSummary.withdrawMethods} />
      </div>
      <div className="segmented-control wrap my-[12px] flex gap-[8px]">
        {["全部", "购买", "退款", "押金", "观察期", "提现"].map((item) => (
          <button className={item === "全部" ? "active" : ""} key={item} type="button">
            {item}
          </button>
        ))}
      </div>
      <div className="card-list grid gap-[10px]">
        {walletRecords.map((record) => (
          <article className="wallet-row flex items-center justify-between gap-[12px] p-[12px]" key={record.id}>
            <div>
              <strong>{record.title}</strong>
              <span>
                {record.type} · {record.status}
              </span>
            </div>
            <em>{record.amount}</em>
          </article>
        ))}
      </div>
    </section>
  );
}
