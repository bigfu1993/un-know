import "./index.less";
import {
  getWalletDisplayDate,
  getWalletMonthKey,
  getWalletMonthOptions,
  getWalletMonthlySummary,
  getWalletTotalAmount
} from "@tools/wallet";

/** 钱包页面，展示月度汇总、月份选择和账单列表。 */
export function Wallet({
  walletRecords,
  walletSummary
}: {
  walletRecords: WalletRecord[];
  walletSummary: WalletSummary;
}) {
  const monthOptions = useMemo(() => getWalletMonthOptions(), []);
  const currentMonthKey = monthOptions[0]?.key ?? getWalletMonthKey(new Date());
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);
  const selectedMonthLabel =
    monthOptions.find((monthOption) => monthOption.key === selectedMonth)?.label ?? selectedMonth;
  const monthlySummary = getWalletMonthlySummary(walletRecords);

  return (
    <section className="module-stack wallet-detail grid gap-[10px]">
      <SectionHeader countText={selectedMonthLabel} eyebrow="月度汇总 + 账单列表" title="钱包详情" />
      <article className="wallet-month-selector flow-card compact p-[12px]">
        <label className="wallet-month-input grid gap-[7px]">
          <span>选择月份</span>
          <input
            max={currentMonthKey}
            onChange={(event) => setSelectedMonth(event.target.value || currentMonthKey)}
            type="month"
            value={selectedMonth}
          />
        </label>
        <div className="segmented-control wrap mt-[10px] flex gap-[8px]">
          {monthOptions.slice(0, 3).map((monthOption) => (
            <button
              className={monthOption.key === selectedMonth ? "active" : ""}
              key={monthOption.key}
              onClick={() => setSelectedMonth(monthOption.key)}
              type="button"
            >
              {monthOption.label.replace(new Date().getFullYear().toString(), "")}
            </button>
          ))}
        </div>
      </article>

      <div className="metric-grid wallet-monthly-grid grid gap-[8px]">
        <Metric label="本月收入" value={monthlySummary.totalIncome} />
        <Metric label="本月支出" value={monthlySummary.totalExpense} />
        <Metric label="净变动" value={monthlySummary.netChange} />
        <Metric label="账单数量" value={monthlySummary.billCount} />
      </div>

      <article className="flow-card wallet-balance-overview p-[12px]">
        <div className="card-title flex items-center justify-between gap-[10px]">
          <WalletCards size={18} />
          <div>
            <strong>{getWalletTotalAmount(walletSummary)}</strong>
            <span>当前总金额 · {walletSummary.withdrawMethods}</span>
          </div>
        </div>
      </article>

      <SectionHeader countText={`${walletRecords.length} 笔`} eyebrow={selectedMonthLabel} title="账单列表" />
      <div className="card-list grid gap-[10px]">
        {walletRecords.map((record, index) => (
          <article className="wallet-row flex items-center justify-between gap-[12px] p-[12px]" key={record.id}>
            <div>
              <strong>{record.title}</strong>
              <span>
                {getWalletDisplayDate(selectedMonth, index)} · {record.type} · {record.status}
              </span>
            </div>
            <em>{record.amount}</em>
          </article>
        ))}
      </div>
    </section>
  );
}
