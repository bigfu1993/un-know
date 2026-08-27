import { TutorCertificationInfo } from "@components/TutorCertificationInfo";
import { TutorApplications } from "./components/TutorApplications";
import { TutorCalendar } from "./components/TutorCalendar";
import { TutorTrialList } from "./components/TutorTrialList";
import { getTutorDateKey } from "@tools/tutorCalendar";
import { useTutorOverlayActions, useTutorOverlayHost, useTutorOverlayState } from "./provider";

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
    plannedDates,
    profileDraft,
    saveCertificationInfo,
    trialListSubmissionPending,
    workflow
  } = useTutorOverlayHost();

  if (activeType === "tutorApplications") {
    return (
      <TutorApplications
        applicationCandidates={applicationCandidates}
        applicationConfirmationPending={applicationConfirmationPending}
        onCancelTrial={(payload) => void workflow({ ...payload, action: "cancel_trial" })}
        onClose={closeApplications}
        onConfirm={confirmTrial}
        onReject={(payload) => void workflow({ ...payload, action: "reject_trial" })}
        plannedDates={plannedDates}
      />
    );
  }

  if (activeType === "tutorTrialList") {
    return (
      <TutorTrialList
        applicationCandidates={applicationCandidates}
        onClose={closeTrialList}
        onConfirmEnd={confirmTrialEnd}
        onWorkflowAction={workflow}
        trialListSubmissionPending={trialListSubmissionPending}
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
    return <TutorCalendar calendarTasks={calendarTasks} initialDate={getTutorDateKey(new Date())} onClose={closeCalendar} />;
  }

  return null;
}
