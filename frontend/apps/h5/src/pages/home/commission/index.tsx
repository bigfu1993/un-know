import "./index.less";
import { ArrowDownUp, Filter, RadioTower, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { CommissionAmount } from "@pages/home/commission/components/CommissionAmount";
import { CommissionTaskCard } from "@pages/home/commission/components/CommissionTaskCard";
import { CommissionTaskDetail } from "@pages/home/commission/components/CommissionTaskDetail";
import { HuntingCertificationPrompt } from "@pages/home/commission/components/HuntingCertificationPrompt";
import { commissionRuleTickerItems, commissionSortOptions } from "@pages/home/commission/model";
import { useCommissionList } from "@pages/home/commission/hooks/useCommissionList";
import { useCommissionTaskFlow } from "@pages/home/commission/hooks/useCommissionTaskFlow";
import { showMessage } from "@tools/messageToast";

/** 委托页属性。 */
export interface CommissionProps {
  huntingCertificationStatus: HuntingCertificationStatus;
  huntingTasks: HuntingTask[];
  isRefreshing?: boolean;
  onAcceptTask: (task: HuntingTask) => Promise<void> | void;
  onOpenHuntingCertification: () => void;
  onQuoteTask: (task: HuntingTask, amount: number) => Promise<void> | void;
  onRefreshTasks: () => void;
}

/** 委托/狩猎页面，负责工具条编排、任务列表组合和页面级弹窗挂载。 */
export function Commission({
  huntingCertificationStatus,
  huntingTasks,
  isRefreshing = false,
  onAcceptTask,
  onOpenHuntingCertification,
  onQuoteTask,
  onRefreshTasks
}: CommissionProps) {
  const [isHuntingModeEnabled, setIsHuntingModeEnabled] = useState(false);
  const {
    activePanel,
    areaOptions,
    displayTasks,
    keyword,
    selectedArea,
    selectedSortLabel,
    setActivePanel,
    setKeyword,
    setSelectedArea,
    setSortMode,
    sortMode,
    visibleTasks
  } = useCommissionList(huntingTasks);
  const {
    amountTask,
    closeAmountPanel,
    closeCertificationPrompt,
    closeTaskDetail,
    handleAcceptTask,
    handleContactTask,
    isCertificationPromptOpen,
    isHuntingCertified,
    openCertificationPrompt,
    openHuntingCertificationFromPrompt,
    openTaskDetail,
    selectedTask,
    submitAmount
  } = useCommissionTaskFlow({
    displayTasks,
    huntingCertificationStatus,
    onAcceptTask,
    onOpenHuntingCertification,
    onQuoteTask,
    showMessage,
    visibleTasks
  });

  useEffect(() => {
    if (!isHuntingModeEnabled || !isHuntingCertified) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      onRefreshTasks();
    }, 3000);

    return () => window.clearInterval(timer);
  }, [isHuntingCertified, isHuntingModeEnabled, onRefreshTasks]);

  /** 切换狩猎模式，认证未通过时先引导认证。 */
  function handleToggleHuntingMode() {
    if (!isHuntingModeEnabled && !isHuntingCertified) {
      openCertificationPrompt();
      return;
    }

    setIsHuntingModeEnabled((value) => !value);
  }

  return (
    <section className="module-stack commission-page grid gap-[10px]">
      <ScrollingTicker ariaLabel="委托规则" items={commissionRuleTickerItems} />

      <div className="commission-toolbar grid gap-[8px]">
        <div className="commission-toolbar-row flex items-center gap-[8px]">
          <label className="commission-search min-w-0 flex-1">
            <span className="sr-only">搜索标题</span>
            <input
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="搜索标题"
              type="search"
              value={keyword}
            />
          </label>
          <button
            aria-expanded={activePanel === "area"}
            aria-label={`区域筛选，当前${selectedArea || "全部区域"}`}
            className={`commission-icon-button ${activePanel === "area" ? "active" : ""}`}
            onClick={() => setActivePanel((panel) => (panel === "area" ? null : "area"))}
            type="button"
          >
            <Filter size={17} />
          </button>
          <button
            aria-expanded={activePanel === "sort"}
            aria-label={`排序，当前${selectedSortLabel}`}
            className={`commission-icon-button ${activePanel === "sort" ? "active" : ""}`}
            onClick={() => setActivePanel((panel) => (panel === "sort" ? null : "sort"))}
            type="button"
          >
            <ArrowDownUp size={17} />
          </button>
          <button
            aria-pressed={isHuntingModeEnabled}
            className={`commission-icon-button commission-live-button ${isHuntingModeEnabled ? "active" : ""}`}
            onClick={handleToggleHuntingMode}
            type="button"
            aria-label={isHuntingModeEnabled ? "关闭狩猎模式" : "开启狩猎模式"}
          >
            <RadioTower size={17} />
          </button>
        </div>

        {activePanel === "area" ? (
          <div className="commission-option-panel flex flex-wrap gap-[8px]" aria-label="区域筛选">
            {["", ...areaOptions].map((area) => (
              <button
                className={selectedArea === area ? "active" : ""}
                key={area || "all"}
                onClick={() => {
                  setSelectedArea(area);
                  setActivePanel(null);
                }}
                type="button"
              >
                {area || "全部区域"}
              </button>
            ))}
          </div>
        ) : null}

        {activePanel === "sort" ? (
          <div className="commission-option-panel flex flex-wrap gap-[8px]" aria-label="排序方式">
            {commissionSortOptions.map((option) => (
              <button
                className={sortMode === option.value ? "active" : ""}
                key={option.value}
                onClick={() => {
                  setSortMode(option.value);
                  setActivePanel(null);
                }}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : null}

        <div className={`commission-live-status ${isHuntingModeEnabled ? "live" : ""}`}>
          <span>
            {isHuntingModeEnabled
              ? "狩猎模式已开启，委托列表实时推送中。"
              : "狩猎模式未开启，委托列表需要手动刷新。"}
          </span>
          {!isHuntingModeEnabled ? (
            <button disabled={isRefreshing} onClick={onRefreshTasks} type="button">
              <RefreshCw size={14} />
              {isRefreshing ? "刷新中" : "刷新"}
            </button>
          ) : null}
        </div>
      </div>

      <div className="card-list commission-task-scroll grid gap-[10px]">
        {visibleTasks.map((task) => (
          <CommissionTaskCard
            key={task.id}
            onAccept={handleAcceptTask}
            onContact={handleContactTask}
            onOpen={openTaskDetail}
            task={task}
          />
        ))}
        {visibleTasks.length === 0 ? (
          <article className="empty-state p-[16px] text-center">
            <strong>暂无匹配委托</strong>
            <span>换个标题关键词或区域再试试。</span>
          </article>
        ) : null}
      </div>

      {selectedTask ? (
        <CommissionTaskDetail
          onAccept={handleAcceptTask}
          onClose={closeTaskDetail}
          onContact={handleContactTask}
          task={selectedTask}
        />
      ) : null}

      {amountTask ? (
        <CommissionAmount
          onClose={closeAmountPanel}
          onSubmit={submitAmount}
          task={amountTask}
        />
      ) : null}

      {isCertificationPromptOpen ? (
        <HuntingCertificationPrompt
          certificationStatus={huntingCertificationStatus}
          onClose={closeCertificationPrompt}
          onOpenCertification={openHuntingCertificationFromPrompt}
        />
      ) : null}
    </section>
  );
}
