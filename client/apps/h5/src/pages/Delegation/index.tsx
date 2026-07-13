import {
  ArrowDownUp,
  Banknote,
  CheckCircle2,
  Clock3,
  Crosshair,
  Filter,
  MapPin,
  MessageCircle,
  RadioTower,
  RefreshCw,
  ShieldAlert,
  Tags,
  UserRound,
  XCircle
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ScrollingTicker } from "../../components/ScrollingTicker";
import {
  huntingCertificationStatusLabels,
  type HuntingCertificationStatus
} from "../../components/HuntingCertificationCard/model";
import { formatCurrency } from "../../shared/clientPageModel";

/** 委托任务排序方式。 */
type DelegationSortMode = "amountAsc" | "amountDesc" | "default" | "time";

/** 委托页展开面板类型。 */
type DelegationToolbarPanel = "area" | "sort" | null;

/** 委托页属性。 */
export interface DelegationProps {
  huntingCertificationStatus: HuntingCertificationStatus;
  huntingTasks: HuntingTask[];
  isRefreshing?: boolean;
  onAcceptTask: (task: HuntingTask) => Promise<void> | void;
  onCertificationReviewing: () => void;
  onOpenHuntingCertification: () => void;
  onQuoteTask: (task: HuntingTask, amount: number) => Promise<void> | void;
  onRefreshTasks: () => void;
  onSelfTaskAction: () => void;
}

/** 委托页顶部规则滚动字幕文案。 */
const delegationRuleTickerItems = [
  "结算规则：发布方确认服务结束后进入观察期，默认 3 天后进入可提现钱包。",
  "取消协商规则：接受委托后 2 分钟内可自助取消，5 分钟内可协商取消。"
];

/** 委托任务排序选项。 */
const delegationSortOptions: Array<{ label: string; value: DelegationSortMode }> = [
  { label: "默认排序", value: "default" },
  { label: "时间优先", value: "time" },
  { label: "金额从高到低", value: "amountDesc" },
  { label: "金额从低到高", value: "amountAsc" }
];

/** 获取委托地址中的区域信息。 */
function getDelegationArea(location: string) {
  return location.split(/->|→|·|,|，/)[0]?.trim() || "未知区域";
}

/** 获取委托时间排序权重，数字越小代表越靠前。 */
function getDelegationTimeWeight(latestTime: string) {
  if (latestTime.includes("已超过")) {
    return Number.MAX_SAFE_INTEGER;
  }

  const relativeMinutes = /发布后\s*(\d+)\s*分钟内/.exec(latestTime);
  if (relativeMinutes) {
    return Number(relativeMinutes[1]);
  }

  const clockTime = /(\d{1,2}):(\d{2})/.exec(latestTime);
  if (!clockTime) {
    return Number.MAX_SAFE_INTEGER - 1;
  }

  const minutes = Number(clockTime[1]) * 60 + Number(clockTime[2]);
  return latestTime.includes("明天") || latestTime.includes("次日") ? minutes + 24 * 60 : minutes;
}

/** 获取委托目的地展示文案。 */
function getDelegationDestination(task: HuntingTask) {
  return task.destination || task.location || "目的地待补充";
}

/** 获取委托发布时间展示文案。 */
function getDelegationPublishTime(task: HuntingTask) {
  return task.publishTime || "平台同步";
}

/** 获取委托金额展示文案。 */
function getDelegationAmountText(task: HuntingTask) {
  return task.amountNegotiable || task.fee <= 0 ? "协商" : formatCurrency(task.fee);
}

/** 获取委托发布者展示文案，手机号由服务端返回脱敏值。 */
function getDelegationPublisherText(task: HuntingTask) {
  return `${task.publisherName || "平台用户"} · ${task.publisherPhone || "暂无手机号"}`;
}

/** 获取委托要求标签。 */
function getDelegationRequirementTags(task: HuntingTask) {
  const taggedRequirements = task.requirementTags ?? [];
  const textRequirements = (task.requirement || task.urgency || "无特殊要求")
    .split(/、|,|，|\s+/)
    .map((tag) => tag.trim())
    .filter((tag) => tag && tag !== "无特殊要求");
  const requirementItems = Array.from(new Set([...taggedRequirements, ...textRequirements]));

  return requirementItems.length > 0 ? requirementItems : ["无特殊要求"];
}

