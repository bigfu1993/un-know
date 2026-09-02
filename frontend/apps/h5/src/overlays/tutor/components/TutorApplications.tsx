import { useGlobalUser } from "@h5/globalProvider";
import { useConfirmAction } from "@h5/hooks/useConfirmAction";
import { TutorCard } from "@pages/home/edu/components/TutorCard";
import { getGenderIconColor } from "@shared/genderModel";
import { getErrorMessage, showMessage } from "@tools/messageToast";
import { createTutorTaskModel } from "@tools/tutorTaskWorkflow";
import { useTutorTrialOccupancy } from "@unknown/hooks";
import { TutorSchedulePreview } from "./TutorSchedulePreview";
import { TutorTrialSettlement } from "./TutorTrialSettlement";

/** 家长端统一申请列表弹窗属性。 */
interface TutorApplicationsProps {
  applicationCandidates: TutorApplicationCandidate[];
  ongoingOrder: ClientOrder | null;
  onClose: () => void;
  onConfirmTrial: (payload: ConfirmTutorTrialPayload) => void;
  onWorkflowAction: (
    payload: TutorWorkflowActionRequest & {
      applicationId: string;
      demandId?: string;
    }
  ) => Promise<boolean> | boolean | void;
  submissionPending?: boolean;
}

/** 过滤空日程片段，保持预览配置为稳定结构。 */
function compactTutorSchedulePreviewSections(
  sections: Array<TutorSchedulePreviewSection | null | undefined>
): TutorSchedulePreviewSection[] {
  return sections.filter((section): section is TutorSchedulePreviewSection => Boolean(section));
}

/** 只有没有底部主操作的拒绝正式雇佣卡片不可选，其余阶段均由同一选中态驱动。 */
function canSelectApplicationCandidate(candidateTask: ReturnType<typeof createTutorTaskModel>) {
  return !candidateTask.can("removeRejectedServiceOffer");
}

/** 获取申请卡片中已确认过的试课日程摘要。 */
function getCandidateTrialScheduleSummary(candidate: TutorApplicationCandidate | undefined) {
  if (!candidate) {
    return "";
  }

  const task = createTutorTaskModel({ candidate, role: "parent" });

  return task.node === "trialScheduled" ? (candidate.trialSchedule ?? "") : "";
}

/** 已有家长试课排期时回填当前申请，不读取其他申请人的占用时间作为当前草稿。 */
function getCandidateInitialTrialScheduleValue(candidate: TutorApplicationCandidate | undefined) {
  const existingTrialScheduleSummary = getCandidateTrialScheduleSummary(candidate);

  return existingTrialScheduleSummary ? getTrialScheduleValueFromSummary(existingTrialScheduleSummary) : null;
}

