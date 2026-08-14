import { formatCurrency } from "@shared/clientPageModel";

/** 判断委托是否处在报价阶段，兼容迁移前旧状态文案。 */
export function isHuntingQuoteStatus(task: HuntingTask) {
  return task.status.includes("报价");
}

/** 判断委托是否处在发布等待阶段，兼容迁移前旧状态文案。 */
export function isHuntingPublishedStatus(task: HuntingTask) {
  return task.status.includes("发布") || task.status.includes("待领取");
}

/** 判断委托是否处在履约阶段，兼容迁移前旧状态文案。 */
export function isHuntingFulfillingStatus(task: HuntingTask) {
  return task.status.includes("履约中") || task.status.includes("进行中") || task.status.includes("已领取");
}

/** 判断委托是否已取消，取消后的委托进入订单详情页。 */
export function isHuntingCancelledStatus(task: HuntingTask) {
  return task.status.includes("取消");
}

/** 判断委托是否已完成，完成后的委托进入订单详情页。 */
export function isHuntingCompletedStatus(task: HuntingTask) {
  return task.status.includes("完成");
}

/** 获取进行中弹窗内委托/狩猎卡片展示状态。 */
export function getHuntingOngoingStatus(task: HuntingTask) {
  /** 是否存在等待任一方确认的报价。 */
  const hasPendingQuote = isHuntingQuoteStatus(task) && (Boolean(task.isQuotedByMe) || (task.quoteCount ?? 0) > 0);

  if (task.fulfillmentAction) {
    return "待确认";
  }
  if (hasPendingQuote) {
    return "报价确认中";
  }
  if (isHuntingFulfillingStatus(task)) {
    return "履约中";
  }
  if (isHuntingPublishedStatus(task) || isHuntingQuoteStatus(task)) {
    return "发布";
  }
  return task.status;
}

/** 获取进行中弹窗内委托/狩猎卡片金额展示文案。 */
export function getHuntingOngoingAmountLabel(task: HuntingTask) {
  if (task.isQuotedByMe && typeof task.pendingAmount === "number") {
    return `报价：${formatCurrency(task.pendingAmount)}`;
  }
  if (task.isMine && isHuntingQuoteStatus(task) && (task.quoteCount ?? 0) > 0) {
    return `${task.quoteCount} 个报价`;
  }
  if (task.amountNegotiable || task.fee <= 0) {
    return "协商";
  }
  return formatCurrency(task.fee);
}

/** 获取履约中委托的对接方展示文案。 */
export function getHuntingFulfillmentContact(task: HuntingTask) {
  if (task.isMine) {
    return task.acceptedUser?.nickname ? `履约方：${task.acceptedUser.nickname}` : "履约方待确认";
  }

  return "发布方：" + (task.publisher.nickname || "平台用户");
}

/** 判断报价是否等待发布方确认，兼容迁移前旧状态文案。 */
export function isHuntingQuoteWaitingPublisher(status?: string) {
  return Boolean(status?.includes("待发布方确认") || status?.includes("待确认"));
}

/** 判断报价是否等待服务方确认。 */
export function isHuntingQuoteWaitingHunter(status?: string) {
  return Boolean(status?.includes("待服务方确认"));
}

/** 获取服务方在进行中弹窗内可见的报价协商操作文案。 */
export function getHuntingQuoteActionLabel(task: HuntingTask) {
  if (!task.isMine && task.isQuotedByMe && isHuntingQuoteWaitingHunter(task.pendingQuoteStatus)) {
    return "协商报价";
  }

  return undefined;
}

/** 将当前账号相关的发布方委托或服务方报价/履约任务转换为进行中弹窗展示项。 */
export function getHuntingOngoingOrders(tasks: HuntingTask[], role: Role): ClientOrder[] {
  return tasks
    .filter((task) => {
      const isDelegationInProgress =
        Boolean(task.isMine) &&
        (isHuntingPublishedStatus(task) || isHuntingQuoteStatus(task) || isHuntingFulfillingStatus(task));
      const isQuotedHunting = Boolean(task.isQuotedByMe) && isHuntingQuoteStatus(task);
      const isHuntingInProgress = Boolean(task.isAcceptedByMe) && isHuntingFulfillingStatus(task);

      return isDelegationInProgress || isQuotedHunting || isHuntingInProgress;
    })
    .map((task) => {
      const isFulfilling = isHuntingFulfillingStatus(task);
      const isPublisher = Boolean(task.isMine);
      const isHunter = Boolean(task.isAcceptedByMe) && !isPublisher;
      const isCancelPending = task.fulfillmentAction === "取消待确认";

      return {
        amount: task.pendingAmount ?? task.fee,
        amountLabel: getHuntingOngoingAmountLabel(task),
        canCall: isPublisher && isFulfilling,
        canConfirmCancel: (isPublisher || isHunter) && isCancelPending,
        canConfirmComplete: isPublisher && task.fulfillmentAction === "完成待确认" && !task.fulfillmentActionByMe,
        canMessage: isFulfilling,
        canRepublish: isPublisher && isCancelPending,
        canRequestCancel: (isPublisher || isHunter) && isFulfilling && !task.fulfillmentAction,
        canRequestComplete: isHunter && isFulfilling && !task.fulfillmentAction,
        category: isPublisher ? "delegation" : "hunting",
        contact: isPublisher
          ? getHuntingFulfillmentContact(task)
          : isHuntingQuoteStatus(task)
            ? "我报价的委托"
            : "我履约的委托",
        detail: `${task.mode} · ${task.fulfillmentAction ?? task.latestTime} · ${task.destination ?? task.location}`,
        id: task.id,
        phoneNumber: isPublisher ? task.acceptedUser?.phone : task.publisher.phone,
        quoteAmount: task.pendingAmount,
        quoteActionLabel: getHuntingQuoteActionLabel(task),
        quoteCount: isPublisher ? task.quoteCount : undefined,
        quoteId: task.pendingQuoteId,
        role,
        status: getHuntingOngoingStatus(task),
        title: task.title
      };
    });
}

