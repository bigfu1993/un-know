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
  onCancelTrial?: (payload: {
    applicationId: string;
    demandId: string;
  }) => void;
  onConfirm: (payload: {
    applicationId: string;
    demandId: string;
    trialEnd: string;
    trialHalfDay: string;
    trialStart: string;
  }) => void;
  onReject?: (payload: {
    applicationId: string;
    demandId: string;
  }) => void;
}

/** 家长端试课中家教列表弹窗属性。 */
interface TutorTrialListDialogProps {
  candidates: TutorApplicationCandidate[];
  isSubmitting?: boolean;
  onClose: () => void;
  onConfirmEnd?: (payload: {
    applicationId: string;
    demandId: string;
    hireTutor: boolean;
    tutorSchedule?: string;
  }) => void;
  onWorkflowAction: (payload: TutorWorkflowActionRequest & {
    applicationId: string;
    demandId?: string;
  }) => Promise<boolean> | boolean | void;
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

  return task.node === "trialScheduled" ? candidate.trialSchedule ?? "" : "";
}

/** 家长端选择试课家教并确认试课安排。 */
export function TutorApplicationsDialog({ candidates, isConfirming = false, onCancelTrial, onClose, onConfirm, onReject }: TutorApplicationsDialogProps) {
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
                {candidateTask.node === "applicationPending" || candidateTask.node === "trialScheduled" ? (
                  <div className="tutor-application-actions flex flex-wrap gap-[8px]">
                    <button
                      className="danger-outline-button inline-flex min-h-[30px] items-center justify-center gap-[5px] px-[9px] py-[6px] text-[12px]"
                      disabled={isConfirming}
                      onClick={() =>
                        candidateTask.node === "trialScheduled"
                          ? onCancelTrial?.({ applicationId: candidate.id, demandId: candidate.demandId })
                          : onReject?.({ applicationId: candidate.id, demandId: candidate.demandId })
                      }
                      type="button"
                    >
                      {candidateTask.node === "trialScheduled" ? "取消试课" : "拒绝试课"}
                    </button>
                  </div>
                ) : null}
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
          availableScheduleSummary={selectedCandidate?.availability ?? ""}
          initialValue={trialScheduleValue}
          onClose={() => setIsScheduleOpen(false)}
          onConfirm={(value) => {
            setTrialScheduleValue(value);
            setIsScheduleOpen(false);
          }}
          subtitle="在学生提交的可试课时间内最多安排 3 天。"
        />
      ) : null}
    </section>
  );
}
/** 家长端查看试课中的家教，并处理试课、正式雇佣、兼职日程和结算链路。 */
export function TutorTrialListDialog({
  candidates,
  isSubmitting = false,
  onClose,
  onWorkflowAction
}: TutorTrialListDialogProps) {
  const trialCandidates = useMemo(
    () => candidates.filter((candidate) => createTutorTaskModel({ candidate, role: "parent" }).isTrialListVisible),
    [candidates]
  );
  const [selectedCandidateId, setSelectedCandidateId] = useState("");
  const [nonHireDecisionCandidateId, setNonHireDecisionCandidateId] = useState("");
  const [isTutorScheduleOpen, setIsTutorScheduleOpen] = useState(false);
  const selectedCandidate = trialCandidates.find((candidate) => candidate.id === selectedCandidateId);
  const selectedCandidateTask = selectedCandidate
    ? createTutorTaskModel({ candidate: selectedCandidate, role: "parent" })
    : null;

  /** 向服务端提交指定试课候选人的流程动作，保证多名学生试课时每张卡片独立推进。 */
  async function submitCandidateWorkflowAction(
    candidate: TutorApplicationCandidate,
    action: TutorWorkflowAction,
    payload: Partial<TutorWorkflowActionRequest> = {}
  ) {
    if (isSubmitting) {
      return;
    }

    await onWorkflowAction({
      ...payload,
      action,
      applicationId: candidate.id,
      demandId: candidate.demandId
    });
  }

  /** 向服务端提交当前选中试课候选人的流程动作。 */
  async function handleWorkflowAction(action: TutorWorkflowAction, payload: Partial<TutorWorkflowActionRequest> = {}) {
    if (!selectedCandidate) {
      return;
    }

    await submitCandidateWorkflowAction(selectedCandidate, action, payload);
  }

  /** 切换试课列表当前选中的家教，并重置不正式雇佣的二次选择状态。 */
  function handleSelectTrialCandidate(candidateId: string) {
    setSelectedCandidateId((currentCandidateId) => (currentCandidateId === candidateId ? "" : candidateId));
    setNonHireDecisionCandidateId("");
  }

  /** 渲染试课列表单张学生卡片内的独立操作。 */
  function renderTrialCandidateCardActions(candidate: TutorApplicationCandidate, candidateTask: ReturnType<typeof createTutorTaskModel>) {
    if (candidateTask.can("cancelApplication")) {
      return (
        <div className="tutor-application-actions flex flex-wrap gap-[8px]">
          <button className="ghost-button min-h-[30px] px-[9px] py-[6px] text-[12px] text-[#475466]" disabled type="button">
            等待学生确认
          </button>
          <button
            className="danger-outline-button inline-flex min-h-[30px] items-center justify-center gap-[5px] px-[9px] py-[6px] text-[12px]"
            disabled={isSubmitting}
            onClick={() => void submitCandidateWorkflowAction(candidate, "cancel_trial")}
            type="button"
          >
            取消试课
          </button>
        </div>
      );
    }

    if (candidateTask.can("requestTrialResult")) {
      return (
        <div className="tutor-application-actions flex flex-wrap gap-[8px]">
          <button
            className="primary-button inline-flex min-h-[30px] items-center justify-center gap-[5px] px-[9px] py-[6px] text-[12px] text-white"
            disabled={isSubmitting}
            onClick={() => void submitCandidateWorkflowAction(candidate, "request_trial_result")}
            type="button"
          >
            结束试课
          </button>
        </div>
      );
    }

    if (candidateTask.can("confirmTrialEnd")) {
      return (
        <div className="tutor-application-actions flex flex-wrap gap-[8px]">
          <button
            className="primary-button inline-flex min-h-[30px] items-center justify-center gap-[5px] px-[9px] py-[6px] text-[12px] text-white"
            disabled={isSubmitting}
            onClick={() => void submitCandidateWorkflowAction(candidate, "confirm_trial_end")}
            type="button"
          >
            确认结束试课
          </button>
        </div>
      );
    }

    return null;
  }

  /** 按当前流程节点渲染家长可执行动作。 */
  function renderSelectedCandidateActions() {
    if (!selectedCandidate || !selectedCandidateTask) {
      return (
        <button
          className="primary-button inline-flex min-h-[38px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white disabled:text-[#748092]"
          disabled
          type="button"
        >
          <CheckCircle2 size={16} />
          选择试课中的家教
        </button>
      );
    }

    if (selectedCandidateTask.can("cancelApplication")) {
      return (
        <div className="sheet-actions grid grid-cols-2 gap-[8px]">
          <button className="ghost-button min-h-[38px] px-[10px] py-[8px] text-[#475466]" disabled type="button">
            等待学生确认
          </button>
          <button
            className="danger-outline-button min-h-[38px] px-[10px] py-[8px]"
            disabled={isSubmitting}
            onClick={() => void handleWorkflowAction("cancel_trial")}
            type="button"
          >
            取消试课
          </button>
        </div>
      );
    }

    if (selectedCandidateTask.can("requestTrialResult")) {
      return (
        <button
          className="primary-button inline-flex min-h-[38px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white"
          disabled={isSubmitting}
          onClick={() => void handleWorkflowAction("request_trial_result")}
          type="button"
        >
          <CheckCircle2 size={16} />
          发起结束试课
        </button>
      );
    }

    if (selectedCandidateTask.can("confirmTrialEnd")) {
      return (
        <button
          className="primary-button inline-flex min-h-[38px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white"
          disabled={isSubmitting}
          onClick={() => void handleWorkflowAction("confirm_trial_end")}
          type="button"
        >
          <CheckCircle2 size={16} />
          确认结束试课
        </button>
      );
    }

    if (selectedCandidateTask.can("offerTutorService") || selectedCandidateTask.can("closeTrialContinueRecruiting")) {
      if (nonHireDecisionCandidateId === selectedCandidate.id) {
        return (
          <div className="sheet-actions grid gap-[8px]">
            <span className="notice p-[10px] text-[#61420d]">不正式雇佣后，请选择是否继续发布该家教兼职。</span>
            <div className="grid grid-cols-2 gap-[8px]">
              <button
                className="ghost-button min-h-[38px] px-[10px] py-[8px]"
                disabled={isSubmitting}
                onClick={() => void handleWorkflowAction("close_trial_continue_recruiting")}
                type="button"
              >
                继续发布
              </button>
              <button
                className="primary-button min-h-[38px] px-[10px] py-[8px] text-white"
                disabled={isSubmitting}
                onClick={() => void handleWorkflowAction("request_trial_settlement")}
                type="button"
              >
                发起结算确认
              </button>
            </div>
          </div>
        );
      }

      return (
        <div className="sheet-actions grid grid-cols-2 gap-[8px]">
          <button
            className="ghost-button min-h-[38px] px-[10px] py-[8px]"
            disabled={isSubmitting}
            onClick={() => setNonHireDecisionCandidateId(selectedCandidate.id)}
            type="button"
          >
            不正式雇佣
          </button>
          <button
            className="primary-button min-h-[38px] px-[10px] py-[8px] text-white"
            disabled={isSubmitting}
            onClick={() => void handleWorkflowAction("offer_service")}
            type="button"
          >
            发起正式雇佣确认
          </button>
        </div>
      );
    }

    if (selectedCandidateTask.can("submitServiceSchedule")) {
      return (
        <button
          className="primary-button inline-flex min-h-[38px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white"
          disabled={isSubmitting}
          onClick={() => setIsTutorScheduleOpen(true)}
          type="button"
        >
          <CalendarClock size={16} />
          {selectedCandidateTask.node === "serviceScheduleConfirming" ? "修改兼职日程" : "提交兼职日程"}
        </button>
      );
    }

    if (selectedCandidateTask.can("requestServiceEnd")) {
      return (
        <button
          className="danger-outline-button inline-flex min-h-[38px] items-center justify-center gap-[5px] px-[10px] py-[8px]"
          disabled={isSubmitting}
          onClick={() => void handleWorkflowAction("request_service_end")}
          type="button"
        >
          发起结束家教
        </button>
      );
    }

    if (selectedCandidateTask.can("resubmitSettlement")) {
      return (
        <button
          className="primary-button inline-flex min-h-[38px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white"
          disabled={isSubmitting}
          onClick={() => void handleWorkflowAction("resubmit_settlement")}
          type="button"
        >
          重新提交结算确认
        </button>
      );
    }

    return (
      <button
        className="ghost-button inline-flex min-h-[38px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-[#475466]"
        disabled
        type="button"
      >
        等待对方处理
      </button>
    );
  }

  return (
    <section className="checkout-sheet" aria-label="试课中的家教列表">
      <div className="sheet-backdrop" onClick={onClose} />
      <article className="sheet-panel tutor-applications-panel mx-auto grid max-h-[min(76vh,620px)] max-w-[540px] gap-[12px] overflow-hidden px-[14px] pb-[calc(16px+env(safe-area-inset-bottom))] pt-[16px]">
        <div className="card-title flex items-center justify-between gap-[10px]">
          <CalendarClock size={18} />
          <div>
            <strong>试课列表</strong>
            <span>按流程处理试课、正式雇佣、日程和结算</span>
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
              <article
                className={`tutor-application-card tutor-trial-list-card flow-card compact grid gap-[7px] p-[12px] text-left ${
                  isCandidateSelected ? "active" : ""
                } ${candidateTask.statusToneClassName}`}
                key={candidate.id}
              >
                <button
                  className="tutor-application-select grid gap-[7px] text-left"
                  onClick={() => handleSelectTrialCandidate(candidate.id)}
                  type="button"
                >
                  <div className="tutor-application-name-row flex items-center justify-between gap-[8px]">
                    <strong>{candidate.name}</strong>
                    <em className="tutor-application-status">{candidateTask.statusLabel}</em>
                  </div>
                  <span>
                    {candidate.school} · {candidate.major}
                  </span>
                  <p>{candidate.trialSchedule || "暂无日程安排"}</p>
                </button>
                {renderTrialCandidateCardActions(candidate, candidateTask)}
              </article>
            );
          })}
          {trialCandidates.length === 0 ? (
            <article className="empty-state p-[14px] text-center">
              <strong>暂无试课或服务中的家教</strong>
              <span>学生确认试课后会在这里展示。</span>
            </article>
          ) : null}
        </div>

        {renderSelectedCandidateActions()}
      </article>

      {isTutorScheduleOpen && selectedCandidate ? (
        <TutorTrialScheduleDialog
          initialValue={getTrialScheduleValueFromSummary(selectedCandidate.trialSchedule)}
          onClose={() => setIsTutorScheduleOpen(false)}
          onConfirm={(value) => {
            void handleWorkflowAction("submit_service_schedule", { tutorSchedule: value.plan.summary });
            setIsTutorScheduleOpen(false);
          }}
          subtitle="提交后需要学生确认兼职日程，确认前不会进入正式家教服务。"
          title="兼职日程"
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
