import { createTutorTaskModel } from "@tools/tutorTaskWorkflow";
import { useConfirmAction } from "@h5/hooks/useConfirmAction";
import { TutorSchedulePreview } from "./TutorSchedulePreview";
import { TutorTrialSettlement } from "./TutorTrialSettlement";

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
  onWorkflowAction: (
    payload: TutorWorkflowActionRequest & {
      applicationId: string;
      demandId?: string;
    }
  ) => Promise<boolean> | boolean | void;
}

/** 过滤空日程片段，避免调用处为类型收窄创建 raw 中转变量。 */
function compactTutorSchedulePreviewSections(
  sections: Array<TutorSchedulePreviewSection | null | undefined>
): TutorSchedulePreviewSection[] {
  return sections.filter((section): section is TutorSchedulePreviewSection => Boolean(section));
}

/** 判断试课列表卡片是否允许被选中并触发底部主操作。 */
function canSelectTrialCandidateCard(candidateTask: ReturnType<typeof createTutorTaskModel>) {
  return candidateTask.node !== "trialScheduled" && !candidateTask.can("removeRejectedServiceOffer");
}

/** 获取试课列表卡片的时间预览配置，避免直接在卡片内铺开长时间范围。 */
function getTutorTrialCandidateSchedulePreview(
  candidate: TutorApplicationCandidate,
  candidateTask: ReturnType<typeof createTutorTaskModel>
): TutorSchedulePreviewState {
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

/** 家长端查看试课中的家教，并处理试课、正式雇佣、兼职日程和结算链路。 */
export function TutorTrialList({ candidates, isSubmitting = false, onClose, onWorkflowAction }: TutorTrialListProps) {
  const [hiddenTrialCandidateIds, setHiddenTrialCandidateIds] = useState<string[]>([]);
  const [schedulePreview, setSchedulePreview] = useState<TutorSchedulePreviewState | null>(null);
  const trialCandidates = useMemo(
    () =>
      candidates.filter(
        (candidate) =>
          createTutorTaskModel({ candidate, role: "parent" }).isTrialListVisible &&
          !hiddenTrialCandidateIds.includes(candidate.id)
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
  function openSettlementPanel(
    candidate: TutorApplicationCandidate,
    action: TutorSettlementAction,
    mode: "service" | "trial" = "trial"
  ) {
    setSettlementPanelState({ action, candidate, mode });
  }

  /** 提交结算金额，可同时提交家长的正式雇佣意向。 */
  async function handleConfirmTrialSettlement(payload: TutorTrialSettlementPayload) {
    if (!settlementPanelState) {
      return;
    }

    const result = await submitCandidateWorkflowAction(
      settlementPanelState.candidate,
      settlementPanelState.action,
      payload
    );
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
  function renderTrialCandidateCardActions(
    candidate: TutorApplicationCandidate,
    candidateTask: ReturnType<typeof createTutorTaskModel>
  ) {
    const actionButtons = candidateTask.can("cancelApplication") ? (
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
    ) : candidateTask.can("cancelServiceConfirmation") ? (
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
    ) : candidateTask.can("removeRejectedServiceOffer") ? (
      <>
        <button
          className="ghost-button min-h-[30px] px-[9px] py-[6px] text-[12px] text-[var(--h5-muted)]"
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
      </>
    ) : null;

    return actionButtons ? <div className="tutor-application-actions flex flex-wrap gap-[8px]">{actionButtons}</div> : null;
  }

  /** 按当前流程节点渲染家长可执行动作。 */
  function renderSelectedCandidateActions() {
    if (!selectedCandidate || !selectedCandidateTask) {
      return (
        <button
          className="primary-button inline-flex min-h-[38px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white disabled:text-[var(--h5-subtle)]"
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
        className="ghost-button inline-flex min-h-[38px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-[var(--h5-muted)]"
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
            <span>
              {isCourseMode
                ? `共 ${trialCandidates.length} 位，处理正式雇佣课程和结束`
                : `共 ${trialCandidates.length} 位，按流程处理试课、正式雇佣和日程`}
            </span>
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
                } ${canSelectTrialCandidate ? "" : "not-selectable"} ${candidateTask.statusToneClassName}`}
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
                    <CardStatus
                      badgeClassName="tutor-application-status"
                      labels={candidateTask.displayStatusLabels}
                      stackClassName="tutor-application-status-stack"
                    />
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
        <Modal
          ariaLabel="正式雇佣日程"
          icon={<CalendarClock size={18} />}
          onClose={() => setIsTutorScheduleOpen(false)}
          panelClassName="trial-schedule-sheet mx-auto grid max-h-[min(82vh,700px)] max-w-[540px] gap-[12px] overflow-hidden px-[14px] pb-[calc(14px+env(safe-area-inset-bottom))] pt-[14px]"
          title={
            <>
              <strong>正式雇佣日程</strong>
              <span>请在学生提交的可家教时间内制定正式雇佣日程，提交后直接进入正式雇佣。</span>
            </>
          }
        >
          <CalendarTime
            availableScheduleSummary={selectedCandidate.availability}
            blockedScheduleLabel="试"
            blockedScheduleSummary={selectedCandidate.trialSchedule}
            initialValue={null}
            maxPlannedDates={null}
            onClose={() => setIsTutorScheduleOpen(false)}
            onConfirm={(value) => {
              void handleWorkflowAction("submit_service_schedule", { tutorSchedule: value.plan.summary });
              setIsTutorScheduleOpen(false);
            }}
            scheduleLabel="课"
          />
        </Modal>
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

      {schedulePreview ? <TutorSchedulePreview {...schedulePreview} onClose={() => setSchedulePreview(null)} /> : null}
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
