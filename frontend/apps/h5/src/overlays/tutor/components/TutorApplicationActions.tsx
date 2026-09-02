/**
 * TutorApplications 申请卡片的纯派生逻辑，以及"单张申请卡独立操作"、"底部唯一主操作"两个
 * 渲染子组件。从 TutorApplications 拆出以控制其单文件规模，组件本体只保留状态编排和 JSX 骨架，
 * 这里的组件只依赖调用方传入的候选人/流程模型/回调，不直接持有弹层开关等页面级状态。
 */

/** 只有没有底部主操作的拒绝正式雇佣卡片不可选，其余阶段均由同一选中态驱动。 */
export function canSelectApplicationCandidate(candidateTask: ReturnType<typeof createTutorTaskModel>) {
  return !candidateTask.can("removeRejectedServiceOffer");
}

/** 获取申请卡片中已确认过的试课日程摘要。 */
export function getCandidateTrialScheduleSummary(candidate: TutorApplicationCandidate | undefined) {
  if (!candidate) {
    return "";
  }

  const task = createTutorTaskModel({ candidate, role: "parent" });

  return task.node === "trialScheduled" ? (candidate.trialSchedule ?? "") : "";
}

/** 已有家长试课排期时回填当前申请，不读取其他申请人的占用时间作为当前草稿。 */
export function getCandidateInitialTrialScheduleValue(candidate: TutorApplicationCandidate | undefined) {
  const existingTrialScheduleSummary = getCandidateTrialScheduleSummary(candidate);

  return existingTrialScheduleSummary ? getTrialScheduleValueFromSummary(existingTrialScheduleSummary) : null;
}

/** 根据申请阶段生成卡片日程预览。 */
export function getCandidateSchedulePreview(
  candidate: TutorApplicationCandidate,
  candidateTask: ReturnType<typeof createTutorTaskModel>
): TutorSchedulePreviewState {
  const trialScheduleSection = candidate.trialSchedule?.trim()
    ? {
        dataType: "tested" as const,
        summary: candidate.trialSchedule.trim(),
        title: "试课安排"
      }
    : null;

  if (candidateTask.node === "serviceSchedulePending") {
    const sections = compactTutorSchedulePreviewSections([
      candidate.availability?.trim()
        ? {
            dataType: "arranged" as const,
            summary: candidate.availability.trim(),
            title: "可家教时间"
          }
        : null,
      trialScheduleSection
    ]);

    return {
      buttonLabel: "可家教时间",
      emptyLabel: "暂无可家教时间",
      sections,
      subtitle: "查看学生同意正式雇佣后提交的可家教日期，并据此制定正式雇佣日程。",
      summary: candidate.availability?.trim() ?? "",
      title: "可家教时间"
    };
  }

  if (candidateTask.node === "formalTutoring") {
    const sections = compactTutorSchedulePreviewSections([
      trialScheduleSection,
      candidate.serviceSchedule?.trim()
        ? {
            dataType: "arranged" as const,
            summary: candidate.serviceSchedule.trim(),
            title: "课程安排"
          }
        : null
    ]);

    return {
      buttonLabel: "课程",
      emptyLabel: "暂无课程安排",
      sections,
      subtitle: "查看家长提交的正式雇佣日程。",
      summary: candidate.serviceSchedule?.trim() || candidate.trialSchedule?.trim() || "",
      title: "课程安排"
    };
  }

  return {
    buttonLabel: "日程",
    emptyLabel: "暂无试课安排",
    sections: trialScheduleSection ? [trialScheduleSection] : [],
    subtitle: "查看当前学生的试课安排。",
    summary: candidate.trialSchedule?.trim() ?? "",
    title: "试课安排"
  };
}

/** 单张申请卡独立操作的属性。 */
interface TutorApplicationCardActionsProps {
  candidate: TutorApplicationCandidate;
  candidateTask: ReturnType<typeof createTutorTaskModel>;
  onOpenCancelConfirmation: (config: ConfirmActionConfig) => void;
  onSubmitAction: (candidate: TutorApplicationCandidate, action: TutorWorkflowAction) => void;
  submissionPending: boolean;
}