/** 将完成和取消的委托转换为订单详情页历史订单。 */
export function getHuntingHistoryOrders(tasks: HuntingTask[], role: Role): ClientOrder[] {
  return tasks
    .filter((task) => {
      const isRelatedToCurrentUser = Boolean(task.isMine || task.isAcceptedByMe || task.isQuotedByMe);
      return isRelatedToCurrentUser && (isHuntingCompletedStatus(task) || isHuntingCancelledStatus(task));
    })
    .map((task) => {
      const isPublisher = Boolean(task.isMine);
      const amount = task.pendingAmount ?? task.fee;
      const amountLabel =
        task.amountNegotiable && typeof task.pendingAmount !== "number" ? "协商" : formatCurrency(amount);
      const destination = task.destination ?? task.location;
      const requirementText = task.requirementTags?.length
        ? task.requirementTags.join("、")
        : task.requirement || "暂无要求";
      const isCancelled = isHuntingCancelledStatus(task);

      return {
        amount,
        amountLabel,
        canRepublish: isPublisher && isCancelled,
        category: isPublisher ? "delegation" : "hunting",
        contact: getHuntingFulfillmentContact(task),
        detail: `发布时间：${task.publishTime ?? "未知"} · 目的地：${destination} · 要求：${requirementText}`,
        id: task.id,
        phoneNumber: isPublisher ? task.acceptedUser?.phone : task.publisher.phone,
        role,
        status: isCancelled ? "已取消委托" : "已完成委托",
        title: task.title
      };
    });
}

/** 获取委托任务金额展示文案，协商任务不展示 0 元。 */
export function getHuntingTaskAmountText(task: HuntingTask) {
  return task.amountNegotiable || task.fee <= 0 ? "协商" : formatCurrency(task.fee);
}

/** 委托任务排序方式。 */
export type DelegationSortMode = "amountAsc" | "amountDesc" | "default" | "time";

/** 委托页展开面板类型。 */
export type DelegationToolbarPanel = "area" | "sort" | null;

/** 委托页顶部规则滚动字幕文案。 */
export const delegationRuleTickerItems = [
  "结算规则：发布方确认服务结束后进入观察期，默认 3 天后进入可提现钱包。",
  "取消协商规则：接受委托后 2 分钟内可自助取消，5 分钟内可协商取消。"
];

/** 委托任务排序选项。 */
export const delegationSortOptions: Array<{ label: string; value: DelegationSortMode }> = [
  { label: "默认排序", value: "default" },
  { label: "时间优先", value: "time" },
  { label: "金额从高到低", value: "amountDesc" },
  { label: "金额从低到高", value: "amountAsc" }
];

/** 获取委托地址中的区域信息。 */
export function getDelegationArea(location: string) {
  return location.split(/->|→|·|,|，/)[0]?.trim() || "未知区域";
}

