import { useGlobalUser } from "@h5/globalProvider";
import { useConfirmAction } from "@h5/hooks/useConfirmAction";
import { TutorCard } from "@pages/home/edu/components/TutorCard";
import { getGenderIconColor } from "@shared/genderModel";
import { getErrorMessage, showMessage } from "@tools/messageToast";
import { createTutorTaskModel } from "@tools/tutorTaskWorkflow";
import { useTutorTrialOccupancy } from "@unknown/hooks";
import {
  canSelectApplicationCandidate,
  getCandidateInitialTrialScheduleValue,
  getCandidateSchedulePreview,
  TutorApplicationCardActions,
  TutorApplicationPrimaryAction
} from "./TutorApplicationActions";
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

/** 家教日程弹窗能否内部开放"使用模板"开关：目标需求就是当前进行中订单，且候选人当前
 *  具备对应流程能力（试课排期用 scheduleTrial/rescheduleTrial，正式雇佣日程用
 *  submitServiceSchedule），试课和正式雇佣两处弹窗共用同一条判断规则。 */
function canUseScheduleTemplateForOrder(
  ongoingOrder: ClientOrder | null,
  targetDemandId: string | undefined,
  hasScheduleAbility: boolean
): boolean {
  return Boolean(ongoingOrder && targetDemandId && ongoingOrder.id === targetDemandId && hasScheduleAbility);
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
  const canUseScheduleTemplateForDates = canUseScheduleTemplateForOrder(
    ongoingOrder,
    selectedCandidate?.demandId,
    canScheduleSelectedCandidate
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

  /** 提交家长为当前申请人制定的独立试课日程；按钮是否可点由 TutorApplicationPrimaryAction
   *  内部按同一批状态计算的 canConfirmTrial 控制，这里只做类型收窄。 */
  function handleConfirmTrial() {
    if (!selectedCandidate || !trialScheduleValue) {
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
                    <TutorApplicationCardActions
                      candidate={candidate}
                      candidateTask={candidateTask}
                      onOpenCancelConfirmation={openCancelConfirmation}
                      onSubmitAction={(actionCandidate, action) => void submitCandidateWorkflowAction(actionCandidate, action)}
                      submissionPending={submissionPending}
                    />
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

        <TutorApplicationPrimaryAction
          canScheduleSelectedCandidate={canScheduleSelectedCandidate}
          onConfirmTrial={handleConfirmTrial}
          onOpenServiceSchedule={() => setIsServiceScheduleOpen(true)}
          onOpenSettlement={openSettlementPanel}
          onOpenTrialSchedule={() => setIsTrialScheduleOpen(true)}
          onSelectNotHire={() => void handleSelectNotHire()}
          onWorkflowAction={(action) => void handleWorkflowAction(action)}
          selectedCandidate={selectedCandidate}
          selectedCandidateTask={selectedCandidateTask}
          submissionPending={submissionPending}
          trialOccupancyError={trialOccupancyError}
          trialOccupancyPending={trialOccupancyPending}
          trialScheduleValue={trialScheduleValue}
        />
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
            canUseScheduleTemplateForDates={canUseScheduleTemplateForOrder(
              ongoingOrder,
              selectedCandidate.demandId,
              Boolean(selectedCandidateTask?.can("submitServiceSchedule"))
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
