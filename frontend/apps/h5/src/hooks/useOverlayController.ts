/** App 全局浮层控制器，集中管理头像弹窗、进行中弹窗和跨模块业务弹窗的显示状态。 */
export function useOverlayController() {
  const [isOngoingOpen, setIsOngoingOpen] = useState(false);
  const [isMineOpen, setIsMineOpen] = useState(false);
  const [isQuickDockExpanded, setIsQuickDockExpanded] = useState(true);
  const [isTutorCalendarOpen, setIsTutorCalendarOpen] = useState(false);
  const [isTutorCertificationInfoOpen, setIsTutorCertificationInfoOpen] = useState(false);
  const [isHuntingProjectOpen, setIsHuntingProjectOpen] = useState(false);
  const [isHuntingRecommendationOpen, setIsHuntingRecommendationOpen] = useState(false);
  const [isTutorApplicationOpen, setIsTutorApplicationOpen] = useState(false);
  /** 头像单击/双击识别计时器，避免单击弹窗和双击收起快捷区互相抢状态。 */
  const avatarClickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** 最近一次头像点击时间，用于识别双击动作。 */
  const avatarLastClickAt = useRef(0);

  /** 清理头像点击计时器。 */
  function clearAvatarClickTimer() {
    if (!avatarClickTimer.current) {
      return;
    }

    clearTimeout(avatarClickTimer.current);
    avatarClickTimer.current = null;
  }

  /** 关闭家教相关全局弹窗，避免路由切换后残留。 */
  function closeTutorDialogs() {
    setIsTutorCalendarOpen(false);
    setIsTutorCertificationInfoOpen(false);
  }

  /** 关闭狩猎快捷相关弹窗，保持页面切换后的浮层状态一致。 */
  function closeHuntingShortcutDialogs() {
    setIsHuntingRecommendationOpen(false);
    setIsHuntingProjectOpen(false);
  }

  /** 收起根页面上方的轻浮层和快捷入口。 */
  function closeFloatingPanels() {
    setIsMineOpen(false);
    setIsOngoingOpen(false);
    setIsQuickDockExpanded(true);
  }

  /** 路由或主模块切换时关闭所有跨页面残留浮层。 */
  function closeRouteOverlays() {
    closeFloatingPanels();
    closeTutorDialogs();
    closeHuntingShortcutDialogs();
  }

  /** 点击头像时打开我的弹窗，双击头像时切换快捷入口展开状态。 */
  function handleAvatarClick() {
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
  }

  useEffect(
    () => () => {
      clearAvatarClickTimer();
    },
    []
  );

  return {
    closeFloatingPanels,
    closeHuntingShortcutDialogs,
    closeRouteOverlays,
    closeTutorDialogs,
    handleAvatarClick,
    isHuntingProjectOpen,
    isHuntingRecommendationOpen,
    isMineOpen,
    isOngoingOpen,
    isQuickDockExpanded,
    isTutorApplicationOpen,
    isTutorCalendarOpen,
    isTutorCertificationInfoOpen,
    setIsHuntingProjectOpen,
    setIsHuntingRecommendationOpen,
    setIsMineOpen,
    setIsOngoingOpen,
    setIsQuickDockExpanded,
    setIsTutorApplicationOpen,
    setIsTutorCalendarOpen,
    setIsTutorCertificationInfoOpen
  };
}