/** 获取委托时间排序权重，数字越小代表越靠前。 */
export function getDelegationTimeWeight(latestTime: string) {
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
export function getDelegationDestination(task: HuntingTask) {
  return task.destination || task.location || "目的地待补充";
}

/** 获取委托发布时间展示文案。 */
export function getDelegationPublishTime(task: HuntingTask) {
  return task.publishTime || "平台同步";
}

/** 获取委托发布者展示文案，手机号由服务端返回脱敏值。 */
export function getDelegationPublisherText(task: HuntingTask) {
  return `${task.publisher.nickname || "平台用户"} · ${task.publisher.phone || "暂无手机号"}`;
}

/** 获取委托要求标签。 */
export function getDelegationRequirementTags(task: HuntingTask) {
  const taggedRequirements = task.requirementTags ?? [];
  const textRequirements = (task.requirement || task.urgency || "无特殊要求")
    .split(/、|,|，|\s+/)
    .map((tag) => tag.trim())
    .filter((tag) => tag && tag !== "无特殊要求");
  const requirementItems = Array.from(new Set([...taggedRequirements, ...textRequirements]));

  return requirementItems.length > 0 ? requirementItems : ["无特殊要求"];
}

/** 委托任务池只展示发布和报价状态。 */
export function isDelegationListVisible(task: HuntingTask) {
  return isHuntingPublishedStatus(task) || isHuntingQuoteStatus(task);
}

/** 判断委托是否已进入不可重复领取/报价的业务状态。 */
export function isDelegationTaskLocked(task: HuntingTask) {
  const lockedStatusKeywords = ["履约中", "进行中", "已领取", "完成", "取消", "异常", "争议"];

  return Boolean(task.pendingAmount) || lockedStatusKeywords.some((keyword) => task.status.includes(keyword));
}

/** 获取委托卡片主按钮文案。 */
export function getDelegationPrimaryActionLabel(task: HuntingTask) {
  if (isHuntingFulfillingStatus(task)) {
    return "履约中";
  }
  if (task.status.includes("完成") || task.status.includes("取消") || task.status.includes("异常")) {
    return task.status;
  }

  return isHuntingQuoteStatus(task) || task.amountNegotiable || task.fee <= 0 ? "报价" : "接受委托";
}

/** 获取狩猎快捷开启后系统推荐的委托任务。 */
export function getRecommendedHuntingTasks(tasks: HuntingTask[], project: HuntingProject | null) {
  /** 可被推荐的委托状态关键字，兼容迁移前旧文案。 */
  const recommendableStatusKeywords = ["发布", "待", "报价", "领取", "已发布"];
  /** 当前狩猎项目覆盖的校园区域，用于提升同区域任务排序。 */
  const projectAreas = project
    ? [project.currentArea, ...project.nextStops.map((stop) => (stop.inputMode === "custom" ? stop.customArea : stop.area))]
        .map((area) => area.trim())
        .filter(Boolean)
    : [];

  return tasks
    .filter(
      (task) =>
        !task.isMine &&
        !isHuntingFulfillingStatus(task) &&
        recommendableStatusKeywords.some((keyword) => task.status.includes(keyword))
    )
    .sort((leftTask, rightTask) => {
      /** 推荐排序分值，当前项目区域命中的任务优先展示。 */
      const getScore = (task: HuntingTask) => {
        if (projectAreas.length === 0) {
          return 0;
        }

        const searchText = `${task.destination ?? ""} ${task.location} ${task.title}`;
        return projectAreas.some((area) => searchText.includes(area)) ? 1 : 0;
      };

      return getScore(rightTask) - getScore(leftTask);
    })
    .slice(0, 9);
}

/** 获取委托发布时间展示文案。 */
export function getHuntingTaskPublishTimeText(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");

  return `${month}-${day} ${hour}:${minute}`;
}

/** 判断报价是否仍处于协商中。 */
export function isNegotiatingHuntingQuote(quote: HuntingQuote | null) {
  if (!quote) {
    return false;
  }
  return !quote.status.includes("已拒绝") && !quote.status.includes("未选中") && !quote.status.includes("已确认");
}

/** 判断当前账号是否可以确认选中的报价。 */
export function canConfirmHuntingQuote(task: HuntingTask | null, quote: HuntingQuote | null) {
  if (!task || !quote) {
    return false;
  }
  if (task.isMine) {
    return isHuntingQuoteWaitingPublisher(quote.status);
  }
  return Boolean(task.isQuotedByMe) && isHuntingQuoteWaitingHunter(quote.status);
}

/** 判断当前账号是否可以向对方发起协商报价。 */
export function canCounterHuntingQuote(task: HuntingTask | null, quote: HuntingQuote | null) {
  if (!task || !quote || !isNegotiatingHuntingQuote(quote)) {
    return false;
  }
  if (task.isMine) {
    return isHuntingQuoteWaitingPublisher(quote.status);
  }

  return Boolean(task.isQuotedByMe) && isHuntingQuoteWaitingHunter(quote.status);
}

/** 判断输入金额是否构成一次新的协商报价。 */
export function hasValidCounterQuoteAmount(quote: HuntingQuote | null, value: string) {
  if (!quote) {
    return false;
  }
  const amount = Number(value.trim());

  return Number.isFinite(amount) && amount > 0 && Math.abs(amount - quote.amount) >= 0.01;
}

/** 判断输入金额是否是无效的协商报价，避免误触发确认。 */
export function hasInvalidCounterQuoteAmount(quote: HuntingQuote | null, value: string) {
  if (!quote || value.trim() === "") {
    return false;
  }
  const amount = Number(value.trim());

  return !Number.isFinite(amount) || (Math.abs(amount - quote.amount) >= 0.01 && amount <= 0);
}

/** 判断报价是否已经由发布方协商并等待服务方确认，此时发布方不能再次选择处理。 */
export function isQuoteLockedForPublisher(task: HuntingTask | null, quote: HuntingQuote) {
  return Boolean(task?.isMine && isHuntingQuoteWaitingHunter(quote.status));
}

/** 判断报价是否存在协商价，存在时列表同时展示原始报价和当前协商价。 */
export function hasCounterQuoteAmount(quote: HuntingQuote) {
  return typeof quote.originalAmount === "number" && Math.abs(quote.originalAmount - quote.amount) >= 0.01;
}
