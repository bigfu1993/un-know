import "./index.less";

/** Switch 的四档稳定尺寸。 */
export type SwitchSize = "mini" | "small" | "default" | "large";

/** 通用二态开关属性。 */
export interface SwitchProps {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: (checked: boolean) => void;
  /** 轨道与滑块的尺寸档位，未传时保持原有 default 尺寸。 */
  size?: SwitchSize;
}

/** 通用二态开关，业务字段标题和值文案由外层组件组合。 */
export function Switch({ checked, disabled = false, label, onChange, size = "default" }: SwitchProps) {
  return (
    <button
      aria-checked={checked}
      aria-label={label}
      className={`switch-control switch-control--${size}${checked ? " active" : ""}`}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      role="switch"
      type="button"
    >
      <span className="switch-control__thumb" />
    </button>
  );
}
