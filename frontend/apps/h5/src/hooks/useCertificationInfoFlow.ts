import type { useUpdateTutorExposure } from "@unknown/hooks";
import { useTutorOverlayActions } from "@h5/overlays/tutor/provider";
import { getRouteForTab } from "@h5/router/paths";

/** 家教/狩猎认证信息面板与认证提交流程入参。 */
interface UseCertificationInfoFlowOptions {
  activeTab: ClientModuleKey;
  closeHuntingShortcutOverlays: () => void;
  navigate: (to: string, options?: { replace?: boolean }) => void;
  refetchHome: () => void;
  refetchTutorCertifiedStudents: () => void;
  setIsMineOpen: (value: boolean) => void;
  setIsOngoingOpen: (value: boolean) => void;
  setIsQuickDockExpanded: (value: boolean) => void;
  setPageStack: (stack: PageSurface[]) => void;
  showMessage: (content: string, options?: MessageToastOptions) => void;
  syncProfileDraft: (draft: ProfileDraftState) => void;
  updateTutorExposureMutation: ReturnType<typeof useUpdateTutorExposure>;
  userProfileDraft: ProfileDraftState;
}

/**
 * 家教认证信息面板（我的页家教卡片快捷入口）+ 家教/狩猎认证页提交后的收尾流程。
 * 两类认证提交（家教/狩猎）除了状态字段名和提示文案外逻辑完全一致，收敛成一个内部通用函数。
 */
export function useCertificationInfoFlow({
  activeTab,
  closeHuntingShortcutOverlays,
  navigate,
  refetchHome,
  refetchTutorCertifiedStudents,
  setIsMineOpen,
  setIsOngoingOpen,
  setIsQuickDockExpanded,
  setPageStack,
  showMessage,
  syncProfileDraft,
  updateTutorExposureMutation,
  userProfileDraft
}: UseCertificationInfoFlowOptions) {
  const { closeTutorOverlays } = useTutorOverlayActions();

  /** 切换家教资料公开状态，开启后允许家教认证信息被查看。 */
  function handleToggleTutorExposure() {
    const nextEnabled = userProfileDraft.tutorExposureEnabled !== "true";
    updateTutorExposureMutation.mutate(nextEnabled, {
      onSuccess: (response) => {
        const nextProfileDraft = {
          ...userProfileDraft,
          tutorExposureEnabled: response.enabled ? "true" : "false"
        };

        syncProfileDraft(nextProfileDraft);
        showMessage(
          response.enabled ? "开启家教，认证信息可被查看，我的-家教卡片可修改信息。" : "已关闭家教资料公开。",
          {
            type: "success"
          }
        );
        void refetchHome();
        void refetchTutorCertifiedStudents();
      },
      onError: (error) => {
        showMessage(getErrorMessage(error, "家教开关切换失败，请稍后重试。"), { type: "error" });
      }
    });
  }

  /** 家教/狩猎认证提交后的通用收尾：合并状态草稿、关闭全部残留浮层、提示并跳转回当前模块首页。 */
  function handleCertificationSubmitted(label: string, statusDraft: ProfileDraftState) {
    const nextProfileDraft = { ...userProfileDraft, ...statusDraft };

    syncProfileDraft(nextProfileDraft);
    setPageStack([]);
    setIsMineOpen(false);
    setIsOngoingOpen(false);
    setIsQuickDockExpanded(true);
    closeTutorOverlays();
    closeHuntingShortcutOverlays();
    showMessage(`${label}认证已提交，当前状态为认证中。`, { type: "success" });
    void refetchHome();
    navigate(getRouteForTab(activeTab), { replace: true });
  }

  /** 家教认证提交完成后回到当前主模块首页，并同步服务端返回的认证状态。 */
  function handleTutorCertificationSubmitted(
    tutorCertificationStatus: TutorCertificationStatus,
    nextCertificationDraft: ProfileDraftState
  ) {
    handleCertificationSubmitted("家教", { ...nextCertificationDraft, tutorCertificationStatus });
  }

  /** 狩猎认证提交完成后回到当前主模块首页，并同步服务端返回的认证状态。 */
  function handleHuntingCertificationSubmitted(
    huntingCertificationStatus: HuntingCertificationStatus,
    nextCertificationDraft: ProfileDraftState
  ) {
    handleCertificationSubmitted("狩猎", { ...nextCertificationDraft, huntingCertificationStatus });
  }

  return {
    handleHuntingCertificationSubmitted,
    handleToggleTutorExposure,
    handleTutorCertificationSubmitted
  };
}
