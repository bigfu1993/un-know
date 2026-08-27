import { TutorCalendar } from "@components/TutorCalendar";
import { TutorCertificationInfo } from "@components/TutorCertificationInfo";
import { TutorApplications, TutorTrialList } from "./components/TutorApplications";
import { getTutorDateKey } from "@tools/tutorCalendar";
import { useTutorOverlayActions, useTutorOverlayHost, useTutorOverlayState } from "./context";

/** 渲染家教申请、试课列表、认证信息和课程日历四类全局弹层。 */
export function TutorOverlayHost() {
  const { activeType } = useTutorOverlayState();
  const { closeApplications, closeCalendar, closeCertificationInfo, closeTrialList } = useTutorOverlayActions();
  const {
    applicationCandidates,
    applicationConfirmationPending,
    calendarTasks,
    confirmTrial,
    confirmTrialEnd,
    demandPeriodDates,
    profileDraft,
    saveCertificationInfo,
    trialListSubmissionPending,
    workflow
  } = useTutorOverlayHost();

  if (activeType === "tutorApplications") {
    return (
      <TutorApplications
        candidates={applicationCandidates}
        demandPeriodDates={demandPeriodDates}
        isConfirming={applicationConfirmationPending}
        onCancelTrial={(payload) => void workflow({ ...payload, action: "cancel_trial" })}
        onClose={closeApplications}
        onConfirm={confirmTrial}
        onReject={(payload) => void workflow({ ...payload, action: "reject_trial" })}
      />
    );
  }

  if (activeType === "tutorTrialList") {
    return (
      <TutorTrialList
        candidates={applicationCandidates}
        isSubmitting={trialListSubmissionPending}
        onClose={closeTrialList}
        onConfirmEnd={confirmTrialEnd}
        onWorkflowAction={workflow}
      />
    );
  }

  if (activeType === "tutorCertificationInfo") {
    return (
      <TutorCertificationInfo
        onClose={closeCertificationInfo}
        onSave={saveCertificationInfo}
        profileDraft={profileDraft}
      />
    );
  }

  if (activeType === "tutorCalendar") {
    return <TutorCalendar initialDate={getTutorDateKey(new Date())} onClose={closeCalendar} tasks={calendarTasks} />;
  }

  return null;
}
