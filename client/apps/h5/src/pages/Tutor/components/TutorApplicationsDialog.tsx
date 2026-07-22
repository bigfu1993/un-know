import { Info } from "lucide-react";
import { TutorTrialScheduleDialog } from "@components/TutorTrialScheduleDialog";
import { getTrialScheduleSummaryLines, getTrialScheduleValueFromSummary } from "@components/TutorTrialScheduleDialog/model";
import type { TrialScheduleValue } from "@components/TutorTrialScheduleDialog/model";
import { createTutorTaskModel, getTutorTaskCandidateAvailability } from "@tools/tutorTaskWorkflow";

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

/** 家长端试课中家教列表弹窗属性。 */
interface TutorTrialListDialogProps {
  candidates: TutorApplicationCandidate[];
  isSubmitting?: boolean;
  onClose: () => void;
  onConfirmEnd: (payload: {
    applicationId: string;
    demandId: string;
    hireTutor: boolean;
    tutorSchedule?: string;
  }) => void;
}

/** 家教信息详情弹窗属性。 */
interface TutorApplicantDetailDialogProps {
  candidate: TutorApplicationCandidate;
  onClose: () => void;
}


/** 获取申请卡片中已确认过的试课日程摘要。 */
function getCandidateTrialScheduleSummary(candidate: TutorApplicationCandidate | undefined) {
  if (!candidate) {
    return "";
  }

  const task = createTutorTaskModel({ candidate, role: "parent" });

  return task.node === "trialScheduled" ? candidate.availability ?? "" : "";
}

