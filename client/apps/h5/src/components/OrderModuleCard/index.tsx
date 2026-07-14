import { ChevronRight, PackageCheck } from "lucide-react";
import { getOrderModuleCounts } from "@components/OrderModuleCard/model";

/** 订单模块卡片展示模式，默认模式用于我的页面，简单模式预留给轻量入口。 */
export type OrderModuleCardVariant = "default" | "simple";

/** 订单模块卡片属性，支持在我的页面等入口中复用。 */
export interface OrderModuleCardProps {
  className?: string;
  onOpen?: () => void;
  orders: ClientOrder[];
  variant?: OrderModuleCardVariant;
}

/** 我的入口订单模块聚合卡片，展示不同业务线的订单数量。 */
export function OrderModuleCard({ className, onOpen, orders, variant = "default" }: OrderModuleCardProps) {
  const counts = getOrderModuleCounts(orders);
  const fields = [
    { label: "优选订单", value: counts.featured },
    { label: "兼职订单", value: counts.partTime },
    { label: "委托", value: counts.delegation },
    { label: "狩猎", value: counts.hunting }
  ];
  const totalCount = fields.reduce((sum, field) => sum + field.value, 0);
  const rootClassName = ["order-module-card grid gap-[10px]", `order-module-card--${variant}`, className]
    .filter(Boolean)
    .join(" ");
  const content = (
    <>
      <div className="order-module-head flex items-center gap-[10px]">
        <span className="order-module-icon grid h-[40px] w-[40px] shrink-0 place-items-center">
          <PackageCheck size={21} />
        </span>
        <div className="order-module-main min-w-0 flex-1">
          <strong>订单模块</strong>
          <p>{totalCount > 0 ? `${totalCount} 个订单事项` : "暂无订单事项"}</p>
        </div>
        {onOpen ? <ChevronRight className="shrink-0" size={17} /> : null}
      </div>
      <div className="order-module-grid grid gap-[7px]">
        {fields.map((field) => (
          <span key={field.label}>
            <em>{field.label}</em>
            <strong>{field.value}</strong>
          </span>
        ))}
      </div>
    </>
  );

  if (onOpen) {
    return (
      <button className={rootClassName} onClick={onOpen} type="button">
        {content}
      </button>
    );
  }

  return <article className={rootClassName}>{content}</article>;
}
