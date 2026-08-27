/** 卡片状态角标属性：只负责按 labels 堆叠渲染，不含任何业务判断——状态文案取哪些、
 *  单个角标和堆叠容器的具体配色/形态，全部由调用方通过 className 决定。 */
export interface CardStatusProps {
  /** 单个角标的类名，用于承接调用方自己的配色/形态（如实心 pill、纯文字变色等）。 */
  badgeClassName?: string;
  /** 要展示的状态文案列表，为空时不渲染。 */
  labels: string[];
  /** 堆叠容器的类名。 */
  stackClassName?: string;
}

/** 纯卡片状态角标：多个状态纵向堆叠展示，单个状态横向展示，供列表卡片右侧状态展示复用。 */
export function CardStatus({ badgeClassName = "", labels, stackClassName = "" }: CardStatusProps) {
  if (labels.length === 0) {
    return null;
  }

  return (
    <span className={`${stackClassName} ${labels.length > 1 ? "multi" : ""}`}>
      {labels.map((label) => (
        <em className={badgeClassName} key={label}>
          {label}
        </em>
      ))}
    </span>
  );
}
