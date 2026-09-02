import type { KeyboardEvent } from "react";
import { Banknote, CheckCircle2, Crosshair, MapPin, MessageCircle, Tags, UserRound } from "lucide-react";
import { formatCurrency } from "@shared/clientPageModel";
import {
  getCommissionDestination,
  getCommissionPrimaryActionLabel,
  getCommissionPublishTime,
  getCommissionPublisherText,
  getCommissionRequirementTags,
  getHuntingTaskAmountText,
  isCommissionTaskLocked
} from "@pages/home/commission/model";

/** 委托列表任务卡片属性。 */
interface CommissionTaskCardProps {
  onAccept: (task: HuntingTask) => void;
  onContact: (task: HuntingTask) => void;
  onOpen: (task: HuntingTask) => void;
  task: HuntingTask;
}

/** 委托列表中的单个任务卡片，负责展示任务摘要和绑定当前任务动作。 */
export function CommissionTaskCard({ onAccept, onContact, onOpen, task }: CommissionTaskCardProps) {
  const requirementTags = getCommissionRequirementTags(task);

  /** 键盘触发任务详情，保证卡片按钮语义可访问。 */
  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpen(task);
    }
  }

  return (
    <article
      className="flow-card commission-card-container grid gap-[10px] p-[14px]"
      onClick={() => onOpen(task)}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
    >
      <div className="commission-card-header card-title flex items-center justify-between gap-[10px] min-w-0">
        <Crosshair size={18} />
        <div className="commission-task-title-copy min-w-0 flex-1">
          <strong className="card-title-chip">{task.title}</strong>
          <span>发布时间：{getCommissionPublishTime(task)}</span>
        </div>
        {task.isMine ? <em className="mine-task-badge">我的</em> : null}
      </div>
      <div className="commission-card-content commission-task-fields grid gap-[7px]">
        <span>
          <MapPin size={14} />
          目的地：{getCommissionDestination(task)}
        </span>
        <span>
          <UserRound size={14} />
          发布者：{getCommissionPublisherText(task)}
        </span>
        <span>
          <Banknote size={14} />
          委托金额：
          <strong className="commission-task-amount">{getHuntingTaskAmountText(task)}</strong>
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
        <div className="commission-card-footer flex flex-wrap items-center gap-[8px]" onClick={(event) => event.stopPropagation()}>
          <button
            className="ghost-button button-inline-layout min-h-[34px] px-[10px] py-[8px] text-[var(--h5-muted)] disabled:text-[var(--h5-subtle)]"
            onClick={() => onContact(task)}
            type="button"
          >
            <MessageCircle size={15} /> 联系
          </button>
          <button
            className="primary-button button-inline-layout min-h-[34px] px-[10px] py-[8px] text-white disabled:text-[var(--h5-subtle)]"
            disabled={isCommissionTaskLocked(task)}
            onClick={() => onAccept(task)}
            type="button"
          >
            <CheckCircle2 size={15} />
            {getCommissionPrimaryActionLabel(task)}
          </button>
        </div>
      ) : null}
    </article>
  );
}
