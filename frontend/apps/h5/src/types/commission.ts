/** 委托页对外只保留跨模块的认证导航动作。 */
export interface CommissionProps {
  onOpenHuntingCertification: () => void;
}

/** 进行中委托报价决策与履约动作入参。 */
export interface UseHuntingTaskActionsOptions {
  decideQuote: (payload: {
    action: "confirm" | "counter" | "reject";
    amount?: number;
    quoteId: string;
    taskId: string;
  }) => Promise<unknown>;
  fulfillmentAction: (payload: {
    action: HuntingTaskFulfillmentActionRequest["action"];
    taskId: string;
  }) => Promise<unknown>;
  huntingTasks: HuntingTask[];
  showMessage: (content: string, options?: MessageToastOptions) => void;
}
