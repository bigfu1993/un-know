import { messageToastMeta } from "@tools/messageToast";

/** 顶部消息提示展示组件，仅负责根据 toast 状态渲染视觉层。 */
export function MessageToast({ onClose, toast }: MessageToastProps) {
  if (!toast) {
    return null;
  }

  const type = toast.type ?? "success";
  const meta = messageToastMeta[type];
  const Icon = meta.icon;
  const accentColor = toast.color ?? meta.color;

  return (
    <div className="message-toast-viewport w-[min(512px,calc(100vw-28px))]">
      <div
        aria-live={type === "error" ? "assertive" : "polite"}
        className={`message-toast grid items-center gap-[10px] p-[12px] text-[#17212b] leading-none mb-0 ml-0 mr-0 ${type}`}
        key={toast.id}
        role={type === "error" ? "alert" : "status"}
        style={{ "--message-toast-color": accentColor } as CSSProperties}
      >
        <Icon size={18} />
        <div>
          <strong>{meta.label}</strong>
          <p>{toast.content}</p>
        </div>
        <button aria-label="关闭消息" onClick={onClose} type="button">
          ×
        </button>
      </div>
    </div>
  );
}
