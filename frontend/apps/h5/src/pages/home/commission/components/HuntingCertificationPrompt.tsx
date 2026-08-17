import { Crosshair, ShieldAlert } from "lucide-react";

/** 狩猎认证提示弹窗属性。 */
interface HuntingCertificationPromptProps {
  certificationStatus: HuntingCertificationStatus;
  onClose: () => void;
  onOpenCertification: () => void;
}

/** 未完成狩猎认证时的操作拦截提示。 */
export function HuntingCertificationPrompt({
  certificationStatus,
  onClose,
  onOpenCertification
}: HuntingCertificationPromptProps) {
  return (
    <Modal
      ariaLabel="狩猎认证提醒"
      icon={<ShieldAlert size={18} />}
      onClose={onClose}
      panelClassName="hunting-certification-prompt mx-auto grid max-w-[420px] gap-[12px] p-[14px]"
      panelElement="div"
      title={
        <>
          <strong>需要完成狩猎认证</strong>
          <span>当前状态：{huntingCertificationStatusLabels[certificationStatus]}</span>
        </>
      }
    >
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
    </Modal>
  );
}
