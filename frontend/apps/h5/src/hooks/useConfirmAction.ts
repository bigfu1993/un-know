/** 二次确认动作的配置项。 */
export interface ConfirmActionConfig {
  confirmLabel: string;
  description: string;
  onConfirm: () => void;
  title: string;
}

/** 管理需要二次确认的业务动作弹窗状态，并在确认后执行原动作。 */
export function useConfirmAction() {
  const [confirmation, setConfirmation] = useState<ConfirmActionConfig | null>(null);

  /** 确认当前动作后关闭弹窗，并执行调用方提供的真实业务回调。 */
  function confirmCurrentAction() {
    const currentConfirmation = confirmation;

    if (!currentConfirmation) {
      return;
    }

    setConfirmation(null);
    currentConfirmation.onConfirm();
  }

  return {
    closeConfirmation: () => setConfirmation(null),
    confirmCurrentAction,
    confirmation,
    openConfirmation: setConfirmation
  };
}
