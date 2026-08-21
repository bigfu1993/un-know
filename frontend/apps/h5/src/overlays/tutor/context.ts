import { useOverlayActions, useOverlayState } from "../context";

/** 家教域全部全局弹层类型。 */
export const tutorOverlayTypes: TutorOverlayType[] = [
  "tutorApplications",
  "tutorTrialList",
  "tutorCalendar",
  "tutorCertificationInfo"
];

/** 家教 Host 业务数据与动作 Context。 */
export const TutorOverlayHostContext = createContext<TutorOverlayHostContextValue | null>(null);

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
