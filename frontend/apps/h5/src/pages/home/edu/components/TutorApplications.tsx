import { ReceiptText } from "lucide-react";
import { createTutorTaskModel } from "@tools/tutorTaskWorkflow";
import { useConfirmAction } from "@h5/hooks/useConfirmAction";
import { TutorCard } from "./TutorCard";

/** 家长端试课申请列表弹窗属性。 */
interface TutorApplicationsProps {
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
interface TutorTrialListProps {
  candidates: TutorApplicationCandidate[];
  isSubmitting?: boolean;
  onClose: () => void;
  onConfirmEnd?: (payload: {
    applicationId: string;
    demandId: string;
    hireTutor?: boolean;
    trialFee: number;
    tutorSchedule?: string;
  }) => void;
  onWorkflowAction: (payload: TutorWorkflowActionRequest & {
    applicationId: string;
    demandId?: string;
  }) => Promise<boolean> | boolean | void;
}

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

/** 家长端提交结算金额时支持的流程动作。 */
type TutorSettlementAction = Extract<TutorWorkflowAction, "confirm_trial_end" | "request_service_end" | "request_trial_result">;

/** 家长端试课结算提交载荷。 */
interface TutorTrialSettlementPayload {
  hireTutor?: boolean;
  trialFee: number;
}

/** 家长端试课列表卡片时间预览弹窗状态。 */
interface TutorSchedulePreviewState {
  buttonLabel: string;
  emptyLabel: string;
  sections: TutorSchedulePreviewSection[];
  subtitle: string;
  summary: string;
  title: string;
}

/** 家长端日程预览中的阶段片段。 */
interface TutorSchedulePreviewSection {
  label?: string;
  showScheduleLabel?: boolean;
  summary: string;
  title: string;
}

/** 过滤空日程片段，避免调用处为类型收窄创建 raw 中转变量。 */
function compactTutorSchedulePreviewSections(
  sections: Array<TutorSchedulePreviewSection | null | undefined>
): TutorSchedulePreviewSection[] {
  return sections.filter((section): section is TutorSchedulePreviewSection => Boolean(section));
}

/** 家教时间只读预览弹窗属性。 */
interface TutorSchedulePreviewProps extends TutorSchedulePreviewState {
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

/** 获取家长排期弹窗初始安排，仅在已有家长排期时回填，不默认选中学生可试课时间。 */
function getCandidateInitialTrialScheduleValue(candidate: TutorApplicationCandidate | undefined) {
  if (!candidate) {
    return null;
  }

  const existingTrialScheduleSummary = getCandidateTrialScheduleSummary(candidate);

  return existingTrialScheduleSummary ? getTrialScheduleValueFromSummary(existingTrialScheduleSummary) : null;
}

/** 渲染家长端候选卡片右侧状态，支持主状态和补充状态上下排列。 */
function renderTutorCandidateStatus(candidateTask: ReturnType<typeof createTutorTaskModel>) {
  const statusLabels = candidateTask.statusLabels.length > 0 ? candidateTask.statusLabels : [candidateTask.statusLabel].filter(Boolean);

  if (statusLabels.length === 0) {
    return null;
  }

  return (
    <span className={`tutor-application-status-stack ${statusLabels.length > 1 ? "multi" : ""}`}>
      {statusLabels.map((statusLabel) => (
        <em className="tutor-application-status" key={statusLabel}>
          {statusLabel}
        </em>
      ))}
    </span>
  );
}

/** 判断试课列表卡片是否允许被选中并触发底部主操作。 */
function canSelectTrialCandidateCard(candidateTask: ReturnType<typeof createTutorTaskModel>) {
  return candidateTask.node !== "trialScheduled" && !candidateTask.can("removeRejectedServiceOffer");
}

/** 获取试课列表卡片的时间预览配置，避免直接在卡片内铺开长时间范围。 */
function getTutorTrialCandidateSchedulePreview(candidate: TutorApplicationCandidate, candidateTask: ReturnType<typeof createTutorTaskModel>): TutorSchedulePreviewState {
  const trialScheduleSection = candidate.trialSchedule?.trim()
    ? {
        label: "试",
        showScheduleLabel: true,
        summary: candidate.trialSchedule.trim(),
        title: "试课安排"
      }
    : null;

  if (candidateTask.node === "serviceSchedulePending") {
    const sections = compactTutorSchedulePreviewSections([
      candidate.availability?.trim()
        ? {
            showScheduleLabel: false,
            summary: candidate.availability.trim(),
            title: "可家教时间"
          }
        : null,
      trialScheduleSection
    ]);

    return {
      buttonLabel: "可家教时间",
      emptyLabel: "暂无可家教时间",
      sections,
      subtitle: "查看学生同意正式雇佣后提交的可家教日期，并据此制定正式雇佣日程。",
      summary: candidate.availability?.trim() ?? "",
      title: "可家教时间"
    };
  }

  if (candidateTask.node === "formalTutoring") {
    const sections = compactTutorSchedulePreviewSections([
      trialScheduleSection,
      candidate.serviceSchedule?.trim()
        ? {
            label: "课",
            showScheduleLabel: true,
            summary: candidate.serviceSchedule.trim(),
            title: "课程安排"
          }
        : null
    ]);

    return {
      buttonLabel: "课程",
      emptyLabel: "暂无课程安排",
      sections,
      subtitle: "查看家长提交的正式雇佣日程。",
      summary: candidate.serviceSchedule?.trim() || candidate.trialSchedule?.trim() || "",
      title: "课程安排"
    };
  }

  return {
    buttonLabel: "日程",
    emptyLabel: "暂无试课安排",
    sections: trialScheduleSection ? [trialScheduleSection] : [],
    subtitle: "查看当前学生的试课安排。",
    summary: candidate.trialSchedule?.trim() ?? "",
    title: "试课安排"
  };
}

/** 家长端选择试课家教并确认试课安排。 */
export function TutorApplications({ candidates, isConfirming = false, onCancelTrial, onClose, onConfirm, onReject }: TutorApplicationsProps) {
  const [selectedCandidateId, setSelectedCandidateId] = useState("");
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [trialScheduleValue, setTrialScheduleValue] = useState<TrialScheduleValue | null>(null);
  const {
    closeConfirmation: closeCancelConfirmation,
    confirmCurrentAction: confirmCancelAction,
    confirmation: cancelConfirmation,
    openConfirmation: openCancelConfirmation
  } = useConfirmAction();
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
    setTrialScheduleValue(getCandidateInitialTrialScheduleValue(candidate));
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
    <>
      <Modal
        ariaLabel="试课申请列表"
        icon={<CalendarClock size={18} />}
        onClose={onClose}
        panelClassName="tutor-applications-panel mx-auto grid max-h-[min(76vh,620px)] max-w-[540px] gap-[12px] overflow-hidden px-[14px] pb-[calc(16px+env(safe-area-inset-bottom))] pt-[16px]"
        title={
          <>
            <strong>试课申请列表</strong>
            <span>选择家教并确认试课安排</span>
          </>
        }
      >
        <div className="tutor-application-list grid gap-[10px] overflow-auto pr-[2px]">
          {visibleCandidates.map((candidate) => {
            const candidateTask = createTutorTaskModel({ candidate, role: "parent" });
            const isTrialConfirming = candidateTask.node === "trialScheduled";
            const isCandidateSelected = selectedCandidateId === candidate.id;
            const detailItems = [
              { label: "学校", value: candidate.school || "待补充" },
              { label: "专业", value: candidate.major || "待补充" },
              { label: "GPA", value: candidate.gpa || "待补充" },
              { label: "受聘次数", value: `${candidate.hiredTimes} 次` },
              { label: "可用时间", value: candidate.availability || "待补充" }
            ];

            return (
              <TutorCard
                className={isTrialConfirming ? "trial-confirming" : ""}
                detail={
                  <div className="tutor-applicant-detail-list grid gap-[8px]">
                    {detailItems.map((item) => (
                      <div className="tutor-applicant-detail-item flex items-start justify-between gap-[12px]" key={item.label}>
                        <span>{item.label}</span>
                        <strong>{item.value}</strong>
                      </div>
                    ))}
                  </div>
                }
                detailTitle={candidate.nickname}
                footer={
                  candidateTask.node === "applicationPending" || candidateTask.node === "trialScheduled" ? (
                    <div className="tutor-application-actions flex flex-wrap gap-[8px]">
                      <button
                        className={`${
                          candidateTask.node === "trialScheduled" ? "text-button danger" : "danger-outline-button"
                        } inline-flex min-h-[30px] items-center justify-center gap-[5px] px-[9px] py-[6px] text-[12px]`}
                        disabled={isConfirming}
                        onClick={() => {
                          if (candidateTask.node === "trialScheduled") {
                            openCancelConfirmation({
                              confirmLabel: "确认取消",
                              description: "取消后该学生本次试课安排结束，学生端与家长端列表会按真实状态刷新。",
                              onConfirm: () => onCancelTrial?.({ applicationId: candidate.id, demandId: candidate.demandId }),
                              title: "取消试课"
                            });
                            return;
                          }

                          onReject?.({ applicationId: candidate.id, demandId: candidate.demandId });
                        }}
                        type="button"
                      >
                        {candidateTask.node === "trialScheduled" ? "取消试课" : "拒绝试课"}
                      </button>
                    </div>
                  ) : null
                }
                key={candidate.id}
                onSelect={() => handleSelectCandidate(candidate)}
                selected={isCandidateSelected}
                title={
                  <>
                    {candidate.nickname}
                    {isTrialConfirming ? renderTutorCandidateStatus(candidateTask) : null}
                  </>
                }
              >
                <span>
                  {candidate.school} · {candidate.major}
                </span>
              </TutorCard>
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
      </Modal>

      {isScheduleOpen ? (
        <TutorTrialSchedule
          availableScheduleSummary={selectedCandidate?.availability ?? ""}
          initialValue={trialScheduleValue ?? getCandidateInitialTrialScheduleValue(selectedCandidate)}
          onClose={() => setIsScheduleOpen(false)}
          onConfirm={(value) => {
            setTrialScheduleValue(value);
            setIsScheduleOpen(false);
          }}
          subtitle="在学生提交的可试课时间内最多安排 3 天。"
        />
      ) : null}
      {cancelConfirmation ? (
        <ConfirmAction
          confirmLabel={cancelConfirmation.confirmLabel}
          description={cancelConfirmation.description}
          onClose={closeCancelConfirmation}
          onConfirm={confirmCancelAction}
          title={cancelConfirmation.title}
        />
      ) : null}
    </>
  );
}
/** 家长端查看试课中的家教，并处理试课、正式雇佣、兼职日程和结算链路。 */
export function TutorTrialList({
  candidates,
  isSubmitting = false,
  onClose,
  onWorkflowAction
}: TutorTrialListProps) {
  const [hiddenTrialCandidateIds, setHiddenTrialCandidateIds] = useState<string[]>([]);
  const [schedulePreview, setSchedulePreview] = useState<TutorSchedulePreviewState | null>(null);
  const trialCandidates = useMemo(
    () =>
      candidates.filter(
        (candidate) =>
          createTutorTaskModel({ candidate, role: "parent" }).isTrialListVisible && !hiddenTrialCandidateIds.includes(candidate.id)
      ),
    [candidates, hiddenTrialCandidateIds]
  );
  /** 正式服务阶段从父端主卡片进入时，弹窗作为课程列表使用。 */
  const isCourseMode = useMemo(
    () =>
      trialCandidates.length > 0 &&
      trialCandidates.every((candidate) => {
        const candidateTask = createTutorTaskModel({ candidate, role: "parent" });
        return candidateTask.node === "serviceSchedulePending" || candidateTask.node === "formalTutoring";
      }),
    [trialCandidates]
  );
  const [selectedCandidateId, setSelectedCandidateId] = useState("");
  const [isTutorScheduleOpen, setIsTutorScheduleOpen] = useState(false);
  const {
    closeConfirmation: closeCancelConfirmation,
    confirmCurrentAction: confirmCancelAction,
    confirmation: cancelConfirmation,
    openConfirmation: openCancelConfirmation
  } = useConfirmAction();
  const [settlementPanelState, setSettlementPanelState] = useState<{
    action: TutorSettlementAction;
    candidate: TutorApplicationCandidate;
    mode: "service" | "trial";
  } | null>(null);
  const selectedCandidate = trialCandidates.find((candidate) => candidate.id === selectedCandidateId);
  const selectedCandidateTask = selectedCandidate
    ? createTutorTaskModel({ candidate: selectedCandidate, role: "parent" })
    : null;
  const canKeepSelectedCandidate = selectedCandidateTask ? canSelectTrialCandidateCard(selectedCandidateTask) : true;

  /** 不可通过底部主操作处理的试课卡片不允许保持选中。 */
  useEffect(() => {
    if (selectedCandidateId && (!selectedCandidate || !canKeepSelectedCandidate)) {
      setSelectedCandidateId("");
    }
  }, [canKeepSelectedCandidate, selectedCandidate, selectedCandidateId]);

  /** 向服务端提交指定试课候选人的流程动作，保证多名学生试课时每张卡片独立推进。 */
  async function submitCandidateWorkflowAction(
    candidate: TutorApplicationCandidate,
    action: TutorWorkflowAction,
    payload: Partial<TutorWorkflowActionRequest> = {}
  ) {
    if (isSubmitting) {
      return false;
    }

    return await onWorkflowAction({
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

  /** 打开试课结算弹窗，确认金额后进入学生费用确认。 */
  function openSettlementPanel(candidate: TutorApplicationCandidate, action: TutorSettlementAction, mode: "service" | "trial" = "trial") {
    setSettlementPanelState({ action, candidate, mode });
  }

  /** 提交结算金额，可同时提交家长的正式雇佣意向。 */
  async function handleConfirmTrialSettlement(payload: TutorTrialSettlementPayload) {
    if (!settlementPanelState) {
      return;
    }

    const result = await submitCandidateWorkflowAction(settlementPanelState.candidate, settlementPanelState.action, payload);
    if (result !== false) {
      setSettlementPanelState(null);
    }
  }

  /** 切换试课列表当前选中的家教。 */
  function handleSelectTrialCandidate(candidate: TutorApplicationCandidate) {
    const candidateTask = createTutorTaskModel({ candidate, role: "parent" });

    if (!canSelectTrialCandidateCard(candidateTask)) {
      return;
    }

    const candidateId = candidate.id;
    setSelectedCandidateId((currentCandidateId) => (currentCandidateId === candidateId ? "" : candidateId));
  }

  /** 家长在学生确认费用后选择不正式雇佣，结束当前学生端进行中申请并刷新试课列表。 */
  async function handleSelectNotHire() {
    if (!selectedCandidate) {
      return;
    }

    const result = await submitCandidateWorkflowAction(selectedCandidate, "close_trial_continue_recruiting");
    if (result !== false) {
      setHiddenTrialCandidateIds((candidateIds) => [...new Set([...candidateIds, selectedCandidate.id])]);
      setSelectedCandidateId("");
    }
  }

  /** 渲染试课列表单张学生卡片内的独立操作。 */
  function renderTrialCandidateCardActions(candidate: TutorApplicationCandidate, candidateTask: ReturnType<typeof createTutorTaskModel>) {
    if (candidateTask.can("cancelApplication")) {
      return (
        <div className="tutor-application-actions flex flex-wrap gap-[8px]">
          <button
            className="text-button danger inline-flex min-h-[30px] items-center justify-center gap-[5px] px-[9px] py-[6px] text-[12px]"
            disabled={isSubmitting}
            onClick={() =>
              openCancelConfirmation({
                confirmLabel: "确认取消",
                description: "取消后该学生本次试课结束，学生端与试课列表会按真实状态刷新。",
                onConfirm: () => void submitCandidateWorkflowAction(candidate, "cancel_trial"),
                title: "取消试课"
              })
            }
            type="button"
          >
            取消试课
          </button>
        </div>
      );
    }

    if (candidateTask.can("cancelServiceConfirmation")) {
      return (
        <div className="tutor-application-actions flex flex-wrap gap-[8px]">
          <button
            className="text-button danger inline-flex min-h-[30px] items-center justify-center gap-[5px] px-[9px] py-[6px] text-[12px]"
            disabled={isSubmitting}
            onClick={() =>
              openCancelConfirmation({
                confirmLabel: "确认取消",
                description: "取消后流程将回到试课结算阶段，需要重新处理正式雇佣确认。",
                onConfirm: () => void submitCandidateWorkflowAction(candidate, "cancel_service_confirmation"),
                title: "取消兼职确认"
              })
            }
            type="button"
          >
            取消兼职确认
          </button>
        </div>
      );
    }

    if (candidateTask.can("removeRejectedServiceOffer")) {
      return (
        <div className="tutor-application-actions flex flex-wrap gap-[8px]">
          <button
            className="ghost-button min-h-[30px] px-[9px] py-[6px] text-[12px] text-[#475466]"
            disabled={isSubmitting}
            onClick={() => void submitCandidateWorkflowAction(candidate, "remove_rejected_service_offer")}
            type="button"
          >
            移除
          </button>
          <button
            className="primary-button inline-flex min-h-[30px] items-center justify-center gap-[5px] px-[9px] py-[6px] text-[12px] text-white"
            disabled={isSubmitting}
            onClick={() => void submitCandidateWorkflowAction(candidate, "offer_service")}
            type="button"
          >
            再次委托
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
        <button
          className="text-button danger inline-flex min-h-[38px] items-center justify-center gap-[5px] px-[10px] py-[8px]"
          disabled={isSubmitting}
          onClick={() =>
            openCancelConfirmation({
              confirmLabel: "确认取消",
              description: "取消后该学生本次试课结束，学生端与试课列表会按真实状态刷新。",
              onConfirm: () => void handleWorkflowAction("cancel_trial"),
              title: "取消试课"
            })
          }
          type="button"
        >
          取消试课
        </button>
      );
    }

    if (selectedCandidateTask.can("requestTrialResult")) {
      return (
        <button
          className="primary-button inline-flex min-h-[38px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white"
          disabled={isSubmitting}
          onClick={() => openSettlementPanel(selectedCandidate, "request_trial_result")}
          type="button"
        >
          <CheckCircle2 size={16} />
          结束试课
        </button>
      );
    }

    if (selectedCandidateTask.can("confirmTrialEnd")) {
      return (
        <button
          className="primary-button inline-flex min-h-[38px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white"
          disabled={isSubmitting}
          onClick={() => openSettlementPanel(selectedCandidate, "confirm_trial_end")}
          type="button"
        >
          <CheckCircle2 size={16} />
          确认结束试课
        </button>
      );
    }

    if (selectedCandidateTask.can("offerTutorService") || selectedCandidateTask.can("closeTrialContinueRecruiting")) {
      return (
        <div className="sheet-actions grid grid-cols-2 gap-[8px]">
          <button
            className="ghost-button min-h-[38px] px-[10px] py-[8px]"
            disabled={isSubmitting}
            onClick={() => void handleSelectNotHire()}
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
            正式雇佣
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
          提交正式雇佣日程
        </button>
      );
    }

    if (selectedCandidateTask.can("requestServiceEnd")) {
      return (
        <button
          className="danger-outline-button inline-flex min-h-[38px] items-center justify-center gap-[5px] px-[10px] py-[8px]"
          disabled={isSubmitting}
          onClick={() => openSettlementPanel(selectedCandidate, "request_service_end", "service")}
          type="button"
        >
          结束
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
    <>
      <Modal
        ariaLabel="试课中的家教列表"
        icon={<CalendarClock size={18} />}
        onClose={onClose}
        panelClassName="tutor-applications-panel tutor-trial-list-panel mx-auto grid max-h-[min(76vh,620px)] max-w-[540px] gap-[12px] overflow-hidden px-[14px] pb-[calc(16px+env(safe-area-inset-bottom))] pt-[16px]"
        title={
          <>
            <strong>{isCourseMode ? "课程" : "试课列表"}</strong>
            <span>{isCourseMode ? `共 ${trialCandidates.length} 位，处理正式雇佣课程和结束` : `共 ${trialCandidates.length} 位，按流程处理试课、正式雇佣和日程`}</span>
          </>
        }
      >
        <div className="tutor-application-list grid gap-[10px] overflow-auto pr-[2px]">
          {trialCandidates.map((candidate) => {
            const isCandidateSelected = selectedCandidateId === candidate.id;
            const candidateTask = createTutorTaskModel({ candidate, role: "parent" });
            const canSelectTrialCandidate = canSelectTrialCandidateCard(candidateTask);
            const schedulePreviewConfig = getTutorTrialCandidateSchedulePreview(candidate, candidateTask);
            const hasSchedulePreview = schedulePreviewConfig.sections.length > 0;

            return (
              <article
                className={`tutor-application-card tutor-trial-list-card flow-card compact grid gap-[7px] p-[12px] text-left ${
                  isCandidateSelected && canSelectTrialCandidate ? "active" : ""
                } ${canSelectTrialCandidate ? "" : "not-selectable"} ${
                  candidateTask.statusToneClassName
                }`}
                key={candidate.id}
              >
                <button
                  className="tutor-application-select grid gap-[7px] text-left"
                  disabled={!canSelectTrialCandidate}
                  onClick={() => handleSelectTrialCandidate(candidate)}
                  type="button"
                >
                  <div className="tutor-application-name-row flex items-center justify-between gap-[8px]">
                    <strong>{candidate.nickname}</strong>
                    {renderTutorCandidateStatus(candidateTask)}
                  </div>
                  <span>
                    {candidate.school} · {candidate.major}
                  </span>
                </button>
                <button
                  className={`tutor-time-preview-button inline-flex min-h-[30px] items-center justify-center gap-[5px] px-[9px] py-[6px] ${
                    hasSchedulePreview ? "" : "empty"
                  }`}
                  disabled={!hasSchedulePreview}
                  onClick={() => setSchedulePreview(schedulePreviewConfig)}
                  type="button"
                >
                  <CalendarClock size={14} />
                  {hasSchedulePreview ? schedulePreviewConfig.buttonLabel : schedulePreviewConfig.emptyLabel}
                </button>
                {renderTrialCandidateCardActions(candidate, candidateTask)}
              </article>
            );
          })}
          {trialCandidates.length === 0 ? (
            <article className="empty-state p-[14px] text-center">
              <strong>{isCourseMode ? "暂无课程" : "暂无试课或服务中的家教"}</strong>
              <span>{isCourseMode ? "正式雇佣课程会在这里展示。" : "学生确认试课后会在这里展示。"}</span>
            </article>
          ) : null}
        </div>

        {renderSelectedCandidateActions()}
      </Modal>

      {isTutorScheduleOpen && selectedCandidate ? (
        <TutorTrialSchedule
          availableScheduleSummary={selectedCandidate.availability}
          blockedScheduleLabel="试"
          blockedScheduleSummary={selectedCandidate.trialSchedule}
          initialValue={null}
          maxSelectedDates={null}
          onClose={() => setIsTutorScheduleOpen(false)}
          onConfirm={(value) => {
            void handleWorkflowAction("submit_service_schedule", { tutorSchedule: value.plan.summary });
            setIsTutorScheduleOpen(false);
          }}
          scheduleLabel="课"
          subtitle="请在学生提交的可家教时间内制定正式雇佣日程，提交后直接进入正式雇佣。"
          title="正式雇佣日程"
        />
      ) : null}

      {settlementPanelState ? (
        <TutorTrialSettlement
          candidate={settlementPanelState.candidate}
          isSubmitting={isSubmitting}
          mode={settlementPanelState.mode}
          onClose={() => setSettlementPanelState(null)}
          onConfirm={handleConfirmTrialSettlement}
        />
      ) : null}

      {schedulePreview ? (
        <TutorSchedulePreview {...schedulePreview} onClose={() => setSchedulePreview(null)} />
      ) : null}
      {cancelConfirmation ? (
        <ConfirmAction
          confirmLabel={cancelConfirmation.confirmLabel}
          description={cancelConfirmation.description}
          onClose={closeCancelConfirmation}
          onConfirm={confirmCancelAction}
          title={cancelConfirmation.title}
        />
      ) : null}
    </>
  );
}

/** 合并同一申请子任务下的多阶段日程，供只读日历统一展示。 */
function getTutorSchedulePreviewCalendarItems(sections: TutorSchedulePreviewSection[]): TrialScheduleCalendarItem[] {
  const itemMap = new Map<
    string,
    {
      date: string;
      periodLabels: Partial<Record<TrialScheduleCalendarPeriod, string>>;
      periods: Set<TrialScheduleCalendarPeriod>;
    }
  >();

  sections.forEach((section) => {
    const scheduleValue = getTrialScheduleValueFromSummary(section.summary);
    if (!scheduleValue) {
      return;
    }

    getTrialScheduleCalendarItems(scheduleValue.selectedDates, scheduleValue.scheduleDraft, {
      scheduleLabel: section.label,
      showPeriodLabel: section.showScheduleLabel
    }).forEach((scheduleItem) => {
      const item = itemMap.get(scheduleItem.date) ?? {
        date: scheduleItem.date,
        periodLabels: {},
        periods: new Set<TrialScheduleCalendarPeriod>()
      };

      scheduleItem.periods.forEach((period) => item.periods.add(period));
      item.periodLabels = {
        ...item.periodLabels,
        ...scheduleItem.periodLabels
      };
      itemMap.set(scheduleItem.date, item);
    });
  });

  return [...itemMap.values()]
    .map((item) => ({
      date: item.date,
      periodLabels: item.periodLabels,
      periods: [...item.periods]
    }))
    .sort((left, right) => left.date.localeCompare(right.date));
}

/** 获取当前日期下各阶段的具体时间。 */
function getTutorSchedulePreviewActiveSections(sections: TutorSchedulePreviewSection[], activeDate: string | undefined) {
  if (!activeDate) {
    return [];
  }

  return sections
    .map((section) => {
      const scheduleValue = getTrialScheduleValueFromSummary(section.summary);
      const times = scheduleValue ? getEnabledPeriodSummaries(scheduleValue.scheduleDraft[activeDate]) : [];

      return {
        ...section,
        times
      };
    })
    .filter((section) => section.times.length > 0);
}

/** 家教时间只读弹窗，卡片只保留入口按钮，具体时间在日历内查看。 */
function TutorSchedulePreview({
  emptyLabel,
  onClose,
  sections,
  subtitle,
  summary,
  title
}: TutorSchedulePreviewProps) {
  const scheduleItems = useMemo(() => getTutorSchedulePreviewCalendarItems(sections), [sections]);
  const selectedDates = useMemo(() => scheduleItems.map((scheduleItem) => scheduleItem.date), [scheduleItems]);
  const defaultActiveDate = getDefaultTutorScheduleDate(selectedDates) || undefined;
  const [activeDate, setActiveDate] = useState<string | undefined>(() => defaultActiveDate);
  const activeDateSections = getTutorSchedulePreviewActiveSections(sections, activeDate);

  /** 切换预览对象时同步默认查看日期。 */
  useEffect(() => {
    setActiveDate(defaultActiveDate);
  }, [defaultActiveDate, summary]);

  return (
    <Modal
      ariaLabel={title}
      icon={<CalendarClock size={18} />}
      onClose={onClose}
      panelClassName="tutor-schedule-preview-panel mx-auto grid max-w-[540px] gap-[12px] overflow-hidden px-[14px] pb-[calc(16px+env(safe-area-inset-bottom))] pt-[16px]"
      title={
        <>
          <strong>{title}</strong>
          <span>{subtitle}</span>
        </>
      }
    >
        {scheduleItems.length > 0 ? (
          <div className="tutor-schedule-preview-body grid gap-[12px] overflow-auto pr-[2px]">
            <TrialScheduleCalendar
              activeDate={activeDate}
              initialDate={selectedDates[0]}
              maxSelectedDates={null}
              mode="view"
              onActiveDateChange={setActiveDate}
              scheduleItems={scheduleItems}
              selectedDates={selectedDates}
            />
            <div className="tutor-schedule-preview-detail grid gap-[6px]">
              <strong>{activeDate ? formatTrialScheduleDate(activeDate) : "请选择日期"}</strong>
              {activeDateSections.length > 0 ? (
                activeDateSections.map((section) => (
                  <span key={section.title}>
                    {section.title}：{section.times.join(" ")}
                  </span>
                ))
              ) : (
                <span>当日暂无安排</span>
              )}
            </div>
          </div>
        ) : (
          <article className="empty-state p-[14px] text-center">
            <strong>{emptyLabel}</strong>
            <span>当前记录未返回可查看的时间数据。</span>
          </article>
        )}

        <button className="primary-button min-h-[38px] px-[10px] py-[8px] text-white" onClick={onClose} type="button">
          关闭
        </button>
    </Modal>
  );
}

/** 结算弹窗，试课结算可预选雇佣意向，正式服务结算只提交金额。 */
function TutorTrialSettlement({ candidate, isSubmitting = false, mode = "trial", onClose, onConfirm }: TutorTrialSettlementProps) {
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
            <p>{(isServiceMode ? candidate.serviceSchedule : candidate.trialSchedule) || (isServiceMode ? "暂无课程安排" : "暂无试课安排")}</p>
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
        {!isTrialFeeValid && trialFee.trim() !== "" ? <span className="tutor-trial-settlement-error">请输入不小于 0 的金额</span> : null}

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
          <button className="ghost-button min-h-[38px] px-[10px] py-[8px]" disabled={isSubmitting} onClick={onClose} type="button">
            取消
          </button>
          <button
            className="primary-button min-h-[38px] px-[10px] py-[8px] text-white disabled:text-[#748092]"
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