/** 家长端选择试课家教并确认试课安排。 */
export function TutorApplicationsDialog({ candidates, isConfirming = false, onClose, onConfirm }: TutorApplicationsDialogProps) {
  const [selectedCandidateId, setSelectedCandidateId] = useState("");
  const [detailCandidate, setDetailCandidate] = useState<TutorApplicationCandidate | null>(null);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [trialScheduleValue, setTrialScheduleValue] = useState<TrialScheduleValue | null>(null);
  const visibleCandidates = useMemo(
    () => candidates.filter((candidate) => createTutorTaskModel({ candidate, role: "parent" }).isApplicationListVisible),
    [candidates]
  );
  const selectedCandidate = candidates.find((candidate) => candidate.id === selectedCandidateId);
  const selectedCandidateTask = selectedCandidate
    ? createTutorTaskModel({ candidate: selectedCandidate, role: "parent" })
    : null;
  const isSelectedCandidateTrialConfirming = selectedCandidateTask?.node === "trialScheduled";
  const selectedCandidateTrialScheduleSummary = getCandidateTrialScheduleSummary(selectedCandidate);
  const isTrialScheduleChanged = Boolean(
    isSelectedCandidateTrialConfirming &&
      trialScheduleValue?.plan.summary &&
      trialScheduleValue.plan.summary !== selectedCandidateTrialScheduleSummary
  );
  /** 试课确认按钮是否满足学生和试课安排必填要求。 */
  const canConfirm = Boolean(
    selectedCandidate &&
      trialScheduleValue?.plan &&
      !isConfirming &&
      (!isSelectedCandidateTrialConfirming || isTrialScheduleChanged)
  );

  /** 选择或取消选择家教申请，确认中的申请会自动带出原试课安排。 */
  function handleSelectCandidate(candidate: TutorApplicationCandidate) {
    if (selectedCandidateId === candidate.id) {
      setSelectedCandidateId("");
      setTrialScheduleValue(null);
      return;
    }

    setSelectedCandidateId(candidate.id);
    setTrialScheduleValue(getTrialScheduleValueFromSummary(getCandidateTrialScheduleSummary(candidate)));
  }

  /** 提交家长端确认的试课安排，成功反馈和关闭由上层业务 hook 承接。 */
  function handleConfirm() {
    if (!canConfirm || !selectedCandidate || !trialScheduleValue) {
      return;
    }

    onConfirm({
      applicationId: selectedCandidate.id,
      demandId: selectedCandidate.demandId,
      trialEnd: trialScheduleValue.plan.trialEnd,
      trialHalfDay: trialScheduleValue.plan.trialHalfDay,
      trialStart: trialScheduleValue.plan.trialStart
    });
  }

  /** 获取底部提交按钮文案。 */
  function getConfirmButtonLabel() {
    if (isConfirming) {
      return "提交中";
    }
    if (!selectedCandidateId) {
      return "选择试课家教";
    }
    if (isTrialScheduleChanged) {
      return "修改试课安排";
    }

    return "试课信息确认";
  }

  return (
    <section className="checkout-sheet" aria-label="试课申请列表">
      <div className="sheet-backdrop" onClick={onClose} />
      <article className="sheet-panel tutor-applications-panel mx-auto grid max-h-[min(76vh,620px)] max-w-[540px] gap-[12px] overflow-hidden px-[14px] pb-[calc(16px+env(safe-area-inset-bottom))] pt-[16px]">
        <div className="card-title flex items-center justify-between gap-[10px]">
          <CalendarClock size={18} />
          <div>
            <strong>试课申请列表</strong>
            <span>选择家教并确认试课安排</span>
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
          {visibleCandidates.map((candidate) => {
            const candidateTask = createTutorTaskModel({ candidate, role: "parent" });
            const isTrialConfirming = candidateTask.node === "trialScheduled";
            const isCandidateSelected = selectedCandidateId === candidate.id;

            return (
              <article
                className={`tutor-application-card flow-card compact grid gap-[6px] p-[12px] text-left ${
                  isCandidateSelected ? "active" : ""
                } ${isTrialConfirming ? "trial-confirming" : ""}`}
                key={candidate.id}
              >
                <div className="tutor-application-name-row flex items-center gap-[6px]">
                  <button
                    className="tutor-application-select tutor-application-name-action text-left"
                    onClick={() => handleSelectCandidate(candidate)}
                    type="button"
                  >
                    <strong>{candidate.name}</strong>
                  </button>
                  {isTrialConfirming ? (
                    <em className="tutor-application-status">{candidateTask.statusLabel}</em>
                  ) : null}
                  <button
                    aria-label={`查看${candidate.name}家教信息`}
                    className="tutor-application-detail-button grid place-items-center"
                    onClick={() => setDetailCandidate(candidate)}
                    type="button"
                  >
                    <Info size={15} />
                  </button>
                </div>
                <button
                  className="tutor-application-select text-left"
                  onClick={() => handleSelectCandidate(candidate)}
                  type="button"
                >
                  <span>
                    {candidate.school} · {candidate.major}
                  </span>
                </button>
              </article>
            );
          })}
          {visibleCandidates.length === 0 ? (
            <article className="empty-state p-[14px] text-center">
              <strong>暂无试课申请</strong>
              <span>待确认的试课申请会在这里展示。</span>
            </article>
          ) : null}
        </div>

        <div className="tutor-trial-form grid gap-[8px]">
          <button
            className={`tutor-trial-schedule-button ${trialScheduleValue ? "filled" : ""}`}
            disabled={!selectedCandidate}
            onClick={() => setIsScheduleOpen(true)}
            type="button"
          >
            <CalendarClock size={17} />
            <span>{isSelectedCandidateTrialConfirming ? "调整试课安排" : selectedCandidate ? "制定试课计划" : "试课安排"}</span>
          </button>
          {trialScheduleValue ? (
            <div className="tutor-trial-schedule-summary">
              {getTrialScheduleSummaryLines(trialScheduleValue.plan.summary).map((summaryLine) => (
                <span key={summaryLine}>{summaryLine}</span>
              ))}
            </div>
          ) : null}
        </div>

        <button
          className="primary-button inline-flex min-h-[38px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white disabled:text-[#748092]"
          disabled={!canConfirm}
          onClick={handleConfirm}
          type="button"
        >
          <CheckCircle2 size={16} />
          {getConfirmButtonLabel()}
        </button>
      </article>

      {detailCandidate ? (
        <TutorApplicantDetailDialog candidate={detailCandidate} onClose={() => setDetailCandidate(null)} />
      ) : null}

      {isScheduleOpen ? (
        <TutorTrialScheduleDialog
          initialValue={trialScheduleValue}
          onClose={() => setIsScheduleOpen(false)}
          onConfirm={(value) => {
            setTrialScheduleValue(value);
            setIsScheduleOpen(false);
          }}
        />
      ) : null}
    </section>
  );
}
/** 家长端查看试课中的家教，并处理结束试课确认。 */
export function TutorTrialListDialog({
  candidates,
  isSubmitting = false,
  onClose,
  onConfirmEnd
}: TutorTrialListDialogProps) {
  const trialCandidates = useMemo(
    () => candidates.filter((candidate) => createTutorTaskModel({ candidate, role: "parent" }).isTrialListVisible),
    [candidates]
  );
  const [selectedCandidateId, setSelectedCandidateId] = useState("");
  const [isHireDecisionOpen, setIsHireDecisionOpen] = useState(false);
  const [isTutorScheduleOpen, setIsTutorScheduleOpen] = useState(false);
  const selectedCandidate = trialCandidates.find((candidate) => candidate.id === selectedCandidateId);
  const selectedCandidateTask = selectedCandidate
    ? createTutorTaskModel({ candidate: selectedCandidate, role: "parent" })
    : null;
  const canConfirmEnd = Boolean(selectedCandidateTask?.can("completeTrialEnd") && !isSubmitting);

  /** 提交结束试课决策，是否正式聘用由父级接口落库。 */
  function handleConfirmEnd(hireTutor: boolean, tutorSchedule?: string) {
    if (!selectedCandidate) {
      return;
    }

    onConfirmEnd({
      applicationId: selectedCandidate.id,
      demandId: selectedCandidate.demandId,
      hireTutor,
      tutorSchedule
    });
  }

  return (
    <section className="checkout-sheet" aria-label="试课中的家教列表">
      <div className="sheet-backdrop" onClick={onClose} />
      <article className="sheet-panel tutor-applications-panel mx-auto grid max-h-[min(76vh,620px)] max-w-[540px] gap-[12px] overflow-hidden px-[14px] pb-[calc(16px+env(safe-area-inset-bottom))] pt-[16px]">
        <div className="card-title flex items-center justify-between gap-[10px]">
          <CalendarClock size={18} />
          <div>
            <strong>试课列表</strong>
            <span>查看试课中的家教，处理结束试课确认</span>
          </div>
          <button aria-label="关闭" className="icon-only grid h-[34px] w-[34px] place-items-center text-[#475466]" onClick={onClose} type="button">
            <XCircle size={20} />
          </button>
        </div>

        <div className="tutor-application-list grid gap-[10px] overflow-auto pr-[2px]">
          {trialCandidates.map((candidate) => {
            const isCandidateSelected = selectedCandidateId === candidate.id;
            const candidateTask = createTutorTaskModel({ candidate, role: "parent" });

            return (
              <button
                className={`tutor-application-card tutor-trial-list-card flow-card compact grid gap-[7px] p-[12px] text-left ${
                  isCandidateSelected ? "active" : ""
                } ${candidateTask.statusToneClassName}`}
                key={candidate.id}
                onClick={() => setSelectedCandidateId(isCandidateSelected ? "" : candidate.id)}
                type="button"
              >
                <div className="tutor-application-name-row flex items-center justify-between gap-[8px]">
                  <strong>{candidate.name}</strong>
                  <em className="tutor-application-status">{candidateTask.statusLabel}</em>
                </div>
                <span>
                  {candidate.school} · {candidate.major}
                </span>
                <p>{candidate.availability || "暂无试课安排"}</p>
              </button>
            );
          })}
          {trialCandidates.length === 0 ? (
            <article className="empty-state p-[14px] text-center">
              <strong>暂无试课中的家教</strong>
              <span>学生确认试课后会在这里展示。</span>
            </article>
          ) : null}
        </div>

        <button
          className="primary-button inline-flex min-h-[38px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white disabled:text-[#748092]"
          disabled={!canConfirmEnd}
          onClick={() => setIsHireDecisionOpen(true)}
          type="button"
        >
          <CheckCircle2 size={16} />
          {selectedCandidate ? "同意结束试课" : "选择试课中的家教"}
        </button>
      </article>

      {isHireDecisionOpen && selectedCandidate ? (
        <section className="checkout-sheet" aria-label="正式聘用确认">
          <div className="sheet-backdrop" onClick={() => setIsHireDecisionOpen(false)} />
          <article className="sheet-panel tutor-hire-decision-panel mx-auto grid max-w-[540px] gap-[12px] px-[14px] pb-[calc(16px+env(safe-area-inset-bottom))] pt-[16px]">
            <div className="card-title flex items-center gap-[10px]">
              <Info size={18} />
              <div>
                <strong>是否正式聘用家教</strong>
                <span>{selectedCandidate.name}</span>
              </div>
            </div>
            <p className="notice p-[10px] text-[#61420d]">
              选择“否”将结束本次试课，家教兼职继续招募；选择“是”需要先制定正式家教日程。
            </p>
            <div className="sheet-actions grid grid-cols-2 gap-[8px]">
              <button className="ghost-button min-h-[38px] px-[10px] py-[8px]" onClick={() => handleConfirmEnd(false)} type="button">
                否
              </button>
              <button
                className="primary-button min-h-[38px] px-[10px] py-[8px] text-white"
                onClick={() => {
                  setIsHireDecisionOpen(false);
                  setIsTutorScheduleOpen(true);
                }}
                type="button"
              >
                是
              </button>
            </div>
          </article>
        </section>
      ) : null}

      {isTutorScheduleOpen ? (
        <TutorTrialScheduleDialog
          initialValue={null}
          onClose={() => setIsTutorScheduleOpen(false)}
          onConfirm={(value) => handleConfirmEnd(true, value.plan.summary)}
          subtitle="制定正式家教日程后提交家教申请。"
          title="家教日程"
        />
      ) : null}
    </section>
  );
}
/** 家教信息详情弹窗，展示申请学生可公开的家教资料。 */
function TutorApplicantDetailDialog({ candidate, onClose }: TutorApplicantDetailDialogProps) {
  const detailItems = [
    { label: "学校", value: candidate.school || "待补充" },
    { label: "专业", value: candidate.major || "待补充" },
    { label: "GPA", value: candidate.gpa || "待补充" },
    { label: "受聘次数", value: `${candidate.hiredTimes} 次` },
    { label: "可用时间", value: getTutorTaskCandidateAvailability(candidate) }
  ];

  return (
    <section className="checkout-sheet" aria-label="家教信息详情">
      <div className="sheet-backdrop" onClick={onClose} />
      <article className="sheet-panel tutor-applicant-detail-panel mx-auto grid max-w-[540px] gap-[12px] px-[14px] pb-[calc(16px+env(safe-area-inset-bottom))] pt-[16px]">
        <div className="card-title flex items-center justify-between gap-[10px]">
          <Info size={18} />
          <div>
            <strong>{candidate.name}</strong>
            <span>家教信息</span>
          </div>
          <button aria-label="关闭" className="icon-only grid h-[34px] w-[34px] place-items-center text-[#475466]" onClick={onClose} type="button">
            <XCircle size={20} />
          </button>
        </div>
        <div className="tutor-applicant-detail-list grid gap-[8px]">
          {detailItems.map((item) => (
            <div className="tutor-applicant-detail-item flex items-start justify-between gap-[12px]" key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
