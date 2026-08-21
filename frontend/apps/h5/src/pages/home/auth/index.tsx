import "./index.less";
import { HuntingShortcut } from "./components/HuntingShortcut";
import { MineShortcut } from "./components/MineShortcut";
import { Mine } from "./components/Mine";
import { OngoingOrders } from "./components/OngoingOrders";
import { OngoingShortcut } from "./components/OngoingShortcut";
import { QuickActionDock } from "./components/QuickActionDock";

/** 首页账号悬浮操作区，统一管理右下角按钮和对应弹窗。 */
export function FloatingActions({ model }: FloatingActionsProps) {
  const { hunting, mine, ongoing, quickDockExpanded, role } = model;

  return (
    <>
      <QuickActionDock isExpanded={quickDockExpanded}>
        <OngoingShortcut
          {...ongoing.shortcut}
          orderCount={ongoing.panel.orders.length}
        />
        {role === "student" ? <HuntingShortcut {...hunting} /> : null}
      </QuickActionDock>
      <MineShortcut {...mine.shortcut} isQuickDockExpanded={quickDockExpanded}>
        <Mine {...mine.panel} />
      </MineShortcut>
      {ongoing.shortcut.isOpen ? <OngoingOrders {...ongoing.panel} /> : null}
    </>
  );
}
