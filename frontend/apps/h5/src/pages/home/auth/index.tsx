import "./index.less";
import { HuntingShortcut } from "./components/HuntingShortcut";
import { MineShortcut } from "./components/MineShortcut";
import { OngoingOrdersModal } from "./components/OngoingOrdersModal";
import { OngoingShortcut } from "./components/OngoingShortcut";
import { QuickActionDock } from "./components/QuickActionDock";

/** 首页进行中入口属性，按钮状态和弹窗业务动作在模块内拆分。 */
interface FloatingOngoingProps extends OngoingOrdersModalProps {
  hasPaymentRisk: boolean;
  isOpen: boolean;
  onOpen: () => void;
}

/** 首页账号悬浮操作区属性，按业务入口收敛传参边界。 */
interface FloatingActionsProps {
  hunting: HuntingShortcutProps;
  isQuickDockExpanded: boolean;
  mine: MineShortcutProps;
  ongoing: FloatingOngoingProps;
  role: Role;
}

/** 首页账号悬浮操作区，统一管理右下角按钮和对应弹窗。 */
export function FloatingActions({ hunting, isQuickDockExpanded, mine, ongoing, role }: FloatingActionsProps) {
  const { hasPaymentRisk, isOpen, onOpen, orders, ...ongoingOrdersProps } = ongoing;

  return (
    <>
      <QuickActionDock isExpanded={isQuickDockExpanded}>
        <OngoingShortcut
          hasPaymentRisk={hasPaymentRisk}
          isOpen={isOpen}
          onOpen={onOpen}
          orderCount={orders.length}
        />
        {role === "student" ? <HuntingShortcut {...hunting} /> : null}
      </QuickActionDock>
      <MineShortcut {...mine} />
      {isOpen ? <OngoingOrdersModal orders={orders} {...ongoingOrdersProps} /> : null}
    </>
  );
}
