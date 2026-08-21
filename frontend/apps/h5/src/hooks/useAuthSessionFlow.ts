import { getDefaultRouteForRole } from "@h5/router/paths";

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
  resetProfileDraftForPhone: (phone: string) => void;
  setIsProfileCompletionOpen: (value: boolean) => void;
  setUserSession: (session: LoginResponse) => void;
  showMessage: (content: string, options?: MessageToastOptions) => void;
}

/**
 * App 登录会话生命周期：登录成功、退出登录、登录态过期时统一重置浮层/表单/狩猎快捷状态，
 * 避免上一个账号的残留 UI 状态带进下一个会话。
 */
export function useAuthSessionFlow({
  clearUser,
  closeRouteOverlays,
  hideMessage,
  navigate,
  resetForRole,
  resetHuntingShortcut,
  resetProfileDraftForPhone,
  setIsProfileCompletionOpen,
  setUserSession,
  showMessage
}: UseAuthSessionFlowOptions) {
  /** 登录成功后回到该角色默认首页，并重置跨会话残留的浮层和业务草稿状态。 */
  function handleLoginSuccess(session: LoginResponse) {
    setUserSession(session);
    resetForRole(session.role);
    closeRouteOverlays();
    setIsProfileCompletionOpen(false);
    resetHuntingShortcut();
    resetProfileDraftForPhone(session.phone);
    showMessage(session.profileCompletionRequired ? "登录成功，可稍后进入设置补充资料。" : "登录成功。", {
      type: "success"
    });
    navigate(getDefaultRouteForRole(session.role), { replace: true });
  }

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

  return { handleLoginSuccess, handleLogout, resetAuthenticatedSession };
}
