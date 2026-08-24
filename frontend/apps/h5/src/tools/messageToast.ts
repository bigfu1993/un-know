/** 消息提示默认停留时长，保持与产品约定的 2 秒一致。 */
const defaultMessageDuration = 2000;

/** 全局消息提示状态变更订阅函数。 */
type MessageToastListener = () => void;

/** 当前全局消息提示状态，由根节点 MessageToast 单实例消费。 */
let currentToast: MessageToastState | null = null;

/** 自动关闭计时器引用，用于切换消息时清理副作用。 */
let timerRef: number | null = null;

/** 全局消息提示订阅者集合。 */
const listeners = new Set<MessageToastListener>();

/** 消息类型对应的默认标题、强调色和图标。 */
export const messageToastMeta: Record<MessageToastType, { label: string; color: string; icon: LucideIcon }> = {
  success: { label: "成功", color: "var(--h5-success)", icon: CheckCircle2 },
  warning: { label: "提醒", color: "var(--h5-warning)", icon: AlertCircle },
  error: { label: "失败", color: "var(--h5-danger)", icon: XCircle }
};

/** 将未知异常转换为用户可读错误文案。 */
export function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

/** 通知所有全局消息提示消费者刷新。 */
function emitMessageToastChange() {
  listeners.forEach((listener) => listener());
}

/** 订阅全局消息提示状态，供根节点单实例组件使用。 */
export function subscribeMessageToast(listener: MessageToastListener) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

/** 读取当前全局消息提示状态。 */
export function getMessageToastSnapshot() {
  return currentToast;
}

/** 主动关闭当前消息，并清理可能存在的自动关闭计时器。 */
export function hideMessage() {
  if (timerRef !== null) {
    window.clearTimeout(timerRef);
    timerRef = null;
  }
  currentToast = null;
  emitMessageToastChange();
}

/** 展示一条全局消息提示，并按照配置或默认时长自动关闭。 */
export function showMessage(content: string, options: MessageToastOptions = {}) {
  if (timerRef !== null) {
    window.clearTimeout(timerRef);
  }
  const duration = options.duration ?? defaultMessageDuration;
  currentToast = {
    id: Date.now(),
    content,
    type: options.type,
    color: options.color,
    duration
  };
  emitMessageToastChange();
  timerRef = window.setTimeout(() => {
    currentToast = null;
    timerRef = null;
    emitMessageToastChange();
  }, duration);
}

/** 面向业务代码的全局消息提示 API。 */
export const messageToastApi = {
  hide: hideMessage,
  show: showMessage
};
