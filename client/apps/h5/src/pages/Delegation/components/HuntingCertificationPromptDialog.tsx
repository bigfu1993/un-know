import { Crosshair, ShieldAlert, XCircle } from "lucide-react";
import { huntingCertificationStatusLabels } from "@components/HuntingCertificationCard/model";

/** 狩猎认证提示弹窗属性。 */
interface HuntingCertificationPromptDialogProps {
  certificationStatus: HuntingCertificationStatus;
  onClose: () => void;
  onOpenCertification: () => void;
}

/** 未完成狩猎认证时的操作拦截提示。 */
export function HuntingCertificationPromptDialog({
  certificationStatus,
  onClose,
  onOpenCertification
}: HuntingCertificationPromptDialogProps) {
  return (
    <section className="checkout-sheet" aria-label="狩猎认证提醒">
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet-panel hunting-certification-prompt mx-auto grid max-w-[420px] gap-[12px] p-[14px]">
        <div className="card-title flex items-center justify-between gap-[10px]">
          <ShieldAlert size={18} />
          <div>
            <strong>需要完成狩猎认证</strong>
            <span>当前状态：{huntingCertificationStatusLabels[certificationStatus]}</span>
          </div>
          <button
            aria-label="关闭"
            className="icon-only grid h-[34px] w-[34px] place-items-center text-[#475466]"
            onClick={onClose}
            type="button"
          >
            <XCircle size={20} />
          </button>
        </div>
        <p className="m-0 text-[13px] leading-[1.55] text-[#657181]">
          联系发布方、接受委托和开启狩猎模式前，需要先完成狩猎认证。
        </p>
        <button
          className="primary-button inline-flex min-h-[38px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white"
          onClick={onOpenCertification}
          type="button"
        >
          <Crosshair size={16} />
          去认证
        </button>
      </div>
    </section>
  );
}
