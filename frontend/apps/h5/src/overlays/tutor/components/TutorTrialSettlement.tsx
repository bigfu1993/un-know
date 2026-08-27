import { ReceiptText } from "lucide-react";

/** 家长端确认结束试课前的结算弹窗属性。 */
interface TutorTrialSettlementProps {
  candidate: TutorApplicationCandidate;
  isSubmitting?: boolean;
  mode?: "service" | "trial";
  onClose: () => void;
  onConfirm: (payload: TutorTrialSettlementPayload) => Promise<void> | void;
}

/** 家长端试课结算时可选的正式雇佣决策。 */
type TutorTrialHireDecision = "" | "hire" | "notHire";

/** 结算弹窗，试课结算可预选雇佣意向，正式服务结算只提交金额。 */
export function TutorTrialSettlement({
  candidate,
  isSubmitting = false,
  mode = "trial",
  onClose,
  onConfirm
}: TutorTrialSettlementProps) {
  const [trialFee, setTrialFee] = useState(candidate.trialFee === undefined ? "" : String(candidate.trialFee));
  const [hireDecision, setHireDecision] = useState<TutorTrialHireDecision>("");
  const isServiceMode = mode === "service";
  const feeValue = trialFee.trim() === "" ? Number.NaN : Number(trialFee);
  const isTrialFeeValid = Number.isFinite(feeValue) && feeValue >= 0;

  /** 切换结算时同步提交的正式雇佣意向，重复点击取消选择。 */
  function handleToggleHireDecision(nextDecision: Exclude<TutorTrialHireDecision, "">) {
    setHireDecision((currentDecision) => (currentDecision === nextDecision ? "" : nextDecision));
  }

  /** 校验试课结算金额并提交。 */
  function handleConfirm() {
    if (!isTrialFeeValid || isSubmitting) {
      return;
    }

    void onConfirm({
      hireTutor: isServiceMode || hireDecision === "" ? undefined : hireDecision === "hire",
      trialFee: Number(feeValue.toFixed(2))
    });
  }

  return (
    <Modal
      ariaLabel={isServiceMode ? "正式服务结算" : "试课结算"}
      icon={<ReceiptText size={18} />}
      onClose={onClose}
      panelClassName="tutor-trial-settlement-panel mx-auto grid max-w-[540px] gap-[12px] px-[14px] pb-[calc(16px+env(safe-area-inset-bottom))] pt-[16px]"
      title={
        <>
          <strong>{isServiceMode ? "正式服务结算" : "试课结算"}</strong>
          <span>{isServiceMode ? "确认金额后结束家教主任务" : "确认金额后等待学生确认费用"}</span>
        </>
      }
    >
      <div className="tutor-trial-settlement-summary grid gap-[8px]">
        <div className="flex items-center justify-between gap-[10px]">
          <span>{isServiceMode ? "家教学生" : "试课学生"}</span>
          <strong>{candidate.nickname}</strong>
        </div>
        <div className="grid gap-[5px]">
          <span>{isServiceMode ? "课程安排" : "试课安排"}</span>
          <p>
            {(isServiceMode ? candidate.serviceSchedule : candidate.trialSchedule) ||
              (isServiceMode ? "暂无课程安排" : "暂无试课安排")}
          </p>
        </div>
      </div>

      <label className="tutor-trial-settlement-field grid gap-[6px]">
        <span>{isServiceMode ? "结算金额" : "试课结算金额"}</span>
        <input
          inputMode="decimal"
          min="0"
          onChange={(event) => setTrialFee(event.target.value)}
          placeholder="请输入金额"
          step="0.01"
          type="number"
          value={trialFee}
        />
      </label>
      {!isTrialFeeValid && trialFee.trim() !== "" ? (
        <span className="tutor-trial-settlement-error">请输入不小于 0 的金额</span>
      ) : null}

      {!isServiceMode ? (
        <div className="tutor-trial-hire-decision grid gap-[8px]">
          <div className="tutor-trial-hire-decision__header grid gap-[3px]">
            <strong>是否正式雇佣</strong>
            <span>可不选择，仅提交结算；学生确认费用后再单独处理。</span>
          </div>
          <div className="tutor-trial-hire-decision__options grid grid-cols-2 gap-[8px]">
            <button
              className={`tutor-trial-hire-decision__option ${hireDecision === "hire" ? "active" : ""}`}
              disabled={isSubmitting}
              onClick={() => handleToggleHireDecision("hire")}
              type="button"
            >
              正式雇佣
            </button>
            <button
              className={`tutor-trial-hire-decision__option ${hireDecision === "notHire" ? "active danger" : ""}`}
              disabled={isSubmitting}
              onClick={() => handleToggleHireDecision("notHire")}
              type="button"
            >
              不正式雇佣
            </button>
          </div>
        </div>
      ) : null}

      <div className="sheet-actions grid grid-cols-2 gap-[8px]">
        <button
          className="ghost-button min-h-[38px] px-[10px] py-[8px]"
          disabled={isSubmitting}
          onClick={onClose}
          type="button"
        >
          取消
        </button>
        <button
          className="primary-button min-h-[38px] px-[10px] py-[8px] text-white disabled:text-[var(--h5-subtle)]"
          disabled={!isTrialFeeValid || isSubmitting}
          onClick={handleConfirm}
          type="button"
        >
          结算
        </button>
      </div>
    </Modal>
  );
}
