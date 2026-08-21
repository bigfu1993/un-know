/** 发布弹层草稿状态初始值。 */
export const initialPublishOverlayState: PublishOverlayDraftState = {
  initialDraft: null,
  initialType: "delegation",
  pendingDraft: null,
  pendingType: "delegation"
};

/** 管理发布表单初始草稿与待确认草稿之间的互斥切换。 */
export function publishOverlayReducer(
  state: PublishOverlayDraftState,
  action: PublishOverlayDraftAction
): PublishOverlayDraftState {
  if (action.type === "open") {
    return {
      initialDraft: action.draft,
      initialType: action.publishType,
      pendingDraft: null,
      pendingType: action.publishType
    };
  }

  if (action.type === "prompt") {
    return {
      ...state,
      pendingDraft: action.draft,
      pendingType: action.publishType
    };
  }

  return {
    ...state,
    pendingDraft: null
  };
}
