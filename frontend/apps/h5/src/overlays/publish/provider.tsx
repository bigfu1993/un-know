import { useGlobalUser } from "@h5/store/global";
import { getChildProfileOptions } from "@shared/clientPageModel";
import { showMessage } from "@tools/messageToast";
import {
  buildPublishHuntingTaskRequest,
  buildPublishTutorDemandRequest,
  getLatestLocalPublishInfoDraft,
  isHuntingTaskPublishType,
  saveLocalPublishInfoDraft
} from "@tools/publishInfo";
import { usePublishHuntingTask, usePublishTutorDemand } from "@unknown/hooks";
import { useOverlayActions } from "../context";
import { PublishOverlayActionsContext, PublishOverlayHostContext } from "./context";
import { initialPublishOverlayState, publishOverlayReducer } from "./reducer";

/** 管理发布弹层草稿、真实发布 mutation、导航回调和用户反馈。 */
export function PublishOverlayProvider({
  addressItems,
  children,
  onBeforeOpen,
  onPublishedToTab,
  refetchWorkspace
}: PublishOverlayProviderProps) {
  const user = useGlobalUser();
  const { closeOverlay, openOverlay } = useOverlayActions();
  const [draftState, dispatch] = useReducer(publishOverlayReducer, initialPublishOverlayState);
  const { isPending: isHuntingTaskPublishing, mutate: publishHuntingTask } = usePublishHuntingTask();
  const { isPending: isTutorDemandPublishing, mutate: publishTutorDemand } = usePublishTutorDemand();
  const childOptions = useMemo(() => getChildProfileOptions(user.profileDraft), [user.profileDraft]);

  /** 使用指定类型和草稿打开发布表单，并清理草稿确认弹层。 */
  const openPublishInfo = useCallback(
    (publishType: PublishInfoType, draft: PublishInfoDraft | null) => {
      dispatch({ draft, publishType, type: "open" });
      closeOverlay("publishDraftConfirm");
      openOverlay({ lane: "primary", type: "publishInfo" });
    },
    [closeOverlay, openOverlay]
  );

  /** 打开发布流程；存在本地草稿时先进入确认弹层。 */
  const requestOpenPublishInfo = useCallback(
    (publishType: PublishInfoType) => {
      onBeforeOpen();

      const latestDraft = getLatestLocalPublishInfoDraft(publishType);
      if (latestDraft) {
        dispatch({ draft: latestDraft, publishType, type: "prompt" });
        openOverlay({ lane: "confirm", type: "publishDraftConfirm" });
        return;
      }

      openPublishInfo(publishType, null);
    },
    [onBeforeOpen, openOverlay, openPublishInfo]
  );

  const openDefaultPublishInfo = useCallback(
    () => requestOpenPublishInfo(user.role === "parent" ? "tutor" : "delegation"),
    [requestOpenPublishInfo, user.role]
  );
  const openRecycleInfo = useCallback(() => requestOpenPublishInfo("recycle"), [requestOpenPublishInfo]);
  const closePendingDraft = useCallback(() => {
    dispatch({ type: "closePending" });
    closeOverlay("publishDraftConfirm");
  }, [closeOverlay]);
  const closePublishInfo = useCallback(() => closeOverlay("publishInfo"), [closeOverlay]);
  const discardPendingDraft = useCallback(
    () => openPublishInfo(draftState.pendingType, null),
    [draftState.pendingType, openPublishInfo]
  );
  const usePendingPublishDraft = useCallback(() => {
    if (!draftState.pendingDraft) {
      return;
    }

    openPublishInfo(draftState.pendingType, draftState.pendingDraft);
  }, [draftState.pendingDraft, draftState.pendingType, openPublishInfo]);

  /** 保存发布信息草稿，暂不进入业务列表。 */
  const savePublishInfo = useCallback(
    (draft: PublishInfoDraft) => {
      try {
        saveLocalPublishInfoDraft(draft, "draft");
        closePublishInfo();
        showMessage("发布草稿已保存。", { type: "success" });
      } catch {
        showMessage("发布草稿保存失败，请检查浏览器存储权限。", { type: "error" });
      }
    },
    [closePublishInfo]
  );

  /** 发布委托、回收、家教招募或家教聘用信息。 */
  const publishInfo = useCallback(
    (draft: PublishInfoDraft) => {
      if (draft.type === "tutor") {
        publishTutorDemand(buildPublishTutorDemandRequest(draft, addressItems, childOptions), {
          onSuccess: () => {
            saveLocalPublishInfoDraft(draft, "published");
            closePublishInfo();
            onPublishedToTab("tutor");
            showMessage("家教招募已发布，已加入进行中列表。", { type: "success" });
            refetchWorkspace();
          },
          onError: (error) => {
            showMessage(getErrorMessage(error, "家教招募发布失败，请稍后重试。"), { type: "error" });
          }
        });
        return;
      }

      if (draft.type === "tutorHire") {
        try {
          saveLocalPublishInfoDraft(draft, "draft");
          closePublishInfo();
          showMessage("家教聘用发布接口暂未接入，已先保存为草稿。", { type: "warning" });
        } catch {
          showMessage("发布草稿保存失败，请检查浏览器存储权限。", { type: "error" });
        }
        return;
      }

      if (!isHuntingTaskPublishType(draft.type)) {
        try {
          saveLocalPublishInfoDraft(draft, "draft");
          closePublishInfo();
          showMessage("当前仅委托、回收和家教招募接入真实发布，已先保存为草稿。", { type: "warning" });
        } catch {
          showMessage("发布草稿保存失败，请检查浏览器存储权限。", { type: "error" });
        }
        return;
      }

      try {
        const payload = buildPublishHuntingTaskRequest(draft, addressItems);
        const publishTypeLabel = draft.type === "recycle" ? "回收" : "委托";

        publishHuntingTask(payload, {
          onSuccess: () => {
            saveLocalPublishInfoDraft(draft, "published");
            closePublishInfo();
            showMessage(`${publishTypeLabel}已发布，可在委托列表查看。`, { type: "success" });
            onPublishedToTab("hunting");
            refetchWorkspace();
          },
          onError: (error) => {
            showMessage(getErrorMessage(error, `${publishTypeLabel}发布失败，请稍后重试。`), { type: "error" });
          }
        });
      } catch (error) {
        showMessage(getErrorMessage(error, "发布信息校验失败，请检查表单内容。"), { type: "error" });
      }
    },
    [
      addressItems,
      childOptions,
      closePublishInfo,
      onPublishedToTab,
      publishHuntingTask,
      publishTutorDemand,
      refetchWorkspace
    ]
  );

  const actions = useMemo<PublishOverlayActions>(
    () => ({ openDefaultPublishInfo, openRecycleInfo }),
    [openDefaultPublishInfo, openRecycleInfo]
  );
  const host = useMemo<PublishOverlayHostContextValue>(
    () => ({
      addressItems,
      childOptions,
      closePendingDraft,
      closePublishInfo,
      discardPendingDraft,
      initialDraft: draftState.initialDraft,
      initialType: draftState.initialType,
      isPublishing: isHuntingTaskPublishing || isTutorDemandPublishing,
      pendingPublishDraft: draftState.pendingDraft,
      publishInfo,
      role: user.role,
      savePublishInfo,
      usePendingPublishDraft
    }),
    [
      addressItems,
      childOptions,
      closePendingDraft,
      closePublishInfo,
      discardPendingDraft,
      draftState.initialDraft,
      draftState.initialType,
      draftState.pendingDraft,
      isHuntingTaskPublishing,
      isTutorDemandPublishing,
      publishInfo,
      savePublishInfo,
      usePendingPublishDraft,
      user.role
    ]
  );

  return (
    <PublishOverlayActionsContext.Provider value={actions}>
      <PublishOverlayHostContext.Provider value={host}>{children}</PublishOverlayHostContext.Provider>
    </PublishOverlayActionsContext.Provider>
  );
}
