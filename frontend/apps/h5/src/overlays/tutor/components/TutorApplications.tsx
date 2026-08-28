import { createTutorTaskModel } from "@tools/tutorTaskWorkflow";
import { useConfirmAction } from "@h5/hooks/useConfirmAction";
import { getGenderIconColor } from "@shared/genderModel";
import { TutorCard } from "@pages/home/edu/components/TutorCard";

/** 家长端试课申请列表弹窗属性。 */
interface TutorApplicationsProps {
  applicationCandidates: TutorApplicationCandidate[];
  applicationConfirmationPending?: boolean;
  onClose: () => void;
  onCancelTrial?: (payload: { applicationId: string; demandId: string }) => void;
  onConfirm: (payload: {
    applicationId: string;
    demandId: string;
    trialEnd: string;
    trialHalfDay: string;
    trialStart: string;
  }) => void;
  onReject?: (payload: { applicationId: string; demandId: string }) => void;
  /** 该家教需求发布时家长选择的日期集合，供试课安排弹窗回显参考；候选人 availability 字段
   *  自申请试课流程简化后不再由学生真实填写，试课时段真正该参考的是这份需求发布日程。 */
  plannedDates: string[];
}

/** 获取申请卡片中已确认过的试课日程摘要。 */
function getCandidateTrialScheduleSummary(candidate: TutorApplicationCandidate | undefined) {
  if (!candidate) {
    return "";
  }

  const task = createTutorTaskModel({ candidate, role: "parent" });

  return task.node === "trialScheduled" ? (candidate.trialSchedule ?? "") : "";
}

/** 获取家长排期弹窗初始安排，仅在已有家长排期时回填，不默认选中学生可试课时间。 */
function getCandidateInitialTrialScheduleValue(candidate: TutorApplicationCandidate | undefined) {
  if (!candidate) {
    return null;
  }

  const existingTrialScheduleSummary = getCandidateTrialScheduleSummary(candidate);

  return existingTrialScheduleSummary ? getTrialScheduleValueFromSummary(existingTrialScheduleSummary) : null;
}

/** 家长端选择试课家教并确认试课安排。 */
export function TutorApplications({
  applicationCandidates,
  applicationConfirmationPending = false,
  onCancelTrial,
  onClose,
  onConfirm,
  onReject,
  plannedDates
}: TutorApplicationsProps) {
  const [selectedCandidateId, setSelectedCandidateId] = useState("");
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [scheduleSubtitle, setScheduleSubtitle] = useState("请选择试课日期和时间。");
  const [trialScheduleValue, setTrialScheduleValue] = useState<TrialScheduleValue | null>(null);
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
  const selectedCandidate = applicationCandidates.find((candidate) => candidate.id === selectedCandidateId);
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
    !applicationConfirmationPending &&
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
    if (applicationConfirmationPending) {
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

            return (
              <TutorCard
                className={isTrialConfirming ? "trial-confirming" : ""}
                detailTitle={candidate.nickname}
                footer={
                  candidateTask.node === "applicationPending" || candidateTask.node === "trialScheduled" ? (
                    <div className="tutor-application-actions flex flex-wrap gap-[8px]">
                      <button
                        className={`${
                          candidateTask.node === "trialScheduled" ? "text-button danger" : "danger-outline-button"
                        } inline-flex min-h-[30px] items-center justify-center gap-[5px] px-[9px] py-[6px] text-[12px]`}
                        disabled={applicationConfirmationPending}
                        onClick={() => {
                          if (candidateTask.node === "trialScheduled") {
                            openCancelConfirmation({
                              confirmLabel: "确认取消",
                              description: "取消后该学生本次试课安排结束，学生端与家长端列表会按真实状态刷新。",
                              onConfirm: () =>
                                onCancelTrial?.({ applicationId: candidate.id, demandId: candidate.demandId }),
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
                icon={<GraduationCap size={18} style={{ color: getGenderIconColor(candidate.gender) }} />}
                key={candidate.id}
                onSelect={() => handleSelectCandidate(candidate)}
                selected={isCandidateSelected}
                title={
                  <>
                    {candidate.nickname}
                    {isTrialConfirming ? (
                      <CardStatus
                        badgeClassName="tutor-application-status"
                        labels={candidateTask.displayStatusLabels}
                        stackClassName="tutor-application-status-stack"
                      />
                    ) : null}
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
            <span>{isSelectedCandidateTrialConfirming ? "调整试课计划" : "制定试课计划"}</span>
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
          disabled={!canConfirm}
          onClick={handleConfirm}
          type="button"
        >
          <CheckCircle2 size={16} />
          {getConfirmButtonLabel()}
        </button>
      </Modal>

      {isScheduleOpen ? (
        <Modal
          ariaLabel="试课安排"
          icon={<CalendarClock size={18} />}
          onClose={() => setIsScheduleOpen(false)}
          panelClassName="trial-schedule-sheet mx-auto grid max-h-[min(82vh,700px)] max-w-[540px] gap-[12px] overflow-hidden px-[14px] pb-[calc(14px+env(safe-area-inset-bottom))] pt-[14px]"
          title={
            <>
              <strong>试课安排</strong>
              <span className="trial-schedule-sheet__hint">{scheduleSubtitle}</span>
            </>
          }
        >
          <CalendarTime
            initialValue={trialScheduleValue ?? getCandidateInitialTrialScheduleValue(selectedCandidate)}
            plannedDates={plannedDates}
            onClose={() => setIsScheduleOpen(false)}
            onConfirm={(value) => {
              setTrialScheduleValue(value);
              setIsScheduleOpen(false);
            }}
            onSubtitleChange={setScheduleSubtitle}
          />
        </Modal>
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
