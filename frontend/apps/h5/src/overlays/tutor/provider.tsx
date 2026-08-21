import { useGlobalUser } from "@h5/store/global";
import { getTutorWorkflowSuccessMessage } from "@pages/home/edu/model";
import { showMessage } from "@tools/messageToast";
import { getTutorCalendarTasks } from "@tools/tutorCalendar";
import {
  useCompleteTutorTrialEnd,
  useConfirmTutorTrial,
  useHandleTutorWorkflowAction,
  useTutorApplications
} from "@unknown/hooks";
import { TutorOverlayHostContext, useTutorOverlayActions, useTutorOverlayState } from "./context";

/** React Query 首次返回家教需求前使用的稳定空数组。 */
const emptyTutorApplications: TutorDemand[] = [];

/** 管理家教全局弹层的真实查询、mutation、资料草稿和用户反馈。 */
export function TutorOverlayProvider({ children, syncProfileDraft }: TutorOverlayProviderProps) {
  const user = useGlobalUser();
  const { isApplicationsOpen, isTrialListOpen } = useTutorOverlayState();
  const { closeApplications, closeCertificationInfo, closeTrialList } = useTutorOverlayActions();
  const { data: tutorApplications = emptyTutorApplications, error: tutorApplicationsError } = useTutorApplications(
    user.role,
    isApplicationsOpen || isTrialListOpen
  );
  const { isPending: confirmTrialPending, mutateAsync: confirmTutorTrial } = useConfirmTutorTrial();
  const { isPending: confirmTrialEndPending, mutateAsync: completeTutorTrialEnd } = useCompleteTutorTrialEnd();
  const { isPending: workflowPending, mutateAsync: submitTutorWorkflowAction } = useHandleTutorWorkflowAction();
  const applicationCandidates = useMemo<TutorApplicationCandidate[]>(
    () =>
      tutorApplications.flatMap((demand) =>
        demand.applicants.map((applicant) => ({
          availability: applicant.availability,
          demandId: demand.id,
          gpa: applicant.gpa,
          hiredTimes: applicant.hiredTimes,
          id: applicant.id,
          major: applicant.major,
          nickname: applicant.nickname,
          school: applicant.school,
          serviceConfirmationCancelledBy: applicant.serviceConfirmationCancelledBy,
          serviceSchedule: applicant.serviceSchedule,
          status: applicant.status,
          trialFee: applicant.trialFee,
          trialSchedule: applicant.trialSchedule
        }))
      ),
    [tutorApplications]
  );
  const calendarTasks = useMemo(() => getTutorCalendarTasks(user.profileDraft), [user.profileDraft]);

  /** 确认家教试课安排，并由 mutation 失效策略刷新相关查询。 */
  const confirmTrial = useCallback(
    async (payload: ConfirmTutorTrialPayload) => {
      try {
        await confirmTutorTrial(payload);
        closeApplications();
        showMessage("试课安排已提交，学生端可在进行中查看试课安排。", { type: "success" });
      } catch (error) {
        showMessage(getErrorMessage(error, "试课安排提交失败，请稍后重试。"), { type: "error" });
      }
    },
    [closeApplications, confirmTutorTrial]
  );

  /** 确认家教试课结束信息，并由 mutation 失效策略刷新相关查询。 */
  const confirmTrialEnd = useCallback(
    async (payload: CompleteTutorTrialEndPayload) => {
      try {
        await completeTutorTrialEnd(payload);
        closeTrialList();
        showMessage("试课费用已提交，等待学生确认。", { type: "success" });
      } catch (error) {
        showMessage(getErrorMessage(error, "结束试课确认处理失败，请稍后重试。"), { type: "error" });
      }
    },
    [closeTrialList, completeTutorTrialEnd]
  );

  /** 提交家教弹层中的流程动作。 */
  const workflow = useCallback(
    async (payload: TutorWorkflowActionPayload) => {
      try {
        await submitTutorWorkflowAction(payload);
        showMessage(getTutorWorkflowSuccessMessage(payload), { type: "success" });
        return true;
      } catch (error) {
        showMessage(getErrorMessage(error, "家教流程处理失败，请稍后重试。"), { type: "error" });
        return false;
      }
    },
    [submitTutorWorkflowAction]
  );

  /** 保存或重新提交家教认证资料。 */
  const saveCertificationInfo = useCallback(
    (nextProfileDraft: ProfileDraftState, mode: TutorCertificationInfoSaveMode) => {
      const shouldRecertify = mode === "recertify";

      syncProfileDraft({
        ...nextProfileDraft,
        ...(shouldRecertify
          ? {
              tutorCertificationStatus: "reviewing",
              tutorExposureEnabled: "false"
            }
          : {})
      });
      closeCertificationInfo();
      showMessage(shouldRecertify ? "家教认证已重新提交，当前状态为认证中。" : "家教认证信息已更新。", {
        type: "success"
      });
    },
    [closeCertificationInfo, syncProfileDraft]
  );

  useEffect(() => {
    if (tutorApplicationsError) {
      showMessage(getErrorMessage(tutorApplicationsError, "家教申请列表加载失败，请稍后重试。"), { type: "error" });
    }
  }, [tutorApplicationsError]);

  const host = useMemo<TutorOverlayHostContextValue>(
    () => ({
      applicationCandidates,
      applicationConfirmationPending: confirmTrialPending || workflowPending,
      calendarTasks,
      confirmTrial,
      confirmTrialEnd,
      profileDraft: user.profileDraft,
      saveCertificationInfo,
      trialListSubmissionPending: confirmTrialEndPending || workflowPending,
      workflow
    }),
    [
      applicationCandidates,
      calendarTasks,
      confirmTrial,
      confirmTrialEnd,
      confirmTrialEndPending,
      confirmTrialPending,
      saveCertificationInfo,
      workflow,
      workflowPending,
      user.profileDraft
    ]
  );

  return <TutorOverlayHostContext.Provider value={host}>{children}</TutorOverlayHostContext.Provider>;
}
