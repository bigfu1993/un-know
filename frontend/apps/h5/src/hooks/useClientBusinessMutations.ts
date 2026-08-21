import {
  useApplyTutorTrial,
  useCancelTutorDemand,
  useConfirmTutorTrialStart,
  useCreateClientAddress,
  useCreateHuntingProject,
  useDecideHuntingTaskQuote,
  useHandleHuntingTaskFulfillmentAction,
  useHandleTutorWorkflowAction,
  useRequestTutorTrialEnd,
  useUpdateClientAddress,
  useUpdateTutorExposure
} from "@unknown/hooks";

/** 聚合 H5 根组件跨业务弹窗和流程需要的 mutation，避免根组件直接堆叠接口动作初始化。 */
export function useClientBusinessMutations() {
  const createHuntingProjectMutation = useCreateHuntingProject();
  const applyTutorTrialMutation = useApplyTutorTrial();
  const confirmTutorTrialStartMutation = useConfirmTutorTrialStart();
  const requestTutorTrialEndMutation = useRequestTutorTrialEnd();
  const tutorWorkflowActionMutation = useHandleTutorWorkflowAction();
  const cancelTutorDemandMutation = useCancelTutorDemand();
  const updateTutorExposureMutation = useUpdateTutorExposure();
  const decideHuntingTaskQuoteMutation = useDecideHuntingTaskQuote();
  const huntingTaskFulfillmentActionMutation = useHandleHuntingTaskFulfillmentAction();
  const createAddressMutation = useCreateClientAddress();
  const updateAddressMutation = useUpdateClientAddress();

  return {
    applyTutorTrialMutation,
    cancelTutorDemandMutation,
    confirmTutorTrialStartMutation,
    createAddressMutation,
    createHuntingProjectMutation,
    decideHuntingTaskQuoteMutation,
    huntingTaskFulfillmentActionMutation,
    requestTutorTrialEndMutation,
    tutorWorkflowActionMutation,
    updateAddressMutation,
    updateTutorExposureMutation
  };
}
