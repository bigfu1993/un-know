import { Crosshair, ShieldCheck } from "lucide-react";
import {
  huntingCertificationStatusLabels,
  type HuntingCertificationCardData,
  type HuntingCertificationCardMode
} from "@components/HuntingCertificationCard/model";

/** 狩猎认证卡片属性。 */
export interface HuntingCertificationCardProps extends HuntingCertificationCardData {
  className?: string;
  mode: HuntingCertificationCardMode;
  onStartCertification?: () => void;
}

/** 狩猎资格认证卡片，供头像弹窗展示认证入口和审核状态。 */
export function HuntingCertificationCard({
  certificationStatus,
  className,
  mode,
  onStartCertification
}: HuntingCertificationCardProps) {
  const rootClassName = ["hunting-certification-card", `hunting-certification-card--${mode}`, className]
    .filter(Boolean)
    .join(" ");
  const statusText = huntingCertificationStatusLabels[certificationStatus];

  if (mode === "entry") {
    return (
      <button className={rootClassName} onClick={onStartCertification} type="button">
        <span className="hunting-certification-icon grid h-[40px] w-[40px] shrink-0 place-items-center">
          <Crosshair size={21} />
        </span>
        <span className="hunting-certification-main min-w-0">
          <strong>狩猎认证</strong>
        </span>
      </button>
    );
  }

  return (
    <article className={rootClassName}>
      <div className="hunting-certification-head flex items-center gap-[10px]">
        <span className="hunting-certification-icon grid h-[40px] w-[40px] shrink-0 place-items-center">
          <ShieldCheck size={21} />
        </span>
        <div className="hunting-certification-main min-w-0 flex-1">
          <strong>狩猎认证</strong>
          <em>
            {certificationStatus === "normal"
              ? "狩猎资格已通过，可进入委托模块上线。"
              : certificationStatus === "reviewing"
                ? "认证资料已提交，等待平台审核。"
                : "狩猎资格当前不可用。"}
          </em>
        </div>
        <span className={`hunting-certification-status hunting-certification-status--${certificationStatus}`}>
          {statusText}
        </span>
      </div>
    </article>
  );
}
