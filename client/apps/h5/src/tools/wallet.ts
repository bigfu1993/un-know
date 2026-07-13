/** 钱包月份选项。 */
export interface WalletMonthOption {
  key: string;
  label: string;
}

/** 钱包月度汇总展示数据。 */
export interface WalletMonthlySummary {
  billCount: string;
  netChange: string;
  totalExpense: string;
  totalIncome: string;
}

/** 将钱包流水金额字符串解析为可汇总的数值，保留正负方向。 */
export function parseWalletRecordAmount(amount: string) {
  const sign = amount.includes("-") ? -1 : 1;
  const numericValue = Number(amount.replace(/[^\d.]/g, ""));

  return Number.isFinite(numericValue) ? sign * numericValue : 0;
}

/** 将钱包账户桶金额解析为资产总额数值，账户桶默认按正向资产累加。 */
export function parseWalletBucketAmount(amount: string | number | undefined) {
  const numericValue = Number(String(amount ?? "").replace(/[^\d.]/g, ""));

  return Number.isFinite(numericValue) ? numericValue : 0;
}

/** 将金额数值格式化为钱包统一展示文案。 */
export function formatWalletAmount(amount: number) {
  const sign = amount < 0 ? "-" : "";

  return `${sign}¥${Math.abs(amount).toFixed(2)}`;
}

/** 计算钱包总金额，包含可提现、观察期和押金/保证金。 */
export function getWalletTotalAmount(walletSummary: WalletSummary) {
  return formatWalletAmount(
    parseWalletBucketAmount(walletSummary.withdrawable) +
      parseWalletBucketAmount(walletSummary.observation) +
      parseWalletBucketAmount(walletSummary.deposit)
  );
}

/** 获取年月字符串，供原生月份选择和月度快捷列表共用。 */
export function getWalletMonthKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}

/** 生成最近半年的钱包月份选项。 */
export function getWalletMonthOptions(referenceDate = new Date()) {
  return Array.from({ length: 6 }, (_, index): WalletMonthOption => {
    const date = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - index, 1);
    const key = getWalletMonthKey(date);

    return {
      key,
      label: `${date.getFullYear()}年${date.getMonth() + 1}月`
    };
  });
}

/** 在后端流水日期字段上线前，为当前月份账单提供稳定的展示日期。 */
export function getWalletDisplayDate(monthKey: string, index: number) {
  const day = String(Math.min(28, index * 3 + 1)).padStart(2, "0");

  return `${monthKey}-${day}`;
}

/** 根据账单列表计算当前月份钱包汇总。 */
export function getWalletMonthlySummary(records: WalletRecord[]): WalletMonthlySummary {
  const totalIncome = records.reduce((sum, record) => {
    const amount = parseWalletRecordAmount(record.amount);

    return amount > 0 ? sum + amount : sum;
  }, 0);
  const totalExpense = records.reduce((sum, record) => {
    const amount = parseWalletRecordAmount(record.amount);

    return amount < 0 ? sum + Math.abs(amount) : sum;
  }, 0);

  return {
    billCount: `${records.length} 笔`,
    netChange: formatWalletAmount(totalIncome - totalExpense),
    totalExpense: formatWalletAmount(totalExpense),
    totalIncome: formatWalletAmount(totalIncome)
  };
}
