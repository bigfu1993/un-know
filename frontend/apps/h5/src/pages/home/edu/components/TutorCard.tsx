import type { KeyboardEvent } from "react";
import { Info } from "lucide-react";

/** 家教人物资料卡壳属性，供家长浏览认证学生列表和试课申请列表复用。 */
interface TutorCardProps {
  /** 头部图标，默认家教学位帽图标。 */
  icon?: ReactNode;
  /** 卡片标题，通常是昵称，允许调用方自行拼接彽标等内容；有 detail 时点击标题打开详情，由组件内部固定处理。 */
  title: ReactNode;
  /** content 默认插槽，调用方自行拼装详情字段等内容。 */
  children?: ReactNode;
  /** footer 具名插槽，完全由调用方决定内容。 */
  footer?: ReactNode;
  /** 卡片是否选中态，控制高亮样式。 */
  selected?: boolean;
  /** 点击卡片主体（标题、footer 内部动作除外）切换选中；不传则整卡不可点击选中。 */
  onSelect?: () => void;
  /** 详情弹窗内容；传入后标题自动变为可点击打开详情的入口。 */
  detail?: ReactNode;
  /** 详情弹窗标题，缺省复用 title。 */
  detailTitle?: ReactNode;
  /** 根节点追加类名，供调用方补充语义态样式。 */
  className?: string;
}

/** 家教人物资料卡壳：header（图标+标题，固定结构，不对外开放插槽）/content（默认插槽）/footer（具名插槽）三段。
 *  有 detail 时标题自动可点开详情弹窗；有 onSelect 时点击卡片主体（标题、footer 内动作除外）切换选中，两者可以共存。 */
export function TutorCard({
  children,
  className,
  detail,
  detailTitle,
  footer,
  icon,
  onSelect,
  selected = false,
  title
}: TutorCardProps) {
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const rootClassName = ["flow-card", "tutor-card-container", selected ? "selected" : "", className]
    .filter(Boolean)
    .join(" ");

  /** 键盘触发选中，保证整卡可点击时仍保留可访问性。 */
  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (!onSelect) {
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect();
    }
  }

  return (
    <article
      className={`${rootClassName} grid gap-[10px]`}
      onClick={onSelect}
      onKeyDown={onSelect ? handleKeyDown : undefined}
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
    >
      <div className="tutor-card-header card-title flex items-center gap-[10px]">
        {icon ?? <GraduationCap size={18} />}
        <div className="tutor-profile-title-copy min-w-0 flex-1">
          <strong
            className="card-title-chip"
            onClick={
              detail
                ? (event) => {
                    event.stopPropagation();
                    setIsDetailOpen(true);
                  }
                : undefined
            }
          >
            {title}
          </strong>
        </div>
      </div>

      {children ? <div className="tutor-card-content grid gap-[8px]">{children}</div> : null}

      {footer ? (
        <div className="tutor-card-footer flex flex-wrap items-center gap-[8px]" onClick={(event) => event.stopPropagation()}>
          {footer}
        </div>
      ) : null}

      {isDetailOpen && detail ? (
        <Modal
          ariaLabel="家教信息详情"
          icon={<Info size={18} />}
          onClose={() => setIsDetailOpen(false)}
          panelClassName="tutor-applicant-detail-panel mx-auto grid max-w-[540px] gap-[12px] px-[14px] pb-[calc(16px+env(safe-area-inset-bottom))] pt-[16px]"
          title={
            <>
              <strong>{detailTitle ?? title}</strong>
              <span>家教信息</span>
            </>
          }
        >
          {detail}
        </Modal>
      ) : null}
    </article>
  );
}
