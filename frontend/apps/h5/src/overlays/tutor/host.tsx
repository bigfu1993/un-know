import { TutorCertificationInfo } from "@components/TutorCertificationInfo";
import { TutorApplications } from "./components/TutorApplications";
import { TutorCalendar } from "./components/TutorCalendar";
import { useTutorOverlayActions, useTutorOverlayHost, useTutorOverlayState } from "./provider";

/** 渲染家教申请、认证信息和课程日历三类全局弹层。 */
export function TutorOverlayHost() {
  const { activeType } = useTutorOverlayState();
  const { closeApplications, closeCalendar, closeCertificationInfo } = useTutorOverlayActions();
  const {
    applicationCandidates,
    applicationSubmissionPending,
    calendarTasks,
    confirmTrial,
    ongoingOrder,
    profileDraft,
    saveCertificationInfo,
    workflow
  } = useTutorOverlayHost();

  if (activeType === "tutorApplications") {
    return (
      <TutorApplications
        applicationCandidates={applicationCandidates}
        onClose={closeApplications}
        onConfirmTrial={confirmTrial}
        onWorkflowAction={workflow}
        ongoingOrder={ongoingOrder}
        submissionPending={applicationSubmissionPending}
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
    return <TutorCalendar calendarTasks={calendarTasks} onClose={closeCalendar} />;
  }

  return null;
}