/** 渲染单张申请卡的独立操作（拒绝试课/取消试课/取消兼职确认/移除+再次委托），按候选人自身流程能力分支。 */
export function TutorApplicationCardActions({
  candidate,
  candidateTask,
  onOpenCancelConfirmation,
  onSubmitAction,
  submissionPending
}: TutorApplicationCardActionsProps) {
  const actionButtons = candidateTask.can("rejectTrial") ? (
    <button
      className="danger-outline-button button-inline-layout min-h-[30px] px-[9px] py-[6px] text-[12px]"
      disabled={submissionPending}
      onClick={() => onSubmitAction(candidate, "reject_trial")}
      type="button"
    >
      拒绝试课
    </button>
  ) : candidateTask.can("cancelApplication") ? (
    <button
      className="text-button danger button-inline-layout min-h-[30px] px-[9px] py-[6px] text-[12px]"
      disabled={submissionPending}
      onClick={() =>
        onOpenCancelConfirmation({
          confirmLabel: "确认取消",
          description: "取消后该学生本次试课结束，学生端与申请列表会按真实状态刷新。",
          onConfirm: () => onSubmitAction(candidate, "cancel_trial"),
          title: "取消试课"
        })
      }
      type="button"
    >
      取消试课
    </button>
  ) : candidateTask.can("cancelServiceConfirmation") ? (
    <button
      className="text-button danger button-inline-layout min-h-[30px] px-[9px] py-[6px] text-[12px]"
      disabled={submissionPending}
      onClick={() =>
        onOpenCancelConfirmation({
          confirmLabel: "确认取消",
          description: "取消后流程将回到试课结算阶段，需要重新处理正式雇佣确认。",
          onConfirm: () => onSubmitAction(candidate, "cancel_service_confirmation"),
          title: "取消兼职确认"
        })
      }
      type="button"
    >
      取消兼职确认
    </button>
  ) : candidateTask.can("removeRejectedServiceOffer") ? (
    <>
      <button
        className="ghost-button min-h-[30px] px-[9px] py-[6px] text-[12px] text-[var(--h5-muted)]"
        disabled={submissionPending}
        onClick={() => onSubmitAction(candidate, "remove_rejected_service_offer")}
        type="button"
      >
        移除
      </button>
      <button
        className="primary-button button-inline-layout min-h-[30px] px-[9px] py-[6px] text-[12px] text-white"
        disabled={submissionPending}
        onClick={() => onSubmitAction(candidate, "offer_service")}
        type="button"
      >
        再次委托
      </button>
    </>
  ) : null;

  return actionButtons ? <div className="tutor-application-actions flex flex-wrap gap-[8px]">{actionButtons}</div> : null;
}

/** 申请列表底部唯一主操作的属性；试课确认相关的派生状态（是否可确认、按钮文案）由组件内部
 *  根据 selectedCandidate/selectedCandidateTask/trialScheduleValue 计算，调用方不需要预先算好。 */
interface TutorApplicationPrimaryActionProps {
  /** 由调用方基于 selectedCandidateTask.can("scheduleTrial"/"rescheduleTrial") 算好传入，
   *  因为调用方自己也需要这个值去决定是否发起试课占用查询和模板开关。 */
  canScheduleSelectedCandidate: boolean;
  onConfirmTrial: () => void;
  onOpenServiceSchedule: () => void;
  onOpenSettlement: (
    candidate: TutorApplicationCandidate,
    action: TutorSettlementAction,
    mode?: "service" | "trial"
  ) => void;
  onOpenTrialSchedule: () => void;
  onSelectNotHire: () => void;
  onWorkflowAction: (action: TutorWorkflowAction) => void;
  selectedCandidate: TutorApplicationCandidate | undefined;
  selectedCandidateTask: ReturnType<typeof createTutorTaskModel> | null;
  submissionPending: boolean;
  trialOccupancyError: unknown;
  trialOccupancyPending: boolean;
  trialScheduleValue: TrialScheduleValue | null;
}

/** 按当前选中申请人的流程节点渲染唯一底部主操作：未选中时禁用占位，可制定/调整试课时展示
 *  排期入口 + 提交按钮，其余阶段按流程能力（结算/雇佣决策/日程提交/结束/结算重提）分支。 */
