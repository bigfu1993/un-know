import type { KeyboardEvent, MouseEvent } from "react";
import { Award, BookOpen, Info, School, Tags } from "lucide-react";
import { getGenderLabel } from "@shared/genderModel";
import { formatTutorSubjectLabels, getTutorEducationLabel } from "@shared/tutorModel";

/** footer 内不应触发卡片选中的交互元素。 */
const FOOTER_INTERACTIVE_TARGET_SELECTOR = "button, a, input, select, textarea, [role='button']";

/** 家教资料字段，贴近数据源原始形态（学历、学科传 KEY），组件内部统一转中文展示并生成详情弹窗内容。
 *  字段是否传入代表该概念对当前调用方是否适用：不传（undefined）该行在详情里完全不出现；传了但是空值/null
 *  代表数据待补充，详情里会展示兜底文案，而不是跳过整行。 */
interface TutorCardTutor {
  /** 昵称，缺省不在详情展示该行。 */
  nickname?: string;
  /** 手机号，缺省不在详情展示该行。 */
  phone?: string;
  /** 真实姓名，缺省不在详情展示该行。 */
  realName?: string;
  /** 性别，缺省不在详情展示该行。 */
  gender?: string;
  /** 年龄，缺省不在详情展示该行。 */
  age?: string;
  /** 籍贯，缺省不在详情展示该行。 */
  nativePlace?: string;
  /** 学校，卡片正文和详情都会展示，缺省不展示对应行。 */
  school?: string;
  /** 专业，卡片正文和详情都会展示，缺省不展示对应行。 */
  major?: string;
  /** 学历 KEY，组件内部查表转中文；卡片正文和详情都会展示，缺省不展示对应行；历史数据可能为 null。 */
  education?: string | null;
  /** 学科 KEY 字符串（"、" 分隔），组件内部查表转中文；卡片正文和详情都会展示，缺省不展示对应行。 */
  subject?: string;
  /** 绩点，缺省不在详情展示该行；历史数据可能为 null。 */
  gpa?: string | null;
  /** 证书，缺省不在详情展示该行；历史数据可能为 null。 */
  certificate?: string | null;
  /** 身份证号，缺省不在详情展示该行。 */
  idCard?: string;
  /** 学信网截图，缺省不在详情展示该行；历史数据可能为 null。 */
  xuexinScreenshot?: string | null;
  /** 受聘次数，缺省不在详情展示该行。 */
  hiredTimes?: number;
  /** 可用时间，缺省不在详情展示该行。 */
  availability?: string;
}

/** 家教人物资料卡壳属性，供家长浏览认证学生列表和统一申请列表复用。 */
interface TutorCardProps {
  /** 头部图标，默认家教学位帽图标。 */
  icon?: ReactNode;
  /** 卡片标题，通常是昵称，允许调用方自行拼接彽标等内容；有详情字段时点击标题打开详情，由组件内部固定处理。 */
  title: ReactNode;
  /** 家教资料字段，组件内部据此解析卡片正文和详情弹窗内容；不传则整个字段区和详情入口都不渲染。 */
  tutor?: TutorCardTutor;
  /** footer 具名插槽，完全由调用方决定内容。 */
  footer?: ReactNode;
  /** 卡片是否选中态，控制高亮样式。 */
  selected?: boolean;
  /** 点击卡片主体（标题、footer 内部动作除外）切换选中；不传则整卡不可点击选中。 */
  onSelect?: () => void;
  /** footer 非交互区域是否复用卡片选中动作，默认关闭以保持普通卡片原有行为。 */
  selectOnFooter?: boolean;
  /** 详情弹窗标题，缺省复用 title。 */
  detailTitle?: ReactNode;
  /** 根节点追加类名，供调用方补充语义态样式。 */
  className?: string;
}

/** 详情弹窗单个字段展示项。 */
interface TutorDetailItem {
  label: string;
  value: string;
}

/** 按固定顺序把 `tutor` 转成详情弹窗字段列表：调用方没传的字段代表这个概念对当前记录不适用，整行跳过；
 *  传了但是空值/null 代表数据待补充，展示兜底文案。 */
