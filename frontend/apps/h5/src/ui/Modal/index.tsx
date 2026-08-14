/** 通用底部弹窗壳组件，业务弹窗通过 children 插槽组合 header、body 和 footer。 */
export interface ModalProps {
  ariaLabel: string;
  children: ReactNode;
  onClose: () => void;
  panelClassName?: string;
  panelElement?: "article" | "div" | "form";
  panelStyle?: CSSProperties;
  rootClassName?: string;
  surfaceClassName?: string;
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
}

/** 通用 Modal 只维护遮罩、面板容器和关闭边界；业务内容由调用方作为插槽传入。 */
export function Modal({
  ariaLabel,
  children,
  onClose,
  onSubmit,
  panelClassName = "",
  panelElement = "article",
  panelStyle,
  rootClassName = "checkout-sheet",
  surfaceClassName = "sheet-panel"
}: ModalProps) {
  const className = [surfaceClassName, panelClassName].filter(Boolean).join(" ");

  if (panelElement === "form") {
    return (
      <section className={rootClassName} aria-label={ariaLabel}>
        <div className="sheet-backdrop" onClick={onClose} />
        <form className={className} onSubmit={onSubmit} style={panelStyle}>
          {children}
        </form>
      </section>
    );
  }

  if (panelElement === "div") {
    return (
      <section className={rootClassName} aria-label={ariaLabel}>
        <div className="sheet-backdrop" onClick={onClose} />
        <div className={className} style={panelStyle}>
          {children}
        </div>
      </section>
    );
  }

  return (
    <section className={rootClassName} aria-label={ariaLabel}>
      <div className="sheet-backdrop" onClick={onClose} />
      <article className={className} style={panelStyle}>
        {children}
      </article>
    </section>
  );
}
