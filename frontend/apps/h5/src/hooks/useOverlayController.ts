import { useOverlayActions } from "@h5/overlays/context";

/** App 通用浮层控制器，管理头像、进行中和狩猎快捷浮层，并协调全局弹层关闭。 */
export function useOverlayController() {
  const { closeAllOverlays } = useOverlayActions();
  const [isOngoingOpen, setIsOngoingOpen] = useState(false);
  const [isMineOpen, setIsMineOpen] = useState(false);
  const [isQuickDockExpanded, setIsQuickDockExpanded] = useState(true);
  const [isHuntingProjectOpen, setIsHuntingProjectOpen] = useState(false);
  const [isHuntingRecommendationOpen, setIsHuntingRecommendationOpen] = useState(false);
  /** 头像单击/双击识别计时器，避免单击弹窗和双击收起快捷区互相抢状态。 */
  const avatarClickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** 最近一次头像点击时间，用于识别双击动作。 */
  const avatarLastClickAt = useRef(0);

  /** 清理头像点击计时器。 */
  const clearAvatarClickTimer = useCallback(() => {
    if (!avatarClickTimer.current) {
      return;
    }

    clearTimeout(avatarClickTimer.current);
    avatarClickTimer.current = null;
  }, []);

  /** 关闭狩猎快捷相关弹窗，保持页面切换后的浮层状态一致。 */
  const closeHuntingShortcutOverlays = useCallback(() => {
    setIsHuntingRecommendationOpen(false);
    setIsHuntingProjectOpen(false);
  }, []);

  /** 收起根页面上方的轻浮层和快捷入口。 */
  const closeFloatingPanels = useCallback(() => {
    setIsMineOpen(false);
    setIsOngoingOpen(false);
    setIsQuickDockExpanded(true);
  }, []);

  /** 路由或主模块切换时关闭所有跨页面残留浮层。 */
  const closeRouteOverlays = useCallback(() => {
    closeFloatingPanels();
    closeAllOverlays();
    closeHuntingShortcutOverlays();
  }, [closeAllOverlays, closeFloatingPanels, closeHuntingShortcutOverlays]);

  /** 点击头像时打开我的弹窗，双击头像时切换快捷入口展开状态。 */
  const handleAvatarClick = useCallback(() => {
    const now = Date.now();

    clearAvatarClickTimer();
    if (now - avatarLastClickAt.current < 320) {
      avatarLastClickAt.current = 0;
      setIsMineOpen(false);
      setIsQuickDockExpanded((value) => !value);
      return;
    }

    avatarLastClickAt.current = now;
    avatarClickTimer.current = setTimeout(() => {
      avatarLastClickAt.current = 0;
      setIsMineOpen((value) => !value);
      avatarClickTimer.current = null;
    }, 260);
  }, [clearAvatarClickTimer]);

  useEffect(
    () => () => {
      clearAvatarClickTimer();
    },
    [clearAvatarClickTimer]
  );

  return {
    closeFloatingPanels,
    closeHuntingShortcutOverlays,
    closeRouteOverlays,
    handleAvatarClick,
    isHuntingProjectOpen,
    isHuntingRecommendationOpen,
    isMineOpen,
    isOngoingOpen,
    isQuickDockExpanded,
    setIsHuntingProjectOpen,
    setIsHuntingRecommendationOpen,
    setIsMineOpen,
    setIsOngoingOpen,
    setIsQuickDockExpanded
  };
}
