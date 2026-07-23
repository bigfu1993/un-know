import { isDelegationQuoteStatus, isDelegationTaskLocked } from "@pages/home/delegation/model";

/** 委托页任务交互流程入参。 */
interface UseDelegationTaskFlowOptions {
  displayTasks: HuntingTask[];
  huntingCertificationStatus: HuntingCertificationStatus;
  onAcceptTask: (task: HuntingTask) => Promise<void> | void;
  onOpenHuntingCertification: () => void;
  onQuoteTask: (task: HuntingTask, amount: number) => Promise<void> | void;
  showMessage: (content: string, options?: MessageToastOptions) => void;
  visibleTasks: HuntingTask[];
}

/** 委托页详情、认证提示和报价金额弹窗流程。 */
export function useDelegationTaskFlow({
  displayTasks,
  huntingCertificationStatus,
  onAcceptTask,
  onOpenHuntingCertification,
  onQuoteTask,
  showMessage,
  visibleTasks
}: UseDelegationTaskFlowOptions) {
  const [isCertificationPromptOpen, setIsCertificationPromptOpen] = useState(false);
  const [amountTaskId, setAmountTaskId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const isHuntingCertified = huntingCertificationStatus === "normal";
  const selectedTask = selectedTaskId ? visibleTasks.find((task) => task.id === selectedTaskId) ?? null : null;
  const amountTask = amountTaskId ? displayTasks.find((task) => task.id === amountTaskId) ?? null : null;

  /** 未认证时打开认证提示弹窗。 */
  function openCertificationPrompt() {
    if (huntingCertificationStatus === "reviewing") {
      showMessage("狩猎认证系统审批中...", { type: "warning" });
      return;
    }

    setIsCertificationPromptOpen(true);
  }

  /** 自己发布的委托只能在发布方流程中处理，列表操作给出本页提示。 */
  function showSelfTaskWarning() {
    showMessage("不能联系、报价或接受自己发布的委托。", { type: "warning" });
  }

  /** 处理委托卡片联系动作，自己的委托或未认证狩猎时阻断。 */
  function handleContactTask(task: HuntingTask) {
    if (task.isMine) {
      showSelfTaskWarning();
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

  /** 关闭委托详情弹窗。 */
  function closeTaskDetail() {
    setSelectedTaskId(null);
  }

  /** 校验委托领取或报价动作是否允许继续。 */
  function validateTaskOperation(task: HuntingTask) {
    if (task.isMine) {
      showSelfTaskWarning();
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

  /** 关闭金额报价弹窗并重置本地校验反馈。 */
  function closeAmountDialog() {
    setAmountTaskId(null);
  }

  /** 提交委托额度，等待另一方确认。 */
  async function submitAmount(amount: number) {
    if (!amountTask) {
      return;
    }

    await Promise.resolve(onQuoteTask(amountTask, amount));
  }

  /** 关闭认证提示弹窗。 */
  function closeCertificationPrompt() {
    setIsCertificationPromptOpen(false);
  }

  /** 从认证提示弹窗进入狩猎认证页面。 */
  function openHuntingCertificationFromPrompt() {
    setIsCertificationPromptOpen(false);
    onOpenHuntingCertification();
  }

  return {
    amountTask,
    closeAmountDialog,
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
  };
}
