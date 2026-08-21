/** 根据家教流程动作生成统一成功反馈。 */
export function getTutorWorkflowSuccessMessage(payload: TutorWorkflowActionPayload) {
  const trialSettlementMessage =
    payload.hireTutor === true
      ? "试课费用已提交，学生确认后将进入正式雇佣确认。"
      : payload.hireTutor === false
        ? "试课费用已提交，学生确认后将结束本次试课。"
        : "试课费用已提交，等待学生确认。";
  const successMessages: Partial<Record<TutorWorkflowAction, string>> = {
    accept_service_offer: "已同意正式雇佣，可家教日期已提交，家教兼职已进入进行中。",
    cancel_trial: "已取消试课。",
    cancel_service_confirmation: "已取消兼职确认，流程已回到试课结算阶段。",
    close_trial_end_demand: "本次试课已结束，家教兼职已结束。",
    close_trial_continue_recruiting: "已选择不正式雇佣，本次试课已结束。",
    confirm_service_schedule: "正式雇佣已确认。",
    confirm_settlement: "已确认结算，流程已更新。",
    confirm_trial_end: trialSettlementMessage,
    offer_service: "已发起正式雇佣确认，等待学生确认。",
    reject_service_offer: "已拒绝正式雇佣。",
    reject_service_offer_salary: "已反馈薪资原因，等待家长重新发起正式雇佣确认。",
    reject_trial: "已拒绝试课申请。",
    request_service_end:
      payload.trialFee === undefined ? "已提交结束申请，等待家长确认结算。" : "结算金额已提交，家教主任务已结束。",
    request_service_schedule_change: "可家教日期已重新提交，等待家长重新制定正式雇佣日程。",
    remove_rejected_service_offer: "已移除拒绝正式委托的记录。",
    request_settlement_revision: "已要求修改结算金额。",
    request_trial_result: trialSettlementMessage,
    request_trial_settlement: "已发起结算确认，等待学生确认。",
    resubmit_settlement: "已重新提交结算确认。",
    submit_service_schedule: "正式雇佣日程已提交，正式雇佣开始。",
    update_trial_availability: "已回到申请试课中，等待家长重新处理。"
  };

  return successMessages[payload.action] ?? "家教流程已更新。";
}
