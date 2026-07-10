import { type CSSProperties, useEffect, useRef, useState } from "react";
import { Text, View } from "@tarojs/components";
import "./index.css";

export type MessageToastType = "success" | "warning" | "error";

export interface MessageToastState {
  id: number;
  content: string;
  type?: MessageToastType;
  color?: string;
  duration: number;
}

export interface MessageToastOptions {
  type?: MessageToastType;
  color?: string;
  duration?: number;
}

const defaultMessageDuration = 2000;
const messageToastMeta: Record<MessageToastType, { label: string; color: string; icon: string }> = {
  success: { label: "成功", color: "#176b50", icon: "✓" },
  warning: { label: "提醒", color: "#b7791f", icon: "!" },
  error: { label: "失败", color: "#d92d20", icon: "×" }
};

export function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function useMessageToast() {
  const [toast, setToast] = useState<MessageToastState | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  function hideMessage() {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setToast(null);
  }

  function showMessage(content: string, options: MessageToastOptions = {}) {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
    }
    const duration = options.duration ?? defaultMessageDuration;
    setToast({
      id: Date.now(),
      content,
      type: options.type,
      color: options.color,
      duration
    });
    timerRef.current = setTimeout(() => {
      setToast(null);
      timerRef.current = null;
    }, duration);
  }

  return { hideMessage, showMessage, toast };
}

export function MessageToast({ onClose, toast }: { onClose: () => void; toast: MessageToastState | null }) {
  if (!toast) {
    return null;
  }

  const type = toast.type ?? "success";
  const meta = messageToastMeta[type];
  const accentColor = toast.color ?? meta.color;

  return (
    <View className="message-toast-wrap">
      <View className={`message-toast ${type}`} key={toast.id} style={{ borderTopColor: accentColor } as CSSProperties}>
        <Text className="message-toast-icon" style={{ color: accentColor } as CSSProperties}>
          {meta.icon}
        </Text>
        <View className="message-toast-main">
          <Text className="message-toast-label" style={{ color: accentColor } as CSSProperties}>
            {meta.label}
          </Text>
          <Text className="message-toast-text">{toast.content}</Text>
        </View>
        <View className="message-toast-close" onClick={onClose}>
          <Text>×</Text>
        </View>
      </View>
    </View>
  );
}
