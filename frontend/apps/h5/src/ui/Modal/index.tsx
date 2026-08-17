/**
 * 通用底部弹窗壳组件，业务弹窗通过 children 插槽组合 body 和 footer。
 * 标题行是可选插槽：传入 `title` 时由 Modal 内置渲染标题行（图标 + 标题主体 + 关闭按钮），
 * 调用方不用再自己写这部分和关闭按钮；不传 `title` 时不渲染标题行，调用方可以继续在
 * children 里自行组织头部（兼容尚未迁移到新插槽的旧弹窗）。
 */
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
  /** 标题行图标插槽，只有传入 title 时才会渲染。 */
  icon?: ReactNode;
  /** 标题行主体插槽（标题文案、副标题等），撑满图标和关闭按钮之间的空间。 */
  title?: ReactNode;
  /** 标题行补充类名，追加在默认的 `card-title` 基础上，用于个别弹窗需要的定位/层级等差异化样式。 */
  headerClassName?: string;
}

/** Modal 内置的标题行：图标 + 主体插槽 + 关闭按钮，只有传入 title 时才渲染。 */
function ModalHeader({ headerClassName, icon, onClose, title }: Pick<ModalProps, "headerClassName" | "icon" | "onClose" | "title">) {
  if (!title) {
    return null;
  }

  return (
    <div className={["card-title flex items-center justify-between gap-[10px]", headerClassName].filter(Boolean).join(" ")}>
      {icon}
      <div className="modal-title-copy min-w-0 flex-1">{title}</div>
      <button
        aria-label="关闭"
        className="icon-only grid h-[34px] w-[34px] place-items-center text-[#475466]"
        onClick={onClose}
        type="button"
      >
        <XCircle size={20} />
      </button>
    </div>
  );
}

/** 通用 Modal 只维护遮罩、面板容器和关闭边界；业务内容由调用方作为插槽传入。 */
export function Modal({
  ariaLabel,
  children,
  headerClassName,
  icon,
  onClose,
  onSubmit,
  panelClassName = "",
  panelElement = "article",
  panelStyle,
  rootClassName = "checkout-sheet",
  surfaceClassName = "sheet-panel",
  title
}: ModalProps) {
  const className = [surfaceClassName, panelClassName].filter(Boolean).join(" ");

  if (panelElement === "form") {
    return (
      <section className={rootClassName} aria-label={ariaLabel}>
        <div className="sheet-backdrop" onClick={onClose} />
        <form className={className} onSubmit={onSubmit} style={panelStyle}>
          <ModalHeader headerClassName={headerClassName} icon={icon} onClose={onClose} title={title} />
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
          <ModalHeader headerClassName={headerClassName} icon={icon} onClose={onClose} title={title} />
          {children}
        </div>
      </section>
    );
  }

  return (
    <section className={rootClassName} aria-label={ariaLabel}>
      <div className="sheet-backdrop" onClick={onClose} />
      <article className={className} style={panelStyle}>
        <ModalHeader headerClassName={headerClassName} icon={icon} onClose={onClose} title={title} />
        {children}
      </article>
    </section>
  );
}
