/** 消息提示默认停留时长，保持与产品约定的 2 秒一致。 */
const defaultMessageDuration = 2000;

/** 消息类型对应的默认标题、强调色和图标。 */
export const messageToastMeta: Record<MessageToastType, { label: string; color: string; icon: LucideIcon }> = {
  success: { label: "成功", color: "#176b50", icon: CheckCircle2 },
  warning: { label: "提醒", color: "#b7791f", icon: AlertCircle },
  error: { label: "失败", color: "#d92d20", icon: XCircle }
};

/** 将未知异常转换为用户可读错误文案。 */
export function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

/** 提供全局消息提示状态和自动关闭控制。 */
export function useMessageToast() {
  const [toast, setToast] = useState<MessageToastState | null>(null);
  /** 自动关闭计时器引用，用于切换消息或卸载时清理副作用。 */
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  /** 主动关闭当前消息，并清理可能存在的自动关闭计时器。 */
  function hideMessage() {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setToast(null);
  }

  /** 展示一条全局消息提示，并按照配置或默认时长自动关闭。 */
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
