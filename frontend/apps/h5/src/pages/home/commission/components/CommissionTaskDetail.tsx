import { Banknote, Clock3, Crosshair, MapPin, MessageCircle, Tags, UserRound } from "lucide-react";
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

/** 委托详情弹窗属性。 */
interface CommissionTaskDetailProps {
  onAccept: (task: HuntingTask) => void;
  onClose: () => void;
  onContact: (task: HuntingTask) => void;
  task: HuntingTask;
}

/** 委托详情弹窗，展示完整任务信息并复用当前任务动作。 */
export function CommissionTaskDetail({
  onAccept,
  onClose,
  onContact,
  task
}: CommissionTaskDetailProps) {
  return (
    <Modal
      ariaLabel="委托详情"
      icon={<Crosshair size={18} />}
      onClose={onClose}
      panelClassName="commission-detail-modal mx-auto grid max-w-[420px] gap-[12px] p-[14px]"
      panelElement="div"
      title={
        <>
          <strong>{task.title}</strong>
          <span>{task.status}</span>
        </>
      }
    >
      <div className="commission-preview grid gap-[9px]">
        <span>
          <Clock3 size={15} />
          发布时间：{getCommissionPublishTime(task)}
        </span>
        <span>
          <MapPin size={15} />
          委托目的地：{getCommissionDestination(task)}
        </span>
        <span>
          <UserRound size={15} />
          发布者：{getCommissionPublisherText(task)}
        </span>
        <span>
          <Banknote size={15} />
          委托金额：{getHuntingTaskAmountText(task)}
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
          要求：{getCommissionRequirementTags(task).join("、")}
        </span>
      </div>
      {!task.isMine ? (
        <div className="commission-card-actions flex flex-wrap gap-[8px]">
          <button
            className="ghost-button inline-flex min-h-[36px] flex-1 items-center justify-center gap-[5px] px-[10px] py-[8px] text-[#475466] disabled:text-[#748092]"
            onClick={() => onContact(task)}
            type="button"
          >
            <MessageCircle size={15} /> 联系
          </button>
          <button
            className="primary-button inline-flex min-h-[36px] flex-1 items-center justify-center gap-[5px] px-[10px] py-[8px] text-white disabled:text-[#748092]"
            disabled={isCommissionTaskLocked(task)}
            onClick={() => onAccept(task)}
            type="button"
          >
            <Banknote size={15} />
            {getCommissionPrimaryActionLabel(task)}
          </button>
        </div>
      ) : null}
    </Modal>
  );
}
