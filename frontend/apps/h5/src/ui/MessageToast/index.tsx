import "./index.less";
import { getMessageToastSnapshot, hideMessage, messageToastMeta, subscribeMessageToast } from "@tools/messageToast";

/** 顶部消息提示全局单实例，订阅消息 API 状态并渲染视觉层。 */
export function MessageToast() {
  const toast = useSyncExternalStore(subscribeMessageToast, getMessageToastSnapshot, getMessageToastSnapshot);

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
        className={`message-toast grid items-center gap-[10px] p-[12px] text-[var(--h5-text)] leading-none mb-0 ml-0 mr-0 ${type}`}
        key={toast.id}
        role={type === "error" ? "alert" : "status"}
        style={{ "--message-toast-color": accentColor } as CSSProperties}
      >
        <Icon size={18} />
        <div className="message-toast-copy">
          <strong>{meta.label}</strong>
          <p>{toast.content}</p>
        </div>
        <button aria-label="关闭消息" onClick={hideMessage} type="button">
          ×
        </button>
      </div>
    </div>
  );
}
