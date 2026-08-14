import { Banknote, Clock3, Crosshair, MapPin, MessageCircle, Tags, UserRound, XCircle } from "lucide-react";
import { formatCurrency } from "@shared/clientPageModel";
import {
  getDelegationAmountText,
  getDelegationDestination,
  getDelegationPrimaryActionLabel,
  getDelegationPublishTime,
  getDelegationPublisherText,
  getDelegationRequirementTags,
  isDelegationTaskLocked
} from "@pages/home/delegation/model";

/** 委托详情弹窗属性。 */
interface DelegationTaskDetailDialogProps {
  onAccept: (task: HuntingTask) => void;
  onClose: () => void;
  onContact: (task: HuntingTask) => void;
  task: HuntingTask;
}

/** 委托详情弹窗，展示完整任务信息并复用当前任务动作。 */
export function DelegationTaskDetailDialog({
  onAccept,
  onClose,
  onContact,
  task
}: DelegationTaskDetailDialogProps) {
  return (
    <section className="checkout-sheet" aria-label="委托详情">
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet-panel delegation-detail-dialog mx-auto grid max-w-[420px] gap-[12px] p-[14px]">
        <div className="card-title flex items-center justify-between gap-[10px]">
          <Crosshair size={18} />
          <div>
            <strong>{task.title}</strong>
            <span>{task.status}</span>
          </div>
          <button
            aria-label="关闭"
            className="icon-only grid h-[34px] w-[34px] place-items-center text-[#475466]"
            onClick={onClose}
            type="button"
          >
            <XCircle size={20} />
          </button>
        </div>
        <div className="delegation-preview grid gap-[9px]">
          <span>
            <Clock3 size={15} />
            发布时间：{getDelegationPublishTime(task)}
          </span>
          <span>
            <MapPin size={15} />
            委托目的地：{getDelegationDestination(task)}
          </span>
          <span>
            <UserRound size={15} />
            发布者：{getDelegationPublisherText(task)}
          </span>
          <span>
            <Banknote size={15} />
            委托金额：{getDelegationAmountText(task)}
          </span>
          {task.depositRequired ? (
            <span>
              <Banknote size={15} />
              押金：{formatCurrency(task.depositAmount ?? 0)}
            </span>
          ) : null}
          <span>
            <MessageCircle size={15} />
            描述：{task.description || "暂无描述"}
          </span>
          <span>
            <Tags size={15} />
            要求：{getDelegationRequirementTags(task).join("、")}
          </span>
        </div>
        {!task.isMine ? (
          <div className="delegation-card-actions flex flex-wrap gap-[8px]">
            <button
              className="ghost-button inline-flex min-h-[36px] flex-1 items-center justify-center gap-[5px] px-[10px] py-[8px] text-[#475466] disabled:text-[#748092]"
              onClick={() => onContact(task)}
              type="button"
            >
              <MessageCircle size={15} /> 联系
            </button>
            <button
              className="primary-button inline-flex min-h-[36px] flex-1 items-center justify-center gap-[5px] px-[10px] py-[8px] text-white disabled:text-[#748092]"
              disabled={isDelegationTaskLocked(task)}
              onClick={() => onAccept(task)}
              type="button"
            >
              <Banknote size={15} />
              {getDelegationPrimaryActionLabel(task)}
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