function getTutorDetailItems(tutor: TutorCardTutor): TutorDetailItem[] {
  const items: TutorDetailItem[] = [];

  if (tutor.nickname !== undefined) {
    items.push({ label: "昵称", value: tutor.nickname || "未设置昵称" });
  }
  if (tutor.phone !== undefined) {
    items.push({ label: "手机号", value: tutor.phone || "待补充" });
  }
  if (tutor.realName !== undefined) {
    items.push({ label: "真实姓名", value: tutor.realName || "待补充" });
  }
  if (tutor.gender !== undefined) {
    items.push({ label: "性别", value: getGenderLabel(tutor.gender) || "待补充" });
  }
  if (tutor.age !== undefined) {
    items.push({ label: "年龄", value: tutor.age || "待补充" });
  }
  if (tutor.nativePlace !== undefined) {
    items.push({ label: "籍贯", value: tutor.nativePlace || "待补充" });
  }
  if (tutor.school !== undefined) {
    items.push({ label: "学校", value: tutor.school || "待补充" });
  }
  if (tutor.major !== undefined) {
    items.push({ label: "专业", value: tutor.major || "待补充" });
  }
  if (tutor.education !== undefined) {
    items.push({ label: "学历", value: getTutorEducationLabel(tutor.education) || "待补充" });
  }
  if (tutor.subject !== undefined) {
    items.push({ label: "学科", value: formatTutorSubjectLabels(tutor.subject) || "待补充" });
  }
  if (tutor.gpa !== undefined) {
    items.push({ label: "绩点", value: tutor.gpa || "待补充" });
  }
  if (tutor.certificate !== undefined) {
    items.push({ label: "证书", value: tutor.certificate || "待补充" });
  }
  if (tutor.idCard !== undefined) {
    items.push({ label: "身份证号", value: tutor.idCard || "待补充" });
  }
  if (tutor.xuexinScreenshot !== undefined) {
    items.push({ label: "学信网", value: tutor.xuexinScreenshot || "待补充" });
  }
  if (tutor.hiredTimes !== undefined) {
    items.push({ label: "受聘次数", value: `${tutor.hiredTimes} 次` });
  }
  if (tutor.availability !== undefined) {
    items.push({ label: "可用时间", value: tutor.availability || "待补充" });
  }

  return items;
}

/** 家教人物资料卡壳：header（图标+标题，固定结构，不对外开放插槽）/content（学校、专业、学历、学科，固定字段，从 `tutor` 内部解析，缺省不渲染对应行）/footer（具名插槽）三段。
 *  详情弹窗内容也从 `tutor` 内部解析生成，只要有可展示字段标题就自动可点开；有 onSelect 时点击卡片主体切换选中，
 *  调用方可单独开启 footer 非交互区域选中，footer 内按钮等交互控件始终不触发选中。 */
export function TutorCard({
  className,
  detailTitle,
  footer,
  icon,
  onSelect,
  selectOnFooter = false,
  selected = false,
  title,
  tutor
}: TutorCardProps) {
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const school = tutor?.school;
  const major = tutor?.major;
  const education = tutor?.education ? getTutorEducationLabel(tutor.education) : undefined;
  const subjects = tutor?.subject ? formatTutorSubjectLabels(tutor.subject) : undefined;
  const detailItems = tutor ? getTutorDetailItems(tutor) : [];
  const hasDetail = detailItems.length > 0;
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

  /** 隔离 footer 内部动作，并按调用方配置让非交互区域复用整卡选中逻辑。 */
  function handleFooterClick(event: MouseEvent<HTMLDivElement>) {
    const isInteractiveTarget =
      event.target instanceof Element && Boolean(event.target.closest(FOOTER_INTERACTIVE_TARGET_SELECTOR));

    event.stopPropagation();
    if (!selectOnFooter || !onSelect || isInteractiveTarget) {
      return;
    }

    onSelect();
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
              hasDetail
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

      {school || major || education || subjects ? (
        <div className="tutor-card-content job-task-fields grid gap-[4px]">
          {school || major || education ? (
            <div className="grid grid-cols-2 gap-[4px]">
              {school ? (
                <span>
                  <School size={14} />
                  学校：{school}
                </span>
              ) : null}
              {major ? (
                <span>
                  <BookOpen size={14} />
                  专业：{major}
                </span>
              ) : null}
              {education ? (
                <span>
                  <Award size={14} />
                  学历：{education}
                </span>
              ) : null}
            </div>
          ) : null}
          {subjects ? (
            <span>
              <Tags size={14} />
              学科：{subjects}
            </span>
          ) : null}
        </div>
      ) : null}

      {footer ? (
        <div className="tutor-card-footer flex flex-wrap items-center gap-[8px]" onClick={handleFooterClick}>
          {footer}
        </div>
      ) : null}

      {isDetailOpen && hasDetail ? (
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
          <div className="tutor-applicant-detail-list grid gap-[8px]">
            {detailItems.map((item) => (
              <div className="tutor-applicant-detail-item flex items-start justify-between gap-[12px]" key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </Modal>
      ) : null}
    </article>
  );
}