/** 根据申请阶段生成卡片日程预览。 */
function getCandidateSchedulePreview(
  candidate: TutorApplicationCandidate,
  candidateTask: ReturnType<typeof createTutorTaskModel>
): TutorSchedulePreviewState {
  const trialScheduleSection = candidate.trialSchedule?.trim()
    ? {
        dataType: "tested" as const,
        summary: candidate.trialSchedule.trim(),
        title: "试课安排"
      }
    : null;

  if (candidateTask.node === "serviceSchedulePending") {
    const sections = compactTutorSchedulePreviewSections([
      candidate.availability?.trim()
        ? {
            dataType: "arranged" as const,
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
            dataType: "arranged" as const,
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

/** 家长端统一处理申请、试课、正式雇佣和结算阶段。 */
export function TutorApplications({
  applicationCandidates,
  ongoingOrder,
  onClose,
  onConfirmTrial,
  onWorkflowAction,
  submissionPending = false
}: TutorApplicationsProps) {
  const user = useGlobalUser();
  const [selectedCandidateId, setSelectedCandidateId] = useState("");
  const [isTrialScheduleOpen, setIsTrialScheduleOpen] = useState(false);
  const [isServiceScheduleOpen, setIsServiceScheduleOpen] = useState(false);
  const [scheduleSubtitle, setScheduleSubtitle] = useState("请选择试课日期和时间。");
  const [trialScheduleValue, setTrialScheduleValue] = useState<TrialScheduleValue | null>(null);
  const [schedulePreview, setSchedulePreview] = useState<TutorSchedulePreviewState | null>(null);
  const [settlementPanelState, setSettlementPanelState] = useState<{
    action: TutorSettlementAction;
    candidate: TutorApplicationCandidate;
    mode: "service" | "trial";
  } | null>(null);
  const {
    closeConfirmation: closeCancelConfirmation,
    confirmCurrentAction: confirmCancelAction,
    confirmation: cancelConfirmation,
    openConfirmation: openCancelConfirmation
  } = useConfirmAction();
  const visibleCandidates = useMemo(
    () =>
      applicationCandidates.filter(
        (candidate) => createTutorTaskModel({ candidate, role: "parent" }).isApplicationListVisible
      ),
    [applicationCandidates]
  );
  const selectedCandidate = visibleCandidates.find((candidate) => candidate.id === selectedCandidateId);
  const selectedCandidateTask = selectedCandidate
    ? createTutorTaskModel({ candidate: selectedCandidate, role: "parent" })
    : null;
  const canScheduleSelectedCandidate = Boolean(
    selectedCandidateTask?.can("scheduleTrial") || selectedCandidateTask?.can("rescheduleTrial")
  );
  const {
    data: trialOccupancy,
    error: trialOccupancyError,
    isPending: trialOccupancyPending
  } = useTutorTrialOccupancy(
    user.role,
    canScheduleSelectedCandidate ? (selectedCandidate?.id ?? null) : null,
    canScheduleSelectedCandidate
  );
  const canUseScheduleTemplateForDates = Boolean(
    ongoingOrder &&
      selectedCandidateTask &&
      ongoingOrder.id === selectedCandidate?.demandId &&
      canScheduleSelectedCandidate
  );
  const isSelectedCandidateTrialConfirming = selectedCandidateTask?.node === "trialScheduled";
  const selectedCandidateTrialScheduleSummary = getCandidateTrialScheduleSummary(selectedCandidate);
  const isTrialScheduleChanged = Boolean(
    isSelectedCandidateTrialConfirming &&
      trialScheduleValue?.plan.summary &&
      trialScheduleValue.plan.summary !== selectedCandidateTrialScheduleSummary
  );
  const canConfirmTrial = Boolean(
    selectedCandidate &&
      trialScheduleValue?.plan &&
      !submissionPending &&
      !trialOccupancyPending &&
      (!isSelectedCandidateTrialConfirming || isTrialScheduleChanged)
  );

  useEffect(() => {
    if (selectedCandidateId && !selectedCandidate) {
      setSelectedCandidateId("");
      setTrialScheduleValue(null);
    }
  }, [selectedCandidate, selectedCandidateId]);

  useEffect(() => {
    if (trialOccupancyError) {
      showMessage(getErrorMessage(trialOccupancyError, "试课占用时间加载失败，请稍后重试。"), { type: "error" });
    }
  }, [trialOccupancyError]);

  /** 提交指定申请人的流程动作。 */
  async function submitCandidateWorkflowAction(
    candidate: TutorApplicationCandidate,
    action: TutorWorkflowAction,
    payload: Partial<TutorWorkflowActionRequest> = {}
  ) {
    if (submissionPending) {
      return false;
    }

    return await onWorkflowAction({
      ...payload,
      action,
      applicationId: candidate.id,
      demandId: candidate.demandId
    });
  }

  /** 提交当前选中申请人的流程动作。 */
  async function handleWorkflowAction(action: TutorWorkflowAction, payload: Partial<TutorWorkflowActionRequest> = {}) {
    if (!selectedCandidate) {
      return;
    }

    await submitCandidateWorkflowAction(selectedCandidate, action, payload);
  }

  /** 选择申请卡并加载该申请自己的试课排期。 */
  function handleSelectCandidate(candidate: TutorApplicationCandidate) {
    const candidateTask = createTutorTaskModel({ candidate, role: "parent" });

    if (!canSelectApplicationCandidate(candidateTask)) {
      return;
    }
    if (selectedCandidateId === candidate.id) {
      setSelectedCandidateId("");
      setTrialScheduleValue(null);
      return;
    }

    setSelectedCandidateId(candidate.id);
    setTrialScheduleValue(getCandidateInitialTrialScheduleValue(candidate));
  }

  /** 提交家长为当前申请人制定的独立试课日程。 */
  function handleConfirmTrial() {
    if (!canConfirmTrial || !selectedCandidate || !trialScheduleValue) {
      return;
    }

    onConfirmTrial({
      applicationId: selectedCandidate.id,
      dates: trialScheduleValue.plan.dates,
      demandId: selectedCandidate.demandId
    });
  }

  /** 打开试课或正式课程结算弹窗。 */
  function openSettlementPanel(
    candidate: TutorApplicationCandidate,
    action: TutorSettlementAction,
    mode: "service" | "trial" = "trial"
  ) {
    setSettlementPanelState({ action, candidate, mode });
  }

  /** 提交结算金额及正式雇佣意向。 */
  async function handleConfirmSettlement(payload: TutorTrialSettlementPayload) {
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

  /** 家长明确不正式雇佣后继续处理其他申请。 */
  async function handleSelectNotHire() {
    if (!selectedCandidate) {
      return;
    }

    const result = await submitCandidateWorkflowAction(selectedCandidate, "close_trial_continue_recruiting");
    if (result !== false) {
      setSelectedCandidateId("");
    }
  }

  /** 获取试课日程提交按钮文案。 */
  function getConfirmTrialButtonLabel() {
    if (submissionPending) {
      return "提交中";
    }
    if (!selectedCandidateId) {
      return "选择试课家教";
    }
    if (isTrialScheduleChanged) {
      return "修改试课安排";
    }

    return "提交试课日程";
  }

  /** 渲染单张申请卡的独立操作。 */
  function renderCandidateCardActions(
    candidate: TutorApplicationCandidate,
    candidateTask: ReturnType<typeof createTutorTaskModel>
  ) {
    const actionButtons = candidateTask.can("rejectTrial") ? (
      <button
        className="danger-outline-button inline-flex min-h-[30px] items-center justify-center gap-[5px] px-[9px] py-[6px] text-[12px]"
        disabled={submissionPending}
        onClick={() => void submitCandidateWorkflowAction(candidate, "reject_trial")}
        type="button"
      >
        拒绝试课
      </button>
    ) : candidateTask.can("cancelApplication") ? (
      <button
        className="text-button danger inline-flex min-h-[30px] items-center justify-center gap-[5px] px-[9px] py-[6px] text-[12px]"
        disabled={submissionPending}
        onClick={() =>
          openCancelConfirmation({
            confirmLabel: "确认取消",
            description: "取消后该学生本次试课结束，学生端与申请列表会按真实状态刷新。",
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
        disabled={submissionPending}
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
          disabled={submissionPending}
          onClick={() => void submitCandidateWorkflowAction(candidate, "remove_rejected_service_offer")}
          type="button"
        >
          移除
        </button>
        <button
          className="primary-button inline-flex min-h-[30px] items-center justify-center gap-[5px] px-[9px] py-[6px] text-[12px] text-white"
          disabled={submissionPending}
          onClick={() => void submitCandidateWorkflowAction(candidate, "offer_service")}
          type="button"
        >
          再次委托
        </button>
      </>
    ) : null;

    return actionButtons ? (
      <div className="tutor-application-actions flex flex-wrap gap-[8px]">{actionButtons}</div>
    ) : null;
  }

  /** 按当前选中申请人的流程节点渲染唯一底部主操作。 */
  function renderSelectedCandidateActions() {
    if (!selectedCandidate || !selectedCandidateTask) {
      return (
        <button
          className="primary-button inline-flex min-h-[38px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white disabled:text-[var(--h5-subtle)]"
          disabled
          type="button"
        >
          <CheckCircle2 size={16} />
          选择申请人
        </button>
      );
    }

    if (canScheduleSelectedCandidate) {
      return (
        <>
          <div className="tutor-trial-form grid gap-[8px]">
            <button
              className={`tutor-trial-schedule-button ${trialScheduleValue ? "filled" : ""}`}
              disabled={trialOccupancyPending || Boolean(trialOccupancyError)}
              onClick={() => setIsTrialScheduleOpen(true)}
              type="button"
            >
              <CalendarClock size={17} />
              <span>
                {trialOccupancyPending
                  ? "加载占用时间"
                  : isSelectedCandidateTrialConfirming
                    ? "调整试课计划"
                    : "制定试课计划"}
              </span>
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
            className="primary-button inline-flex min-h-[38px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white disabled:text-[var(--h5-subtle)]"
            disabled={!canConfirmTrial}
            onClick={handleConfirmTrial}
            type="button"
          >
            <CheckCircle2 size={16} />
            {getConfirmTrialButtonLabel()}
          </button>
        </>
      );
    }

    if (selectedCandidateTask.can("requestTrialResult")) {
      return (
        <button
          className="primary-button inline-flex min-h-[38px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white"
          disabled={submissionPending}
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
          disabled={submissionPending}
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
            disabled={submissionPending}
            onClick={() => void handleSelectNotHire()}
            type="button"
          >
            不正式雇佣
          </button>
          <button
            className="primary-button min-h-[38px] px-[10px] py-[8px] text-white"
            disabled={submissionPending}
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
          disabled={submissionPending}
          onClick={() => setIsServiceScheduleOpen(true)}
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
          disabled={submissionPending}
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
          disabled={submissionPending}
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
        ariaLabel="家教申请列表"
        icon={<CalendarClock size={18} />}
        onClose={onClose}
        panelClassName="tutor-applications-panel mx-auto grid max-h-[min(76vh,620px)] max-w-[540px] gap-[12px] overflow-hidden px-[14px] pb-[calc(16px+env(safe-area-inset-bottom))] pt-[16px]"
        title={
          <>
            <strong>申请列表</strong>
            <span>共 {visibleCandidates.length} 位申请人</span>
          </>
        }
      >
        <div className="tutor-application-list grid gap-[10px] overflow-auto pr-[2px]">
          {visibleCandidates.map((candidate) => {
            const candidateTask = createTutorTaskModel({ candidate, role: "parent" });
            const canSelectCandidate = canSelectApplicationCandidate(candidateTask);
            const isCandidateSelected = selectedCandidateId === candidate.id;
            const schedulePreviewConfig = getCandidateSchedulePreview(candidate, candidateTask);
            const hasSchedulePreview = schedulePreviewConfig.sections.length > 0;

            return (
              <TutorCard
                className={`${candidateTask.statusToneClassName} ${canSelectCandidate ? "" : "not-selectable"}`}
                detailTitle={candidate.nickname}
                footer={
                  <>
                    {candidateTask.node !== "applicationPending" ? (
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
                    ) : null}
                    {renderCandidateCardActions(candidate, candidateTask)}
                  </>
                }
                icon={<GraduationCap size={18} style={{ color: getGenderIconColor(candidate.gender) }} />}
                key={candidate.id}
                onSelect={canSelectCandidate ? () => handleSelectCandidate(candidate) : undefined}
                selectOnFooter
                selected={isCandidateSelected && canSelectCandidate}
                title={
                  <>
                    {candidate.nickname}
                    <CardStatus
                      badgeClassName="tutor-application-status"
                      labels={candidateTask.displayStatusLabels}
                      stackClassName="tutor-application-status-stack"
                    />
                  </>
                }
                tutor={{
                  age: candidate.age,
                  availability: candidate.availability,
                  certificate: candidate.certificate,
                  education: candidate.education,
                  gender: candidate.gender,
                  gpa: candidate.gpa,
                  hiredTimes: candidate.hiredTimes,
                  idCard: candidate.idCard,
                  major: candidate.major,
                  nativePlace: candidate.nativePlace,
                  nickname: candidate.nickname,
                  phone: candidate.phone,
                  realName: candidate.realName,
                  school: candidate.school,
                  subject: candidate.subject,
                  xuexinScreenshot: candidate.xuexinScreenshot
                }}
              />
            );
          })}
          {visibleCandidates.length === 0 ? (
            <article className="empty-state p-[14px] text-center">
              <strong>暂无家教申请</strong>
              <span>新的申请和后续试课状态会在这里展示。</span>
            </article>
          ) : null}
        </div>

        {renderSelectedCandidateActions()}
      </Modal>

      {isTrialScheduleOpen && selectedCandidate ? (
        <Modal
          ariaLabel="试课安排"
          icon={<CalendarClock size={18} />}
          onClose={() => setIsTrialScheduleOpen(false)}
          panelClassName="trial-schedule-sheet mx-auto grid max-h-[min(82vh,700px)] max-w-[540px] gap-[12px] overflow-hidden px-[14px] pb-[calc(14px+env(safe-area-inset-bottom))] pt-[14px]"
          title={
            <>
              <strong>试课安排</strong>
              <span className="trial-schedule-sheet__hint">{scheduleSubtitle}</span>
            </>
          }
        >
          <CalendarTime
            canUseScheduleTemplateForDates={canUseScheduleTemplateForDates}
            initialValue={trialScheduleValue ?? getCandidateInitialTrialScheduleValue(selectedCandidate)}
            occupiedTestedDates={trialOccupancy?.occupiedTestedDates ?? []}
            onClose={() => setIsTrialScheduleOpen(false)}
            onConfirm={(value) => {
              setTrialScheduleValue(value);
              setIsTrialScheduleOpen(false);
            }}
            onSubtitleChange={setScheduleSubtitle}
            plannedDates={ongoingOrder?.plannedDates ?? []}
            scheduleType="tested"
          />
        </Modal>
      ) : null}

      {isServiceScheduleOpen && selectedCandidate ? (
        <Modal
          ariaLabel="正式雇佣日程"
          icon={<CalendarClock size={18} />}
          onClose={() => setIsServiceScheduleOpen(false)}
          panelClassName="trial-schedule-sheet mx-auto grid max-h-[min(82vh,700px)] max-w-[540px] gap-[12px] overflow-hidden px-[14px] pb-[calc(14px+env(safe-area-inset-bottom))] pt-[14px]"
          title={
            <>
              <strong>正式雇佣日程</strong>
              <span>请在学生提交的可家教时间内制定正式雇佣日程，提交后直接进入正式雇佣。</span>
            </>
          }
        >
          <CalendarTime
            blockedScheduleSummary={selectedCandidate.trialSchedule}
            canUseScheduleTemplateForDates={Boolean(
              ongoingOrder &&
                ongoingOrder.id === selectedCandidate.demandId &&
                selectedCandidateTask?.can("submitServiceSchedule")
            )}
            initialValue={null}
            maxScheduleDates={null}
            onClose={() => setIsServiceScheduleOpen(false)}
            onConfirm={(value) => {
              void handleWorkflowAction("submit_service_schedule", { tutorSchedule: value.plan.summary });
              setIsServiceScheduleOpen(false);
            }}
            plannedDates={ongoingOrder?.plannedDates ?? []}
            scheduleType="arranged"
          />
        </Modal>
      ) : null}

      {settlementPanelState ? (
        <TutorTrialSettlement
          candidate={settlementPanelState.candidate}
          mode={settlementPanelState.mode}
          onClose={() => setSettlementPanelState(null)}
          onConfirm={handleConfirmSettlement}
          submissionPending={submissionPending}
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
