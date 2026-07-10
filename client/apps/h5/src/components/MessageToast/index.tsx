const defaultMessageDuration = 2000;
const messageToastMeta: Record<MessageToastType, { label: string; color: string; icon: LucideIcon }> = {
  success: { label: "成功", color: "#176b50", icon: CheckCircle2 },
  warning: { label: "提醒", color: "#b7791f", icon: AlertCircle },
  error: { label: "失败", color: "#d92d20", icon: XCircle }
};

export function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function useMessageToast() {
  const [toast, setToast] = useState<MessageToastState | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  function hideMessage() {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setToast(null);
  }

  function showMessage(content: string, options: MessageToastOptions = {}) {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }
    const duration = options.duration ?? defaultMessageDuration;
    setToast({
      id: Date.now(),
      content,
      type: options.type,
      color: options.color,
      duration
    });
    timerRef.current = window.setTimeout(() => {
      setToast(null);
      timerRef.current = null;
    }, duration);
  }

  return { hideMessage, showMessage, toast };
}

export function MessageToast({ onClose, toast }: MessageToastProps) {
  if (!toast) {
    return null;
  }

  const type = toast.type ?? "success";
  const meta = messageToastMeta[type];
  const Icon = meta.icon;
  const accentColor = toast.color ?? meta.color;

  return (
    <div className="message-toast-viewport">
      <div
        aria-live={type === "error" ? "assertive" : "polite"}
        className={`message-toast ${type}`}
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
