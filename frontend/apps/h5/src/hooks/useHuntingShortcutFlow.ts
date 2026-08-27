import type { useCreateHuntingProject } from "@unknown/hooks";
import { useTutorOverlayActions } from "@h5/overlays/tutor/provider";
import { getRouteForTab } from "@h5/router/paths";

/**
 * 狩猎快捷推荐流程入参。isHuntingShortcutEnabled/huntingShortcutProject 这两个状态需要在
 * useClientDataQueries（判断是否要连带查委托/狩猎数据）之前就绪，所以状态本身仍由调用方
 * （HomeProvider）持有，这个 hook 只接收受控状态 + setter，只负责行为编排，不拥有状态。
 */
interface UseHuntingShortcutFlowOptions {
  createHuntingProjectMutation: ReturnType<typeof useCreateHuntingProject>;
  currentAddressDraft: ProfileDraftState;
  isHuntingShortcutEnabled: boolean;
  navigate: (to: string) => void;
  refetchHuntingTasks: () => void;
  role: Role;
  setActiveTab: (tab: ClientModuleKey) => void;
  setHuntingShortcutProject: (project: HuntingProject | null) => void;
  setIsHuntingProjectOpen: (value: boolean) => void;
  setIsHuntingRecommendationOpen: (value: boolean) => void;
  setIsHuntingShortcutEnabled: (value: boolean) => void;
  setIsMineOpen: (value: boolean) => void;
  setIsOngoingOpen: (value: boolean) => void;
  setIsProfileCompletionOpen: (value: boolean) => void;
  setPageStack: (stack: PageSurface[]) => void;
  showMessage: (content: string, options?: MessageToastOptions) => void;
}

/** 狩猎快捷推荐流程：开启/关闭快捷开关、创建狩猎项目并触发系统推荐匹配。 */
export function useHuntingShortcutFlow({
  createHuntingProjectMutation,
  currentAddressDraft,
  isHuntingShortcutEnabled,
  navigate,
  refetchHuntingTasks,
  role,
  setActiveTab,
  setHuntingShortcutProject,
  setIsHuntingProjectOpen,
  setIsHuntingRecommendationOpen,
  setIsHuntingShortcutEnabled,
  setIsMineOpen,
  setIsOngoingOpen,
  setIsProfileCompletionOpen,
  setPageStack,
  showMessage
}: UseHuntingShortcutFlowOptions) {
  const { closeTutorOverlays } = useTutorOverlayActions();

  // 委托模块负责上线开关，这里只判断是否满足上线资料要求。
  function handleRequestHuntingOnline() {
    const huntingRequirement = getProfileRequirement(role, "hunting", currentAddressDraft);

    if (huntingRequirement) {
      showMessage(`请先补充${huntingRequirement.missingFields.map((field) => field.label).join("、")}`, {
        type: "warning"
      });
      setIsProfileCompletionOpen(true);
      return false;
    }

    return true;
  }

  function handleOpenHuntingShortcut() {
    if (isHuntingShortcutEnabled) {
      setIsHuntingRecommendationOpen(true);
      setIsHuntingProjectOpen(false);
      setIsMineOpen(false);
      setIsOngoingOpen(false);
      return;
    }

    if (!handleRequestHuntingOnline()) {
      setIsMineOpen(false);
      return;
    }

    setIsHuntingProjectOpen(true);
    setIsHuntingRecommendationOpen(false);
    setIsMineOpen(false);
    setIsOngoingOpen(false);
  }

  /** 创建狩猎项目并开启系统推荐，推荐数量由服务端根据动线匹配任务池生成。 */
  function handleCreateHuntingProject(draft: HuntingProjectDraft) {
    createHuntingProjectMutation.mutate(
      {
        currentArea: draft.currentArea,
        nextStops: draft.nextStops
      },
      {
        onSuccess: (project) => {
          const nextProject: HuntingProject = {
            createdAt: new Date().toISOString(),
            currentArea: project.currentArea,
            id: project.id,
            matchedTaskIds: [],
            nextStops: project.nextStops.map((stop, index) => ({
              ...stop,
              id: `stop_${index}_${project.id}`,
              inputMode: stop.inputMode === "custom" ? "custom" : "preset"
            })),
            status: project.status === "closed" ? "closed" : "matching"
          };

          setHuntingShortcutProject(nextProject);
          setIsHuntingShortcutEnabled(true);
          setIsHuntingProjectOpen(false);
          setActiveTab("hunting");
          setPageStack([]);
          setIsOngoingOpen(false);
          setIsMineOpen(false);
          setIsProfileCompletionOpen(false);
          closeTutorOverlays();
          navigate(getRouteForTab("hunting"));
          showMessage(`狩猎项目已创建，系统匹配到 ${project.matchedCount} 个推荐委托。`, { type: "success" });
          void refetchHuntingTasks();
        },
        onError: (error) => {
          showMessage(getErrorMessage(error, "狩猎项目创建失败，请稍后重试。"), { type: "error" });
        }
      }
    );
  }

  /** 关闭狩猎快捷推荐推送。 */
  function handleDisableHuntingShortcut() {
    setIsHuntingShortcutEnabled(false);
    setHuntingShortcutProject(null);
    setIsHuntingRecommendationOpen(false);
    showMessage("狩猎快捷已关闭。", { type: "success" });
  }

  /** 登录会话重置时一并清空狩猎快捷开关和本地项目草稿。 */
  function resetHuntingShortcut() {
    setIsHuntingShortcutEnabled(false);
    setHuntingShortcutProject(null);
  }

  return {
    handleCreateHuntingProject,
    handleDisableHuntingShortcut,
    handleOpenHuntingShortcut,
    resetHuntingShortcut
  };
}
