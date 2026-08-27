import { useGlobalUser } from "@h5/globalProvider";
import { getTutorWorkflowSuccessMessage } from "@pages/home/edu/model";
import { showMessage } from "@tools/messageToast";
import { getTutorCalendarTasks } from "@tools/tutorCalendar";
import {
  useCompleteTutorTrialEnd,
  useConfirmTutorTrial,
  useHandleTutorWorkflowAction,
  useOngoingOrdersSnapshot,
  useTutorApplication
} from "@unknown/hooks";
import { TutorOverlayHostContext, useTutorOverlayActions, useTutorOverlayState } from "./context";

/** 管理家教全局弹层的真实查询、mutation、资料草稿和用户反馈。 */
export function TutorOverlayProvider({ children, syncProfileDraft }: TutorOverlayProviderProps) {
  const user = useGlobalUser();
  const { isApplicationsOpen, isTrialListOpen, targetDemandId } = useTutorOverlayState();
  const { closeApplications, closeCertificationInfo, closeTrialList } = useTutorOverlayActions();
  const { data: tutorApplicants, error: tutorApplicationError } = useTutorApplication(
    user.role,
    targetDemandId,
    isApplicationsOpen || isTrialListOpen
  );
  /** 直接读取"进行中"列表已缓存的查询结果，找到当前弹层目标需求发布时选择的日期，供试课安排
   *  弹窗回显参考；学生端申请试课已不再要求先提交可试课时间（详见后端 applyTutorTrial 说明），
   *  试课时段安排真正应该参考的是家长发布家教时选择的日程，不是候选人早已失效的 availability
   *  字段。触发弹层的订单卡片本身就是从这份缓存渲染出来的，不需要再订阅一次查询去保证数据可用，
   *  避免每次打开弹层都因默认 staleTime 额外发一次 /client/workspace/ongoing 请求。 */
  const demandPeriodDates = useOngoingOrdersSnapshot(user.role, targetDemandId);
  const { isPending: confirmTrialPending, mutateAsync: confirmTutorTrial } = useConfirmTutorTrial();
  const { isPending: confirmTrialEndPending, mutateAsync: completeTutorTrialEnd } = useCompleteTutorTrialEnd();
  const { isPending: workflowPending, mutateAsync: submitTutorWorkflowAction } = useHandleTutorWorkflowAction();
  const applicationCandidates = useMemo<TutorApplicationCandidate[]>(
    () =>
      targetDemandId
        ? (tutorApplicants ?? []).map((applicant) => ({
            age: applicant.tutorCertification.age,
            availability: applicant.availability,
            certificate: applicant.tutorCertification.certificate,
            demandId: targetDemandId,
            education: applicant.tutorCertification.education,
            gender: applicant.tutorCertification.gender,
            gpa: applicant.tutorCertification.gpa ?? "",
            hiredTimes: applicant.hiredTimes,
            id: applicant.id,
            idCard: applicant.tutorCertification.id_card,
            major: applicant.tutorCertification.major,
            nativePlace: applicant.tutorCertification.native_place,
            nickname: applicant.tutorInformation.nickname,
            phone: applicant.tutorInformation.phone,
            realName: applicant.tutorCertification.real_name,
            school: applicant.tutorCertification.school,
            serviceConfirmationCancelledBy: applicant.serviceConfirmationCancelledBy,
            serviceSchedule: applicant.serviceSchedule,
            status: applicant.status,
            subject: applicant.tutorCertification.subject,
            trialFee: applicant.trialFee,
            trialSchedule: applicant.trialSchedule,
            xuexinScreenshot: applicant.tutorCertification.xuexin_screenshot
          }))
        : [],
    [targetDemandId, tutorApplicants]
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
    if (tutorApplicationError) {
      showMessage(getErrorMessage(tutorApplicationError, "家教申请列表加载失败，请稍后重试。"), { type: "error" });
    }
  }, [tutorApplicationError]);

  const host = useMemo<TutorOverlayHostContextValue>(
    () => ({
      applicationCandidates,
      applicationConfirmationPending: confirmTrialPending || workflowPending,
      calendarTasks,
      confirmTrial,
      confirmTrialEnd,
      demandPeriodDates,
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
      demandPeriodDates,
      saveCertificationInfo,
      workflow,
      workflowPending,
      user.profileDraft
    ]
  );

  return <TutorOverlayHostContext.Provider value={host}>{children}</TutorOverlayHostContext.Provider>;
}
