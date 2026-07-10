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

export interface MessageToastProps {
  onClose: () => void;
  toast: MessageToastState | null;
}