/** 判断委托是否处于发布阶段，兼容旧的待领取文案。 */
function isDelegationPublishedStatus(task: HuntingTask) {
  return task.status === "发布" || task.status.includes("待领取") || task.status.includes("已发布");
}

/** 判断委托是否处于报价阶段。 */
function isDelegationQuoteStatus(task: HuntingTask) {
  return task.status === "报价" || task.status.includes("报价");
}

/** 委托任务池只展示发布和报价状态。 */
function isDelegationListVisible(task: HuntingTask) {
  return isDelegationPublishedStatus(task) || isDelegationQuoteStatus(task);
}

/** 判断委托是否处于履约中。 */
function isDelegationFulfillingStatus(task: HuntingTask) {
  return task.status.includes("履约中") || task.status.includes("进行中") || task.status.includes("已领取");
}

/** 判断委托是否已进入不可重复领取/报价的业务状态。 */
function isDelegationTaskLocked(task: HuntingTask) {
  const lockedStatusKeywords = ["履约中", "进行中", "已领取", "完成", "取消", "异常", "争议"];

  return Boolean(task.pendingAmount) || lockedStatusKeywords.some((keyword) => task.status.includes(keyword));
}

/** 获取委托卡片主按钮文案。 */
function getDelegationPrimaryActionLabel(task: HuntingTask) {
  if (isDelegationFulfillingStatus(task)) {
    return "履约中";
  }
  if (task.status.includes("完成") || task.status.includes("取消") || task.status.includes("异常")) {
    return task.status;
  }

  return isDelegationQuoteStatus(task) || task.amountNegotiable || task.fee <= 0 ? "报价" : "接受委托";
}

