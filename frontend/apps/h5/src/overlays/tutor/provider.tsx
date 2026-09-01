import { useGlobalUser } from "@h5/globalProvider";
import { getTutorWorkflowSuccessMessage } from "@pages/home/edu/model";
import { showMessage } from "@tools/messageToast";
import { getTutorCalendarTasks } from "@tools/tutorCalendar";
import {
  useConfirmTutorTrial,
  useHandleTutorWorkflowAction,
  useOngoingOrderSnapshot,
  useTutorApplication
} from "@unknown/hooks";
import { useOverlayActions, useOverlayState } from "../provider";

/** 家教域全部全局弹层类型。 */
const tutorOverlayTypes: TutorOverlayType[] = [
  "tutorApplications",
  "tutorTrialList",
  "tutorCalendar",
  "tutorCertificationInfo"
];

/** 家教 Host 业务数据与动作 Context，保持文件私有；外部统一通过 useTutorOverlayHost 消费。 */
const TutorOverlayHostContext = createContext<TutorOverlayHostContextValue | null>(null);

/** 读取家教弹层稳定命令，触发组件无需订阅弹层状态。 */
export function useTutorOverlayActions(): TutorOverlayActions {
  const { closeOverlay, closeOverlays, openOverlay } = useOverlayActions();

  return useMemo(
    () => ({
      closeApplications: () => closeOverlay("tutorApplications"),
      closeCalendar: () => closeOverlay("tutorCalendar"),
      closeCertificationInfo: () => closeOverlay("tutorCertificationInfo"),
      closeTrialList: () => closeOverlay("tutorTrialList"),
      closeTutorOverlays: () => closeOverlays(tutorOverlayTypes),
      openApplications: (demandId: string) =>
        openOverlay({ lane: "secondary", targetId: demandId, type: "tutorApplications" }),
      openCalendar: () => openOverlay({ lane: "secondary", type: "tutorCalendar" }),
      openCertificationInfo: () => openOverlay({ lane: "secondary", type: "tutorCertificationInfo" }),
      openTrialList: (demandId: string) =>
        openOverlay({ lane: "secondary", targetId: demandId, type: "tutorTrialList" })
    }),
    [closeOverlay, closeOverlays, openOverlay]
  );
}

/** 读取当前家教弹层类型和目标需求。 */
export function useTutorOverlayState(): TutorOverlayState {
  const overlayState = useOverlayState();
  const secondaryOverlay = overlayState.secondary;
  const activeType =
    secondaryOverlay && tutorOverlayTypes.includes(secondaryOverlay.type as TutorOverlayType)
      ? (secondaryOverlay.type as TutorOverlayType)
      : null;

  return {
    activeType,
    isApplicationsOpen: activeType === "tutorApplications",
    isCalendarOpen: activeType === "tutorCalendar",
    isCertificationInfoOpen: activeType === "tutorCertificationInfo",
    isTrialListOpen: activeType === "tutorTrialList",
    targetDemandId: activeType ? (secondaryOverlay?.targetId ?? null) : null
  };
}

/** 读取家教 Host 需要的真实业务数据和动作。 */
export function useTutorOverlayHost() {
  const context = useContext(TutorOverlayHostContext);

  if (!context) {
    throw new Error("useTutorOverlayHost 必须在 TutorOverlayProvider 内使用。");
  }

  return context;
}

/** 管理家教全局弹层的真实查询、mutation、资料草稿和用户反馈。 */
export function TutorOverlayProvider({ children, syncProfileDraft }: TutorOverlayProviderProps) {
  const user = useGlobalUser();
  const { isApplicationsOpen, isTrialListOpen, targetDemandId } = useTutorOverlayState();
  const { closeApplications, closeCertificationInfo } = useTutorOverlayActions();
  const { data: tutorApplicants, error: tutorApplicationError } = useTutorApplication(
    user.role,
    targetDemandId,
    isApplicationsOpen || isTrialListOpen
  );
  /** 使用进行中订单接口的完整缓存快照，为弹层提供计划日期和真实流程阶段。 */
  const ongoingOrder = useOngoingOrderSnapshot(user.role, targetDemandId);
  const { isPending: confirmTrialPending, mutateAsync: confirmTutorTrial } = useConfirmTutorTrial();
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
      ongoingOrder,
      profileDraft: user.profileDraft,
      saveCertificationInfo,
      trialListSubmissionPending: workflowPending,
      workflow
    }),
    [
      applicationCandidates,
      calendarTasks,
      confirmTrial,
      confirmTrialPending,
      ongoingOrder,
      saveCertificationInfo,
      workflow,
      workflowPending,
      user.profileDraft
    ]
  );

  return <TutorOverlayHostContext.Provider value={host}>{children}</TutorOverlayHostContext.Provider>;
}
