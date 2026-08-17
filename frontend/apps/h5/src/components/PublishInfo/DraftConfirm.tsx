import { ClipboardCheck, XCircle } from "lucide-react";

/** 发布草稿确认弹窗属性。 */
export interface PublishDraftConfirmProps {
  /** 本地保存的最新发布草稿。 */
  draft: LocalPublishInfoDraft;
  /** 关闭草稿确认弹窗。 */
  onClose: () => void;
  /** 跳过草稿并打开空白发布表单。 */
  onDiscardDraft: () => void;
  /** 使用草稿回填发布表单。 */
  onUseDraft: () => void;
}

/** 发布类型在草稿提示中的展示文案。 */
const publishDraftTypeLabels: Record<PublishInfoType, string> = {
  delegation: "委托",
  partTime: "兼职",
  recycle: "回收",
  tutor: "家教招募",
  tutorHire: "家教聘用"
};

/** 发布草稿确认弹窗，负责展示本地草稿摘要并承接用户选择。 */
export function PublishDraftConfirm({
  draft,
  onClose,
  onDiscardDraft,
  onUseDraft
}: PublishDraftConfirmProps) {
  return (
    <Modal ariaLabel="使用发布草稿" onClose={onClose} panelClassName="mx-auto grid max-w-[420px] gap-[12px] p-[14px]">
      <div className="card-title flex items-center justify-between gap-[10px]">
        <ClipboardCheck size={18} />
        <div className="publish-draft-confirm-title-copy">
          <strong>检测到本地草稿</strong>
          <span>是否使用上次保存的{publishDraftTypeLabels[draft.type]}草稿？</span>
        </div>
        <button
          aria-label="关闭"
          className="icon-only grid h-[34px] w-[34px] place-items-center text-[#475466]"
          onClick={onClose}
          type="button"
        >
          <XCircle size={20} />
        </button>
      </div>
      <p className="text-[13px] leading-[1.6] text-[#657181]">
        草稿标题：{draft.title || "未填写标题"}，保存时间：{new Date(draft.createdAt).toLocaleString()}
      </p>
      <div className="sheet-actions grid gap-[8px]">
        <button
          className="ghost-button inline-flex min-h-[38px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-[#475466]"
          onClick={onDiscardDraft}
          type="button"
        >
          不使用
        </button>
        <button
          className="primary-button inline-flex min-h-[38px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white"
          onClick={onUseDraft}
          type="button"
        >
          使用草稿
        </button>
      </div>
    </Modal>
  );
}