export function TutorApplicationPrimaryAction({
  canScheduleSelectedCandidate,
  onConfirmTrial,
  onOpenServiceSchedule,
  onOpenSettlement,
  onOpenTrialSchedule,
  onSelectNotHire,
  onWorkflowAction,
  selectedCandidate,
  selectedCandidateTask,
  submissionPending,
  trialOccupancyError,
  trialOccupancyPending,
  trialScheduleValue
}: TutorApplicationPrimaryActionProps) {
  if (!selectedCandidate || !selectedCandidateTask) {
    return (
      <button
        className="primary-button button-inline-layout min-h-[38px] px-[10px] py-[8px] text-white disabled:text-[var(--h5-subtle)]"
        disabled
        type="button"
      >
        <CheckCircle2 size={16} />
        选择申请人
      </button>
    );
  }

  const isSelectedCandidateTrialConfirming = selectedCandidateTask.node === "trialScheduled";
  const selectedCandidateTrialScheduleSummary = getCandidateTrialScheduleSummary(selectedCandidate);
  const isTrialScheduleChanged = Boolean(
    isSelectedCandidateTrialConfirming &&
      trialScheduleValue?.plan.summary &&
      trialScheduleValue.plan.summary !== selectedCandidateTrialScheduleSummary
  );
  const canConfirmTrial = Boolean(
    trialScheduleValue?.plan &&
      !submissionPending &&
      !trialOccupancyPending &&
      (!isSelectedCandidateTrialConfirming || isTrialScheduleChanged)
  );

  /** 获取试课日程提交按钮文案。 */
  function getConfirmTrialButtonLabel() {
    if (submissionPending) {
      return "提交中";
    }
    if (isTrialScheduleChanged) {
      return "修改试课安排";
    }

    return "提交试课日程";
  }

  if (canScheduleSelectedCandidate) {
    return (
      <>
        <div className="tutor-trial-form grid gap-[8px]">
          <button
            className={`tutor-trial-schedule-button ${trialScheduleValue ? "filled" : ""}`}
            disabled={trialOccupancyPending || Boolean(trialOccupancyError)}
            onClick={onOpenTrialSchedule}
            type="button"
          >
            <CalendarClock size={17} />
            <span>
              {trialOccupancyPending
                ? "加载占用时间"
                : isSelectedCandidateTrialConfirming
                  ? "调整试课计划"
                  : "制定试课计划"}
            </span>
          </button>
          {trialScheduleValue ? (
            <div className="tutor-trial-schedule-summary">
              {getTrialScheduleSummaryLines(trialScheduleValue.plan.summary).map((summaryLine) => (
                <span key={summaryLine}>{summaryLine}</span>
              ))}
            </div>
          ) : null}
        </div>
        <button
          className="primary-button button-inline-layout min-h-[38px] px-[10px] py-[8px] text-white disabled:text-[var(--h5-subtle)]"
          disabled={!canConfirmTrial}
          onClick={onConfirmTrial}
          type="button"
        >
          <CheckCircle2 size={16} />
          {getConfirmTrialButtonLabel()}
        </button>
      </>
    );
  }

  if (selectedCandidateTask.can("requestTrialResult")) {
    return (
      <button
        className="primary-button button-inline-layout min-h-[38px] px-[10px] py-[8px] text-white"
        disabled={submissionPending}
        onClick={() => onOpenSettlement(selectedCandidate, "request_trial_result")}
        type="button"
      >
        <CheckCircle2 size={16} />
        结束试课
      </button>
    );
  }

  if (selectedCandidateTask.can("confirmTrialEnd")) {
    return (
      <button
        className="primary-button button-inline-layout min-h-[38px] px-[10px] py-[8px] text-white"
        disabled={submissionPending}
        onClick={() => onOpenSettlement(selectedCandidate, "confirm_trial_end")}
        type="button"
      >
        <CheckCircle2 size={16} />
        确认结束试课
      </button>
    );
  }

  if (selectedCandidateTask.can("offerTutorService") || selectedCandidateTask.can("closeTrialContinueRecruiting")) {
    return (
      <div className="sheet-actions grid grid-cols-2 gap-[8px]">
        <button
          className="ghost-button min-h-[38px] px-[10px] py-[8px]"
          disabled={submissionPending}
          onClick={onSelectNotHire}
          type="button"
        >
          不正式雇佣
        </button>
        <button
          className="primary-button min-h-[38px] px-[10px] py-[8px] text-white"
          disabled={submissionPending}
          onClick={() => onWorkflowAction("offer_service")}
          type="button"
        >
          正式雇佣
        </button>
      </div>
    );
  }

  if (selectedCandidateTask.can("submitServiceSchedule")) {
    return (
      <button
        className="primary-button button-inline-layout min-h-[38px] px-[10px] py-[8px] text-white"
        disabled={submissionPending}
        onClick={onOpenServiceSchedule}
        type="button"
      >
        <CalendarClock size={16} />
        提交正式雇佣日程
      </button>
    );
  }

  if (selectedCandidateTask.can("requestServiceEnd")) {
    return (
      <button
        className="danger-outline-button button-inline-layout min-h-[38px] px-[10px] py-[8px]"
        disabled={submissionPending}
        onClick={() => onOpenSettlement(selectedCandidate, "request_service_end", "service")}
        type="button"
      >
        结束
      </button>
    );
  }

  if (selectedCandidateTask.can("resubmitSettlement")) {
    return (
      <button
        className="primary-button button-inline-layout min-h-[38px] px-[10px] py-[8px] text-white"
        disabled={submissionPending}
        onClick={() => onWorkflowAction("resubmit_settlement")}
        type="button"
      >
        重新提交结算确认
      </button>
    );
  }

  return (
    <button
      className="ghost-button button-inline-layout min-h-[38px] px-[10px] py-[8px] text-[var(--h5-muted)]"
      disabled
      type="button"
    >
      等待对方处理
    </button>
  );
}
