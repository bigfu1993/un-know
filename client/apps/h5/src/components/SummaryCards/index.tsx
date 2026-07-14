import "./index.less";
import { ChevronRight, UserRound, WalletCards } from "lucide-react";
import { formatCompactWalletAmount, getWalletTotalAmount, parseWalletBucketAmount } from "@tools/wallet";

/** 账户卡和钱包卡共用的展示密度。 */
export type SummaryCardVariant = "default" | "simple";

/** 汇总卡片指标列表字段。 */
interface SummaryCardField {
  label: string;
  value: string | number | undefined;
}

/** 可复用账户汇总卡片属性。 */
export interface AccountSummaryCardProps {
  accountStatus: string;
  birthday?: string;
  className?: string;
  creditScore: number;
  footerAction?: ReactNode;
  followerCount?: string | number;
  followingCount?: string | number;
  nickname: string;
  profileTags?: string[];
  phone?: string;
  roleLabel: string;
  trailingAction?: ReactNode;
  variant?: SummaryCardVariant;
}

/** 可复用钱包汇总卡片属性。 */
export interface WalletSummaryCardProps {
  className?: string;
  onOpen?: () => void;
  rechargeText?: string;
  status?: string;
  variant?: SummaryCardVariant;
  walletSummary: WalletSummary;
}

/** 将空卡片字段格式化为统一占位文案。 */
function getDisplayValue(value: string | number | undefined) {
  const normalizedValue = String(value ?? "").trim();
  return normalizedValue || "未填写";
}

/** 渲染账户和钱包卡共用的紧凑指标网格。 */
function SummaryFieldGrid({ fields }: { fields: SummaryCardField[] }) {
  if (fields.length === 0) {
    return null;
  }

  return (
    <div className="summary-card-fields grid gap-[8px]">
      {fields.map((field) => (
        <span key={field.label}>
          <em>{field.label}</em>
          <strong>{getDisplayValue(field.value)}</strong>
        </span>
      ))}
    </div>
  );
}

/** 钱包指标网格，充值项与余额容器保持同级视觉但仅展示居中文案。 */
function WalletFieldGrid({
  balanceField,
  detailFields,
  rechargeText
}: {
  balanceField: SummaryCardField;
  detailFields: SummaryCardField[];
  rechargeText: string;
}) {
  return (
    <div className="summary-card-fields wallet-summary-fields grid gap-[8px]">
      <span>
        <em>{balanceField.label}</em>
        <strong>{getDisplayValue(balanceField.value)}</strong>
      </span>
      <span className="wallet-recharge-action">{rechargeText}</span>
      {detailFields.map((field) => (
        <span key={field.label}>
          <em>{field.label}</em>
          <strong>{getDisplayValue(field.value)}</strong>
        </span>
      ))}
    </div>
  );
}

/** 我的页面和头像弹窗复用的账户汇总卡片。 */
export function AccountSummaryCard({
  accountStatus,
  birthday,
  className,
  creditScore,
  footerAction,
  followerCount = 0,
  followingCount = 0,
  nickname,
  profileTags = [],
  phone,
  roleLabel,
  trailingAction,
  variant = "default"
}: AccountSummaryCardProps) {
  const simpleFields: SummaryCardField[] = [];
  const defaultFields: SummaryCardField[] = [
    { label: "状态", value: accountStatus },
    { label: "角色", value: roleLabel },
    { label: "信用值", value: creditScore },
    { label: "手机号", value: phone },
    { label: "关注", value: followingCount },
    { label: "粉丝", value: followerCount },
    { label: "生日", value: birthday }
  ];
  const fields = variant === "simple" ? simpleFields : defaultFields;
  const rootClassName = ["account-summary-card", `account-summary-card--${variant}`, className].filter(Boolean).join(" ");

  return (
    <article className={rootClassName}>
      <div className="summary-card-head flex items-center gap-[10px]">
        <span className="summary-card-icon grid h-[40px] w-[40px] shrink-0 place-items-center">
          <UserRound size={21} />
        </span>
        <div className="summary-card-title min-w-0 flex-1">
          <strong>
            {getDisplayValue(nickname)}
            {profileTags.length > 0 ? (
              <span className="summary-profile-tags">
                {profileTags.map((tag) => (
                  <em key={tag}>{tag}</em>
                ))}
              </span>
            ) : null}
          </strong>
          <p className="summary-card-status-text">
            {variant === "simple" ? `${accountStatus} · ${roleLabel} · 信用值 ${creditScore}` : "账户核心信息"}
          </p>
        </div>
        {trailingAction ? <div className="summary-card-action shrink-0">{trailingAction}</div> : null}
      </div>
      <SummaryFieldGrid fields={fields} />
      {footerAction ? <div className="summary-card-footer">{footerAction}</div> : null}
    </article>
  );
}

/** 我的页面和头像弹窗复用的钱包汇总卡片。 */
export function WalletSummaryCard({
  className,
  onOpen,
  rechargeText = "充值",
  status = "正常",
  variant = "default",
  walletSummary
}: WalletSummaryCardProps) {
  const balanceField: SummaryCardField = {
    label: "可提现",
    value: formatCompactWalletAmount(parseWalletBucketAmount(walletSummary.withdrawable))
  };
  const detailFields: SummaryCardField[] =
    variant === "simple"
      ? []
      : [
          { label: "押金/保证金", value: walletSummary.deposit },
          { label: "提现账号", value: walletSummary.withdrawMethods }
        ];
  const rootClassName = ["wallet-summary-card", `wallet-summary-card--${variant}`, className].filter(Boolean).join(" ");
  const content = (
    <>
      <div className="summary-card-head flex items-center gap-[10px]">
        <span className="summary-card-icon grid h-[40px] w-[40px] shrink-0 place-items-center">
          <WalletCards size={21} />
        </span>
        <div className="summary-card-title min-w-0 flex-1">
          <strong>{getWalletTotalAmount(walletSummary)}</strong>
          <p className="summary-card-status-text">{status}</p>
        </div>
        {onOpen ? <ChevronRight className="summary-card-chevron shrink-0" size={17} /> : null}
      </div>
      <WalletFieldGrid balanceField={balanceField} detailFields={detailFields} rechargeText={rechargeText} />
    </>
  );

  if (onOpen) {
    return (
      <button className={rootClassName} onClick={onOpen} type="button">
        {content}
      </button>
    );
  }

  return <article className={rootClassName}>{content}</article>;
}
