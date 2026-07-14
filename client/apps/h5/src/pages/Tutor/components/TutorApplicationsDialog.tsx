/** 家长端试课申请列表弹窗属性。 */
interface TutorApplicationsDialogProps {
  candidates: TutorApplicationCandidate[];
  isConfirming?: boolean;
  onClose: () => void;
  onConfirm: (payload: {
    applicationId: string;
    demandId: string;
    trialEnd: string;
    trialHalfDay: string;
    trialStart: string;
  }) => void;
}

/** 家长端选择试课家教并确认试课时间。 */
export function TutorApplicationsDialog({ candidates, isConfirming = false, onClose, onConfirm }: TutorApplicationsDialogProps) {
  const [selectedCandidateId, setSelectedCandidateId] = useState("");
  const [trialDateStart, setTrialDateStart] = useState("");
  const [trialDateEnd, setTrialDateEnd] = useState("");
  const [trialHalfDay, setTrialHalfDay] = useState("上午");
  const selectedCandidate = candidates.find((candidate) => candidate.id === selectedCandidateId);
  /** 试课确认按钮是否满足学生和起止日期必填要求。 */
  const canConfirm = Boolean(selectedCandidate && trialDateStart && trialDateEnd && !isConfirming);

  /** 提交家长端确认的试课安排，成功反馈和关闭由上层业务 hook 承接。 */
  function handleConfirm() {
    if (!canConfirm || !selectedCandidate) {
      return;
    }

    onConfirm({
      applicationId: selectedCandidate.id,
      demandId: selectedCandidate.demandId,
      trialEnd: trialDateEnd,
      trialHalfDay,
      trialStart: trialDateStart
    });
  }

  return (
    <section className="checkout-sheet" aria-label="试课申请列表">
      <div className="sheet-backdrop" onClick={onClose} />
      <article className="sheet-panel tutor-applications-panel mx-auto grid max-h-[min(76vh,620px)] max-w-[540px] gap-[12px] overflow-hidden px-[14px] pb-[calc(16px+env(safe-area-inset-bottom))] pt-[16px]">
        <div className="card-title flex items-center justify-between gap-[10px]">
          <CalendarClock size={18} />
          <div>
            <strong>试课申请列表</strong>
            <span>选择家教并确认试课时间</span>
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

        <div className="tutor-application-list grid gap-[10px] overflow-auto pr-[2px]">
          {candidates.map((candidate) => (
            <button
              className={`tutor-application-card flow-card compact grid gap-[6px] p-[12px] text-left ${
                selectedCandidateId === candidate.id ? "active" : ""
              }`}
              key={candidate.id}
              onClick={() => setSelectedCandidateId((value) => (value === candidate.id ? "" : candidate.id))}
              type="button"
            >
              <strong>{candidate.name}</strong>
              <span>
                {candidate.school} · {candidate.major}
              </span>
              <em>{candidate.status}</em>
            </button>
          ))}
          {candidates.length === 0 ? (
            <article className="empty-state p-[14px] text-center">
              <strong>暂无试课申请</strong>
              <span>学生申请试课后会在这里展示。</span>
            </article>
          ) : null}
        </div>

        <div className="tutor-trial-form grid gap-[8px]">
          <div className="tutor-period-fields grid grid-cols-2 gap-[8px]">
            <label className={`profile-field publish-field grid gap-[7px] ${trialDateStart ? "" : "missing"}`}>
              <span>试课开始</span>
              <input onChange={(event) => setTrialDateStart(event.target.value)} type="date" value={trialDateStart} />
            </label>
            <label className={`profile-field publish-field grid gap-[7px] ${trialDateEnd ? "" : "missing"}`}>
              <span>试课结束</span>
              <input onChange={(event) => setTrialDateEnd(event.target.value)} type="date" value={trialDateEnd} />
            </label>
          </div>
          <div className="segmented-control publish-segmented-field wrap flex gap-[8px]" aria-label="选择试课时段">
            {["上午", "下午"].map((halfDay) => (
              <button
                className={trialHalfDay === halfDay ? "active" : ""}
                key={halfDay}
                onClick={() => setTrialHalfDay(halfDay)}
                type="button"
              >
                {halfDay}
              </button>
            ))}
          </div>
        </div>

        <button
          className="primary-button inline-flex min-h-[38px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white disabled:text-[#748092]"
          disabled={!canConfirm}
          onClick={handleConfirm}
          type="button"
        >
          <CheckCircle2 size={16} />
          {isConfirming ? "提交中" : selectedCandidateId ? "试课信息确认" : "选择试课家教"}
        </button>
      </article>
    </section>
  );
}
