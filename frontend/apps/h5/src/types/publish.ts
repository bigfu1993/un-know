/** 发布弹层内部维护的表单初始值与待确认草稿。 */
export interface PublishOverlayDraftState {
  initialDraft: import("@tools/publishInfo").PublishInfoDraft | null;
  initialType: import("@tools/publishInfo").PublishInfoType;
  pendingDraft: import("@tools/publishInfo").LocalPublishInfoDraft | null;
  pendingType: import("@tools/publishInfo").PublishInfoType;
}

/** 发布弹层草稿状态机动作。 */
export type PublishOverlayDraftAction =
  | {
      draft: import("@tools/publishInfo").PublishInfoDraft | null;
      publishType: import("@tools/publishInfo").PublishInfoType;
      type: "open";
    }
  | {
      draft: import("@tools/publishInfo").LocalPublishInfoDraft;
      publishType: import("@tools/publishInfo").PublishInfoType;
      type: "prompt";
    }
  | { type: "closePending" };

/** 发布入口消费的稳定命令。 */
export interface PublishOverlayActions {
  openDefaultPublishInfo: () => void;
  openRecycleInfo: () => void;
}

/** 发布 Host 消费的表单数据、提交状态与业务动作。 */
export interface PublishOverlayHostContextValue {
  addressItems: import("@app-types/profile").AddressBookItem[];
  childOptions: import("@app-types/tutor-workflow").ChildProfileOption[];
  initialDraft: import("@tools/publishInfo").PublishInfoDraft | null;
  initialType: import("@tools/publishInfo").PublishInfoType;
  isPublishing: boolean;
  closePendingDraft: () => void;
  closePublishInfo: () => void;
  discardPendingDraft: () => void;
  publishInfo: (draft: import("@tools/publishInfo").PublishInfoDraft) => void;
  savePublishInfo: (draft: import("@tools/publishInfo").PublishInfoDraft) => void;
  usePendingPublishDraft: () => void;
  pendingPublishDraft: import("@tools/publishInfo").LocalPublishInfoDraft | null;
  role: import("@unknown/domain").Role;
}

/** 发布 Overlay 业务 Provider 入参。 */
export interface PublishOverlayProviderProps {
  addressItems: import("@app-types/profile").AddressBookItem[];
  children: ReactNode;
  onBeforeOpen: () => void;
  onPublishedToTab: (tab: import("@unknown/domain").ClientModuleKey) => void;
  refetchWorkspace: () => void;
}
