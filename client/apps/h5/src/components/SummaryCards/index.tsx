import { ChevronRight, UserRound, WalletCards } from "lucide-react";
import type { ReactNode } from "react";

/** Visual density options shared by account and wallet summary cards. */
export type SummaryCardVariant = "default" | "simple";

/** Display field rendered in summary card metric lists. */
interface SummaryCardField {
  label: string;
  value: string | number | undefined;
}

/** Props for the reusable account summary card. */
export interface AccountSummaryCardProps {
  accountStatus: string;
  birthday?: string;
  className?: string;
  creditScore: number;
  followerCount?: string | number;
  followingCount?: string | number;
  nickname: string;
  phone?: string;
  roleLabel: string;
  trailingAction?: ReactNode;
  variant?: SummaryCardVariant;
}

/** Props for the reusable wallet summary card. */
export interface WalletSummaryCardProps {
  className?: string;
  onOpen?: () => void;
  rechargeText?: string;
  status?: string;
  variant?: SummaryCardVariant;
  walletSummary: WalletSummary;
}

/** Formats empty card values with a consistent placeholder. */
function getDisplayValue(value: string | number | undefined) {
  const normalizedValue = String(value ?? "").trim();
  return normalizedValue || "未填写";
}

/** Renders a compact metric grid for reusable summary cards. */
function SummaryFieldGrid({ fields }: { fields: SummaryCardField[] }) {
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

/** Account summary card used by the full mine page and the avatar popover. */
export function AccountSummaryCard({
  accountStatus,
  birthday,
  className,
  creditScore,
  followerCount = 0,
  followingCount = 0,
  nickname,
  phone,
  roleLabel,
  trailingAction,
  variant = "default"
}: AccountSummaryCardProps) {
  const simpleFields: SummaryCardField[] = [
    { label: "状态", value: accountStatus },
    { label: "角色", value: roleLabel },
    { label: "信用值", value: creditScore }
  ];
  const defaultFields: SummaryCardField[] = [
    ...simpleFields,
    { label: "手机号", value: phone },
    { label: "关注", value: followingCount },
    { label: "粉丝", value: followerCount },
    { label: "生日", value: birthday }
  ];
  const fields = variant === "simple" ? simpleFields : defaultFields;
  const rootClassName = ["account-summary-card", `account-summary-card--${variant}`, className].filter(Boolean).join(" ");

  return (
    <article className={rootClassName}>
      <div className="summary-card-head flex items-start gap-[10px]">
        <span className="summary-card-icon grid h-[40px] w-[40px] shrink-0 place-items-center">
          <UserRound size={21} />
        </span>
        <div className="summary-card-title min-w-0 flex-1">
          <strong>{getDisplayValue(nickname)}</strong>
          <p>{variant === "simple" ? `${accountStatus} · ${roleLabel}` : "账户核心信息"}</p>
        </div>
        {trailingAction ? <div className="summary-card-action shrink-0">{trailingAction}</div> : null}
      </div>
      <SummaryFieldGrid fields={fields} />
    </article>
  );
}

/** Wallet summary card used by the full mine page and the avatar popover. */
export function WalletSummaryCard({
  className,
  onOpen,
  rechargeText = "去充值",
  status = "正常",
  variant = "default",
  walletSummary
}: WalletSummaryCardProps) {
  const simpleFields: SummaryCardField[] = [
    { label: "钱包状态", value: status },
    { label: "余额", value: walletSummary.withdrawable },
    { label: "观察期", value: walletSummary.observation },
    { label: "充值", value: rechargeText }
  ];
  const defaultFields: SummaryCardField[] = [
    ...simpleFields,
    { label: "押金/保证金", value: walletSummary.deposit },
    { label: "提现账号", value: walletSummary.withdrawMethods }
  ];
  const fields = variant === "simple" ? simpleFields : defaultFields;
  const rootClassName = ["wallet-summary-card", `wallet-summary-card--${variant}`, className].filter(Boolean).join(" ");
  const content = (
    <>
      <div className="summary-card-head flex items-start gap-[10px]">
        <span className="summary-card-icon grid h-[40px] w-[40px] shrink-0 place-items-center">
          <WalletCards size={21} />
        </span>
        <div className="summary-card-title min-w-0 flex-1">
          <strong>{getDisplayValue(walletSummary.withdrawable)}</strong>
          <p>{status} · 观察期 {getDisplayValue(walletSummary.observation)}</p>
        </div>
        {onOpen ? <ChevronRight className="summary-card-chevron shrink-0" size={17} /> : null}
      </div>
      <SummaryFieldGrid fields={fields} />
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
