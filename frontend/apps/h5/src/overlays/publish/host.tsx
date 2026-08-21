import { PublishDraftConfirm } from "@components/PublishInfo/DraftConfirm";
import { PublishInfo } from "@components/PublishInfo";
import { usePublishOverlayHost, usePublishOverlayType } from "./context";

/** 渲染本地草稿确认和正式发布表单两类全局弹层。 */
export function PublishOverlayHost() {
  const activeType = usePublishOverlayType();
  const {
    addressItems,
    childOptions,
    closePendingDraft,
    closePublishInfo,
    discardPendingDraft,
    initialDraft,
    initialType,
    isPublishing,
    pendingPublishDraft,
    publishInfo,
    role,
    savePublishInfo,
    usePendingPublishDraft
  } = usePublishOverlayHost();

  if (activeType === "publishDraftConfirm" && pendingPublishDraft) {
    return (
      <PublishDraftConfirm
        draft={pendingPublishDraft}
        onClose={closePendingDraft}
        onDiscardDraft={discardPendingDraft}
        onUseDraft={usePendingPublishDraft}
      />
    );
  }

  if (activeType === "publishInfo") {
    return (
      <PublishInfo
        addressItems={addressItems}
        childOptions={childOptions}
        initialDraft={initialDraft}
        initialType={initialType}
        isPublishing={isPublishing}
        onClose={closePublishInfo}
        onPublish={publishInfo}
        onSave={savePublishInfo}
        role={role}
      />
    );
  }

  return null;
}
