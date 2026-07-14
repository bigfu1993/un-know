import type { KeyboardEvent } from "react";
import { Banknote, CheckCircle2, Crosshair, MapPin, MessageCircle, Tags, UserRound } from "lucide-react";
import { formatCurrency } from "@shared/clientPageModel";
import {
  getDelegationAmountText,
  getDelegationDestination,
  getDelegationPrimaryActionLabel,
  getDelegationPublishTime,
  getDelegationPublisherText,
  getDelegationRequirementTags,
  isDelegationTaskLocked
} from "@pages/Delegation/model";

/** 委托列表任务卡片属性。 */
interface DelegationTaskCardProps {
  onAccept: (task: HuntingTask) => void;
  onContact: (task: HuntingTask) => void;
  onOpen: (task: HuntingTask) => void;
  task: HuntingTask;
}

/** 委托列表中的单个任务卡片，负责展示任务摘要和绑定当前任务动作。 */
export function DelegationTaskCard({ onAccept, onContact, onOpen, task }: DelegationTaskCardProps) {
  const requirementTags = getDelegationRequirementTags(task);

  /** 键盘触发任务详情，保证卡片按钮语义可访问。 */
  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpen(task);
    }
  }

  return (
    <article
      className="flow-card delegation-task-card grid gap-[10px] p-[14px]"
      onClick={() => onOpen(task)}
      onKeyDown={handleKeyDown}
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
          <div className="delegation-card-actions flex flex-wrap gap-[8px]" onClick={(event) => event.stopPropagation()}>
            <button
              className="ghost-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-[#475466] disabled:text-[#748092]"
              onClick={() => onContact(task)}
              type="button"
            >
              <MessageCircle size={15} /> 联系
            </button>
            <button
              className="primary-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white disabled:text-[#748092]"
              disabled={isDelegationTaskLocked(task)}
              onClick={() => onAccept(task)}
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
}
