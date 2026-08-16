/** 右下角快捷入口轨道，仅维护展开态布局，内容由调用方插槽传入。 */
export function QuickActionDock({ children, isExpanded }: { children: ReactNode; isExpanded: boolean }) {
  return (
    <div className={`quick-action-dock ${isExpanded ? "expanded" : "collapsed"}`} aria-label="我的快捷操作">
      {children}
    </div>
  );
}
