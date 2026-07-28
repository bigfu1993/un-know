import {
  useAcceptHuntingTask,
  useApplyTutorTrial,
  useCancelTutorDemand,
  useCompleteTutorTrialEnd,
  useConfirmTutorTrial,
  useConfirmTutorTrialStart,
  useCreateClientAddress,
  useCreateHuntingProject,
  useDecideHuntingTaskQuote,
  useHandleHuntingTaskFulfillmentAction,
  useHandleTutorWorkflowAction,
  usePublishHuntingTask,
  usePublishTutorDemand,
  usePurchaseProduct,
  useQuoteHuntingTask,
  useRequestTutorTrialEnd,
  useUpdateClientAddress,
  useUpdateTutorExposure
} from "@unknown/hooks";

/** 聚合 H5 根组件跨业务弹窗和流程需要的 mutation，避免根组件直接堆叠接口动作初始化。 */
export function useClientBusinessMutations() {
  const purchaseMutation = usePurchaseProduct();
  const publishHuntingTaskMutation = usePublishHuntingTask();
  const publishTutorDemandMutation = usePublishTutorDemand();
  const createHuntingProjectMutation = useCreateHuntingProject();
  const applyTutorTrialMutation = useApplyTutorTrial();
  const confirmTutorTrialMutation = useConfirmTutorTrial();
  const confirmTutorTrialStartMutation = useConfirmTutorTrialStart();
  const requestTutorTrialEndMutation = useRequestTutorTrialEnd();
  const completeTutorTrialEndMutation = useCompleteTutorTrialEnd();
  const tutorWorkflowActionMutation = useHandleTutorWorkflowAction();
  const cancelTutorDemandMutation = useCancelTutorDemand();
  const updateTutorExposureMutation = useUpdateTutorExposure();
  const acceptHuntingTaskMutation = useAcceptHuntingTask();
  const quoteHuntingTaskMutation = useQuoteHuntingTask();
  const decideHuntingTaskQuoteMutation = useDecideHuntingTaskQuote();
  const huntingTaskFulfillmentActionMutation = useHandleHuntingTaskFulfillmentAction();
  const createAddressMutation = useCreateClientAddress();
  const updateAddressMutation = useUpdateClientAddress();

  return {
    acceptHuntingTaskMutation,
    applyTutorTrialMutation,
    cancelTutorDemandMutation,
    completeTutorTrialEndMutation,
    confirmTutorTrialMutation,
    confirmTutorTrialStartMutation,
    createAddressMutation,
    createHuntingProjectMutation,
    decideHuntingTaskQuoteMutation,
    huntingTaskFulfillmentActionMutation,
    publishHuntingTaskMutation,
    publishTutorDemandMutation,
    purchaseMutation,
    quoteHuntingTaskMutation,
    requestTutorTrialEndMutation,
    tutorWorkflowActionMutation,
    updateAddressMutation,
    updateTutorExposureMutation
  };
}
