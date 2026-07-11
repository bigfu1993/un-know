/** 钱包月份选项。 */
interface WalletMonthOption {
  key: string;
  label: string;
}

/** 将账单金额字符串解析为可汇总的数值。 */
function parseWalletAmount(amount: string) {
  const sign = amount.includes("-") ? -1 : 1;
  const numericValue = Number(amount.replace(/[^\d.]/g, ""));

  return Number.isFinite(numericValue) ? sign * numericValue : 0;
}

/** 将钱包账户桶金额解析为资产总额数值。 */
function parseWalletBucketAmount(amount: string) {
  const numericValue = Number(amount.replace(/[^\d.]/g, ""));

  return Number.isFinite(numericValue) ? numericValue : 0;
}

/** 将金额数值格式化为钱包账单统一展示。 */
function formatWalletAmount(amount: number) {
  const sign = amount < 0 ? "-" : "";

  return `${sign}¥${Math.abs(amount).toFixed(2)}`;
}

/** 计算钱包详情总览展示的总金额。 */
function getWalletTotalAmount(walletSummary: WalletSummary) {
  return formatWalletAmount(
    parseWalletBucketAmount(walletSummary.withdrawable) +
      parseWalletBucketAmount(walletSummary.observation) +
      parseWalletBucketAmount(walletSummary.deposit)
  );
}

/** 获取年月字符串，原生 month 输入和月度列表共用。 */
function getWalletMonthKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}

/** 生成最近半年的月份选项。 */
function getWalletMonthOptions() {
  const now = new Date();

  return Array.from({ length: 6 }, (_, index): WalletMonthOption => {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    const key = getWalletMonthKey(date);

    return {
      key,
      label: `${date.getFullYear()}年${date.getMonth() + 1}月`
    };
  });
}

/** 在后端流水日期字段上线前，为当前月份账单提供稳定的展示日期。 */
function getWalletDisplayDate(monthKey: string, index: number) {
  const day = String(Math.min(28, index * 3 + 1)).padStart(2, "0");

  return `${monthKey}-${day}`;
}

/** 根据当前账单列表计算月度汇总。 */
function getWalletMonthlySummary(records: WalletRecord[]) {
  const totalIncome = records.reduce((sum, record) => {
    const amount = parseWalletAmount(record.amount);

    return amount > 0 ? sum + amount : sum;
  }, 0);
  const totalExpense = records.reduce((sum, record) => {
    const amount = parseWalletAmount(record.amount);

    return amount < 0 ? sum + Math.abs(amount) : sum;
  }, 0);

  return {
    billCount: `${records.length} 笔`,
    netChange: formatWalletAmount(totalIncome - totalExpense),
    totalExpense: formatWalletAmount(totalExpense),
    totalIncome: formatWalletAmount(totalIncome)
  };
}

/** Wallet route: displays monthly summary data and bill records. */
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
