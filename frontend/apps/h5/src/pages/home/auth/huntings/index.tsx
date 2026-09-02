import { Banknote, MapPin, RadioTower } from "lucide-react";
import { getHuntingTaskAmountText } from "@pages/home/commission/model";

/** 进行中狩猎（系统推荐委托）弹窗属性。 */
interface OngoingHuntingsProps {
  onClose: () => void;
  onDisable: () => void;
  tasks: HuntingTask[];
}

/** 狩猎快捷开启后的系统推荐委托列表，是狩猎品类的"进行中"弹窗。 */
export function OngoingHuntings({ onClose, onDisable, tasks }: OngoingHuntingsProps) {
  return (
    <Modal
      ariaLabel="狩猎推荐委托"
      icon={<RadioTower size={18} />}
      onClose={onClose}
      panelClassName="hunting-recommendation-panel mx-auto grid max-h-[min(74vh,620px)] max-w-[540px] gap-[12px] px-[14px] pb-[calc(16px+env(safe-area-inset-bottom))] pt-[16px]"
      title={
        <>
          <strong>系统推荐委托</strong>
          <span>{tasks.length} 个推荐任务</span>
        </>
      }
    >
      <div className="hunting-recommendation-list grid gap-[10px]">
        {tasks.map((task) => (
          <article className="flow-card compact hunting-recommendation-card grid gap-[8px] p-[12px]" key={task.id}>
            <div className="card-title flex items-center justify-between gap-[10px]">
              <div className="hunting-recommendation-card-copy">
                <strong>{task.title}</strong>
                <span>{task.publishTime || "平台同步"}</span>
              </div>
              <em>{task.status}</em>
            </div>
            <div className="meta-line flex flex-wrap items-center gap-[6px] text-[13px] leading-[1.45] text-[var(--h5-muted)]">
              <span>
                <MapPin size={13} />
                {task.destination || task.location}
              </span>
              <span>
                <Banknote size={13} />
                {getHuntingTaskAmountText(task)}
              </span>
            </div>
          </article>
        ))}
        {tasks.length === 0 ? (
          <article className="empty-state p-[14px] text-center">
            <strong>暂无推荐委托</strong>
            <span>保持开启后，系统会继续推送合适任务。</span>
          </article>
        ) : null}
      </div>
      <div className="sheet-actions grid gap-[8px]">
        <button
          className="warning-button inline-flex min-h-[38px] items-center justify-center gap-[5px] px-[10px] py-[8px]"
          onClick={onDisable}
          type="button"
        >
          关闭狩猎
        </button>
        <button
          className="primary-button button-inline-layout min-h-[38px] px-[10px] py-[8px] text-white"
          onClick={onClose}
          type="button"
        >
          继续开启
        </button>
      </div>
    </Modal>
  );
}
