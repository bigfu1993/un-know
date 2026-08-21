/** 登录会话生命周期入参。 */
interface UseAuthSessionFlowOptions {
  clearUser: () => void;
  /** 关闭跨页面残留浮层和全部全局 Overlay，见 useOverlayController.closeRouteOverlays。 */
  closeRouteOverlays: () => void;
  hideMessage: () => void;
  navigate: (to: string, options?: { replace?: boolean; state?: unknown }) => void;
  resetForRole: (role: Role) => void;
  /** 关闭狩猎快捷开关并清空本地项目草稿，见 useHuntingShortcutFlow.resetHuntingShortcut。 */
  resetHuntingShortcut: () => void;
  setIsProfileCompletionOpen: (value: boolean) => void;
  showMessage: (content: string, options?: MessageToastOptions) => void;
}

/**
 * App 登录会话生命周期：退出登录、登录态过期时统一重置浮层/表单/狩猎快捷状态，
 * 避免上一个账号的残留 UI 状态带进下一个会话。
 */
export function useAuthSessionFlow({
  clearUser,
  closeRouteOverlays,
  hideMessage,
  navigate,
  resetForRole,
  resetHuntingShortcut,
  setIsProfileCompletionOpen,
  showMessage
}: UseAuthSessionFlowOptions) {
  /** 清理应用级登录会话，并按场景回到登录页。 */
  const resetAuthenticatedSession = useCallback(
    (reason?: "expired") => {
      clearUser();
      resetForRole("student");
      closeRouteOverlays();
      setIsProfileCompletionOpen(false);
      resetHuntingShortcut();
      if (reason === "expired") {
        showMessage("登录状态已过期，请重新登录。", { type: "warning" });
      } else {
        hideMessage();
      }
      navigate("/login", { replace: true });
    },
    [
      clearUser,
      closeRouteOverlays,
      hideMessage,
      navigate,
      resetForRole,
      resetHuntingShortcut,
      setIsProfileCompletionOpen,
      showMessage
    ]
  );

  function handleLogout() {
    resetAuthenticatedSession();
  }

  return { handleLogout, resetAuthenticatedSession };
}