/** 委托/狩猎页面，仅保留规则字幕、筛选排序工具条和委托任务列表。 */
export function Delegation({
  huntingCertificationStatus,
  huntingTasks,
  isRefreshing = false,
  onAcceptTask,
  onCertificationReviewing,
  onOpenHuntingCertification,
  onQuoteTask,
  onRefreshTasks,
  onSelfTaskAction
}: DelegationProps) {
  const [keyword, setKeyword] = useState("");
  const [activePanel, setActivePanel] = useState<DelegationToolbarPanel>(null);
  const [isHuntingModeEnabled, setIsHuntingModeEnabled] = useState(false);
  const [isCertificationPromptOpen, setIsCertificationPromptOpen] = useState(false);
  const [amountDraft, setAmountDraft] = useState("");
  const [amountError, setAmountError] = useState("");
  const [amountTaskId, setAmountTaskId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedArea, setSelectedArea] = useState("");
  const [sortMode, setSortMode] = useState<DelegationSortMode>("default");
  const isHuntingCertified = huntingCertificationStatus === "normal";
  const displayTasks = useMemo(() => huntingTasks, [huntingTasks]);
  const listTasks = useMemo(() => displayTasks.filter(isDelegationListVisible), [displayTasks]);
  const areaOptions = useMemo(
    () => Array.from(new Set(listTasks.map((task) => getDelegationArea(getDelegationDestination(task))))),
    [listTasks]
  );
  const visibleTasks = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    const tasks = listTasks.filter((task) => {
      const titleMatched = normalizedKeyword ? task.title.toLowerCase().includes(normalizedKeyword) : true;
      const areaMatched = selectedArea ? getDelegationArea(getDelegationDestination(task)) === selectedArea : true;

      return titleMatched && areaMatched;
    });

    return [...tasks].sort((leftTask, rightTask) => {
      if (sortMode === "time") {
        return getDelegationTimeWeight(leftTask.latestTime) - getDelegationTimeWeight(rightTask.latestTime);
      }
      if (sortMode === "amountDesc") {
        return rightTask.fee - leftTask.fee;
      }
      if (sortMode === "amountAsc") {
        return leftTask.fee - rightTask.fee;
      }

      return 0;
    });
  }, [listTasks, keyword, selectedArea, sortMode]);
  const selectedSortLabel =
    delegationSortOptions.find((option) => option.value === sortMode)?.label ?? "默认排序";
  const selectedTask = selectedTaskId ? visibleTasks.find((task) => task.id === selectedTaskId) ?? null : null;
  const amountTask = amountTaskId ? displayTasks.find((task) => task.id === amountTaskId) ?? null : null;

  useEffect(() => {
    if (!isHuntingModeEnabled || !isHuntingCertified) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      onRefreshTasks();
    }, 3000);

    return () => window.clearInterval(timer);
  }, [isHuntingCertified, isHuntingModeEnabled, onRefreshTasks]);

  /** 未认证时打开认证提示弹窗。 */
  function openCertificationPrompt() {
    if (huntingCertificationStatus === "reviewing") {
      onCertificationReviewing();
      return;
    }

    setIsCertificationPromptOpen(true);
  }

  /** 切换狩猎模式，认证未通过时先引导认证。 */
  function handleToggleHuntingMode() {
    if (!isHuntingModeEnabled && !isHuntingCertified) {
      openCertificationPrompt();
      return;
    }

    setIsHuntingModeEnabled((value) => !value);
  }

  /** 处理委托卡片操作，自己的委托或未认证狩猎时阻断。 */
  function handleTaskAction(task: HuntingTask) {
    if (task.isMine) {
      onSelfTaskAction();
      return;
    }
    if (!isHuntingCertified) {
      openCertificationPrompt();
    }
  }

  /** 打开委托详情弹窗。 */
  function openTaskDetail(task: HuntingTask) {
    setSelectedTaskId(task.id);
  }

  /** 校验委托领取或报价动作是否允许继续。 */
  function validateTaskOperation(task: HuntingTask) {
    if (task.isMine) {
      onSelfTaskAction();
      return false;
    }
    if (!isHuntingCertified) {
      openCertificationPrompt();
      return false;
    }
    if (isDelegationTaskLocked(task)) {
      return false;
    }

    return true;
  }

  /** 打开委托额度确认弹窗。 */
  function openAmountDialog(task: HuntingTask) {
    setAmountTaskId(task.id);
    setAmountDraft(task.fee > 0 ? String(task.fee) : "");
    setAmountError("");
  }

  /** 处理接受委托，协商金额时先进入额度流程。 */
  function handleAcceptTask(task: HuntingTask) {
    if (!validateTaskOperation(task)) {
      return;
    }
    if (isDelegationQuoteStatus(task) || task.amountNegotiable || task.fee <= 0) {
      openAmountDialog(task);
      return;
    }

    void Promise.resolve(onAcceptTask(task)).catch(() => undefined);
  }

  /** 提交委托额度，等待另一方确认。 */
  function handleSubmitAmount() {
    if (!amountTask) {
      return;
    }

    const nextAmount = Number(amountDraft.trim());
    if (!Number.isFinite(nextAmount) || nextAmount <= 0) {
      setAmountError("委托额度必须为大于 0 的数字");
      return;
    }

    setAmountError("");
    void Promise.resolve(onQuoteTask(amountTask, nextAmount))
      .then(() => {
        setAmountTaskId(null);
      })
      .catch(() => undefined);
  }

  return (
    <section className="module-stack delegation-page grid gap-[10px]">
      <ScrollingTicker ariaLabel="委托规则" items={delegationRuleTickerItems} />

      <div className="delegation-toolbar grid gap-[8px]">
        <div className="delegation-toolbar-row flex items-center gap-[8px]">
          <label className="delegation-search min-w-0 flex-1">
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
            className={`delegation-icon-button ${activePanel === "area" ? "active" : ""}`}
            onClick={() => setActivePanel((panel) => (panel === "area" ? null : "area"))}
            type="button"
          >
            <Filter size={17} />
          </button>
          <button
            aria-expanded={activePanel === "sort"}
            aria-label={`排序，当前${selectedSortLabel}`}
            className={`delegation-icon-button ${activePanel === "sort" ? "active" : ""}`}
            onClick={() => setActivePanel((panel) => (panel === "sort" ? null : "sort"))}
            type="button"
          >
            <ArrowDownUp size={17} />
          </button>
          <button
            aria-pressed={isHuntingModeEnabled}
            className={`delegation-icon-button delegation-live-button ${isHuntingModeEnabled ? "active" : ""}`}
            onClick={handleToggleHuntingMode}
            type="button"
            aria-label={isHuntingModeEnabled ? "关闭狩猎模式" : "开启狩猎模式"}
          >
            <RadioTower size={17} />
          </button>
        </div>

        {activePanel === "area" ? (
          <div className="delegation-option-panel flex flex-wrap gap-[8px]" aria-label="区域筛选">
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
          <div className="delegation-option-panel flex flex-wrap gap-[8px]" aria-label="排序方式">
            {delegationSortOptions.map((option) => (
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

        <div className={`delegation-live-status ${isHuntingModeEnabled ? "live" : ""}`}>
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

      <div className="card-list delegation-task-scroll grid gap-[10px]">
        {visibleTasks.map((task) => {
          const requirementTags = getDelegationRequirementTags(task);

          return (
            <article
              className="flow-card delegation-task-card grid gap-[10px] p-[14px]"
              key={task.id}
              onClick={() => openTaskDetail(task)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openTaskDetail(task);
                }
              }}
              role="button"
              tabIndex={0}
            >
              <div className="card-title flex items-center justify-between gap-[10px] min-w-0">
                <Crosshair size={18} />
                <div>
                  <strong>{task.title}</strong>
                  <span>发布时间：{getDelegationPublishTime(task)}</span>
                </div>
                {task.isMine ? <em className="mine-task-badge">我的</em> : null}
              </div>
              <div className="delegation-task-fields grid gap-[7px]">
                <span>
                  <MapPin size={14} />
                  目的地：{getDelegationDestination(task)}
                </span>
                <span>
                  <UserRound size={14} />
                  发布者：{getDelegationPublisherText(task)}
                </span>
                <span>
                  <Banknote size={14} />
                  委托金额：
                  <strong className="delegation-task-amount">{getDelegationAmountText(task)}</strong>
                </span>
                {task.depositRequired ? (
                  <span>
                    <Banknote size={14} />
                    押金：{formatCurrency(task.depositAmount ?? 0)}
                  </span>
                ) : null}
                <span>
                  <Tags size={14} />
                  要求：{requirementTags.join("、")}
                </span>
              </div>
              {!task.isMine ? (
                <div className="product-actions flex flex-wrap items-center justify-between gap-[10px]">
                  <div
                    className="delegation-card-actions flex flex-wrap gap-[8px]"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <button
                      className="ghost-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-[#475466] disabled:text-[#748092]"
                      onClick={() => handleTaskAction(task)}
                      type="button"
                    >
                      <MessageCircle size={15} /> 联系
                    </button>
                    <button
                      className="primary-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white disabled:text-[#748092]"
                      disabled={isDelegationTaskLocked(task)}
                      onClick={() => handleAcceptTask(task)}
                      type="button"
                    >
                      <CheckCircle2 size={15} />
                      {getDelegationPrimaryActionLabel(task)}
                    </button>
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
        {visibleTasks.length === 0 ? (
          <article className="empty-state p-[16px] text-center">
            <strong>暂无匹配委托</strong>
            <span>换个标题关键词或区域再试试。</span>
          </article>
        ) : null}
      </div>

      {selectedTask ? (
        <section className="checkout-sheet" aria-label="委托详情">
          <div className="sheet-backdrop" onClick={() => setSelectedTaskId(null)} />
          <div className="sheet-panel delegation-detail-dialog mx-auto grid max-w-[420px] gap-[12px] p-[14px]">
            <div className="card-title flex items-center justify-between gap-[10px]">
              <Crosshair size={18} />
              <div>
                <strong>{selectedTask.title}</strong>
                <span>{selectedTask.status}</span>
              </div>
              <button
                aria-label="关闭"
                className="icon-only grid h-[34px] w-[34px] place-items-center text-[#475466]"
                onClick={() => setSelectedTaskId(null)}
                type="button"
              >
                <XCircle size={20} />
              </button>
            </div>
            <div className="delegation-preview grid gap-[9px]">
              <span>
                <Clock3 size={15} />
                发布时间：{getDelegationPublishTime(selectedTask)}
              </span>
              <span>
                <MapPin size={15} />
                委托目的地：{getDelegationDestination(selectedTask)}
              </span>
              <span>
                <UserRound size={15} />
                发布者：{getDelegationPublisherText(selectedTask)}
              </span>
              <span>
                <Banknote size={15} />
                委托金额：{getDelegationAmountText(selectedTask)}
              </span>
              {selectedTask.depositRequired ? (
                <span>
                  <Banknote size={15} />
                  押金：{formatCurrency(selectedTask.depositAmount ?? 0)}
                </span>
              ) : null}
              <span>
                <MessageCircle size={15} />
                描述：{selectedTask.description || "暂无描述"}
              </span>
              <span>
                <Tags size={15} />
                要求：{getDelegationRequirementTags(selectedTask).join("、")}
              </span>
            </div>
            {!selectedTask.isMine ? (
              <div className="delegation-card-actions flex flex-wrap gap-[8px]">
                <button
                  className="ghost-button inline-flex min-h-[36px] flex-1 items-center justify-center gap-[5px] px-[10px] py-[8px] text-[#475466] disabled:text-[#748092]"
                  onClick={() => handleTaskAction(selectedTask)}
                  type="button"
                >
                  <MessageCircle size={15} /> 联系
                </button>
                <button
                  className="primary-button inline-flex min-h-[36px] flex-1 items-center justify-center gap-[5px] px-[10px] py-[8px] text-white disabled:text-[#748092]"
                  disabled={isDelegationTaskLocked(selectedTask)}
                  onClick={() => handleAcceptTask(selectedTask)}
                  type="button"
                >
                  <Banknote size={15} />
                  {getDelegationPrimaryActionLabel(selectedTask)}
                </button>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {amountTask ? (
        <section className="checkout-sheet" aria-label="委托额度确认">
          <div className="sheet-backdrop" onClick={() => setAmountTaskId(null)} />
          <div className="sheet-panel delegation-amount-dialog mx-auto grid max-w-[420px] gap-[12px] p-[14px]">
            <div className="card-title flex items-center justify-between gap-[10px]">
              <Banknote size={18} />
              <div>
                <strong>委托额度</strong>
                <span>{amountTask.title}</span>
              </div>
              <button
                aria-label="关闭"
                className="icon-only grid h-[34px] w-[34px] place-items-center text-[#475466]"
                onClick={() => setAmountTaskId(null)}
                type="button"
              >
                <XCircle size={20} />
              </button>
            </div>
            <label className="profile-field publish-field grid gap-[7px]">
              <span>输入报价金额</span>
              <input
                inputMode="decimal"
                onChange={(event) => setAmountDraft(event.target.value)}
                placeholder="请输入本次报价金额"
                type="text"
                value={amountDraft}
              />
              {amountError ? <em>{amountError}</em> : null}
            </label>
            <div className="sheet-actions grid gap-[8px]">
              <button
                className="primary-button inline-flex min-h-[38px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white"
                onClick={handleSubmitAmount}
                type="button"
              >
                <Banknote size={16} />
                提交报价
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {isCertificationPromptOpen ? (
        <section className="checkout-sheet" aria-label="狩猎认证提醒">
          <div className="sheet-backdrop" onClick={() => setIsCertificationPromptOpen(false)} />
          <div className="sheet-panel hunting-certification-prompt mx-auto grid max-w-[420px] gap-[12px] p-[14px]">
            <div className="card-title flex items-center justify-between gap-[10px]">
              <ShieldAlert size={18} />
              <div>
                <strong>需要完成狩猎认证</strong>
                <span>当前状态：{huntingCertificationStatusLabels[huntingCertificationStatus]}</span>
              </div>
              <button
                aria-label="关闭"
                className="icon-only grid h-[34px] w-[34px] place-items-center text-[#475466]"
                onClick={() => setIsCertificationPromptOpen(false)}
                type="button"
              >
                <XCircle size={20} />
              </button>
            </div>
            <p className="m-0 text-[13px] leading-[1.55] text-[#657181]">
              联系发布方、接受委托和开启狩猎模式前，需要先完成狩猎认证。
            </p>
            <button
              className="primary-button inline-flex min-h-[38px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white"
              onClick={() => {
                setIsCertificationPromptOpen(false);
                onOpenHuntingCertification();
              }}
              type="button"
            >
              <Crosshair size={16} />
              去认证
            </button>
          </div>
        </section>
      ) : null}
    </section>
  );
}
