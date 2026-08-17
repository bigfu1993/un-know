import "./index.less";
import { ArrowDownUp, CheckCircle2, GripVertical, Plus, RadioTower } from "lucide-react";

/** 创建默认下一站区域，保持表单始终有一项可编辑目的地。 */
function createDefaultStop(areaOptions: string[]): HuntingProjectStop {
  return {
    area: areaOptions[0] ?? "",
    customArea: "",
    etaEnd: "",
    etaStart: "",
    id: globalThis.crypto?.randomUUID?.() ?? `stop_${Date.now()}`,
    inputMode: "preset"
  };
}

/** 获取下一站用于展示和校验的区域名称。 */
function getStopAreaName(stop: HuntingProjectStop) {
  return stop.inputMode === "custom" ? stop.customArea.trim() : stop.area.trim();
}

/** 按拖拽或按钮移动后的下标重排下一站列表。 */
function moveStop(stops: HuntingProjectStop[], fromIndex: number, toIndex: number) {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= stops.length || toIndex >= stops.length) {
    return stops;
  }

  const nextStops = [...stops];
  const [movedStop] = nextStops.splice(fromIndex, 1);
  nextStops.splice(toIndex, 0, movedStop);
  return nextStops;
}

/** 狩猎快捷项目创建弹窗，提交后由根组件开启系统推荐。 */
export function HuntingProject({
  areaOptions,
  initialProject,
  onClose,
  onSubmit
}: HuntingProjectProps) {
  const [currentArea, setCurrentArea] = useState(initialProject?.currentArea ?? areaOptions[0] ?? "");
  const [nextStops, setNextStops] = useState<HuntingProjectStop[]>(() =>
    initialProject?.nextStops.length ? initialProject.nextStops : [createDefaultStop(areaOptions)]
  );
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const hasValidCurrentArea = Boolean(currentArea.trim());
  const hasValidStop = nextStops.some((stop) => Boolean(getStopAreaName(stop)));
  const canSubmit = hasValidCurrentArea && hasValidStop;

  /** 更新某一站的字段值。 */
  function handleStopChange(index: number, key: keyof HuntingProjectStop, value: string) {
    setNextStops((stops) =>
      stops.map((stop, stopIndex) => (stopIndex === index ? { ...stop, [key]: value } : stop))
    );
  }

  /** 追加下一站区域，支持多段动线匹配。 */
  function handleAddStop() {
    setNextStops((stops) => [...stops, createDefaultStop(areaOptions)]);
  }

  /** 删除下一站，至少保留一个输入入口。 */
  function handleRemoveStop(index: number) {
    setNextStops((stops) => (stops.length <= 1 ? stops : stops.filter((_, stopIndex) => stopIndex !== index)));
  }

  /** 提交狩猎项目，空白下一站会被过滤。 */
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }

    onSubmit({
      currentArea: currentArea.trim(),
      nextStops: nextStops
        .filter((stop) => getStopAreaName(stop))
        .map((stop) => ({
          ...stop,
          area: stop.area.trim(),
          customArea: stop.customArea.trim(),
          etaEnd: stop.etaEnd.trim(),
          etaStart: stop.etaStart.trim()
        }))
    });
  }

  return (
    <Modal
      ariaLabel="创建狩猎项目"
      icon={<RadioTower size={18} />}
      onClose={onClose}
      onSubmit={handleSubmit}
      panelClassName="hunting-project-panel mx-auto grid max-h-[78vh] max-w-[540px] gap-[12px] overflow-hidden px-[14px] pb-[calc(14px+env(safe-area-inset-bottom))] pt-[14px]"
      panelElement="form"
      title={
        <>
          <strong>创建狩猎项目</strong>
          <span>系统将按动线匹配推荐委托</span>
        </>
      }
    >
      <div className="hunting-project-body grid gap-[12px] overflow-auto pr-[2px]">
        <label className={`profile-field publish-field grid gap-[7px] ${hasValidCurrentArea ? "" : "missing"}`}>
          <span>目前所在区域</span>
          <input
            list="hunting-current-area-options"
            onChange={(event) => setCurrentArea(event.target.value)}
            placeholder="选择或输入目前所在区域"
            value={currentArea}
          />
          <datalist id="hunting-current-area-options">
            {areaOptions.map((area) => (
              <option key={area} value={area} />
            ))}
          </datalist>
        </label>

        <div className="hunting-stop-list grid gap-[10px]">
          <div className="card-title compact-title flex items-center justify-between gap-[10px]">
            <div className="hunting-stop-list-title-copy">
              <strong>下一站区域</strong>
              <span>可拖拽调整系统匹配顺序</span>
            </div>
            <button
              className="ghost-button inline-flex min-h-[32px] items-center justify-center gap-[5px] px-[9px] py-[6px] text-[#475466]"
              onClick={handleAddStop}
              type="button"
            >
              <Plus size={15} />
              添加
            </button>
          </div>

          {nextStops.map((stop, index) => {
            const areaListId = `hunting-stop-area-${stop.id}`;

            return (
              <article
                className="hunting-stop-card grid gap-[8px] p-[10px]"
                draggable
                key={stop.id}
                onDragOver={(event) => event.preventDefault()}
                onDragStart={() => setDraggingIndex(index)}
                onDrop={() => {
                  if (draggingIndex === null) {
                    return;
                  }
                  setNextStops((stops) => moveStop(stops, draggingIndex, index));
                  setDraggingIndex(null);
                }}
              >
                <div className="hunting-stop-head flex items-center justify-between gap-[8px]">
                    <span className="inline-flex items-center gap-[5px] text-[13px] font-bold text-[#475466]">
                      <GripVertical size={15} />
                      第 {index + 1} 站
                    </span>
                    <div className="inline-flex items-center gap-[6px]">
                      <button
                        aria-label="上移下一站"
                        className="icon-only grid h-[28px] w-[28px] place-items-center text-[#475466]"
                        disabled={index === 0}
                        onClick={() => setNextStops((stops) => moveStop(stops, index, index - 1))}
                        type="button"
                      >
                        <ArrowDownUp size={14} />
                      </button>
                      <button
                        className="ghost-button danger inline-flex min-h-[28px] items-center justify-center px-[8px] py-[5px]"
                        disabled={nextStops.length <= 1}
                        onClick={() => handleRemoveStop(index)}
                        type="button"
                      >
                        删除
                      </button>
                    </div>
                  </div>

                  <div className="segmented-control publish-segmented-field wrap flex gap-[8px]" aria-label="下一站区域录入方式">
                    <button
                      className={stop.inputMode === "preset" ? "active" : ""}
                      onClick={() => handleStopChange(index, "inputMode", "preset")}
                      type="button"
                    >
                      下拉选择
                    </button>
                    <button
                      className={stop.inputMode === "custom" ? "active" : ""}
                      onClick={() => handleStopChange(index, "inputMode", "custom")}
                      type="button"
                    >
                      自定义
                    </button>
                  </div>

                  {stop.inputMode === "preset" ? (
                    <label className={`profile-field publish-field grid gap-[7px] ${stop.area ? "" : "missing"}`}>
                      <span>区域</span>
                      <select onChange={(event) => handleStopChange(index, "area", event.target.value)} value={stop.area}>
                        {areaOptions.map((area) => (
                          <option key={area} value={area}>
                            {area}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <label className={`profile-field publish-field grid gap-[7px] ${stop.customArea ? "" : "missing"}`}>
                      <span>自定义区域</span>
                      <input
                        list={areaListId}
                        onChange={(event) => handleStopChange(index, "customArea", event.target.value)}
                        placeholder="请输入下一站区域"
                        value={stop.customArea}
                      />
                      <datalist id={areaListId}>
                        {areaOptions.map((area) => (
                          <option key={area} value={area} />
                        ))}
                      </datalist>
                    </label>
                  )}

                  <div className="hunting-stop-time grid grid-cols-2 gap-[8px]">
                    <label className="profile-field publish-field grid gap-[7px]">
                      <span>预计开始</span>
                      <input
                        onChange={(event) => handleStopChange(index, "etaStart", event.target.value)}
                        type="time"
                        value={stop.etaStart}
                      />
                    </label>
                    <label className="profile-field publish-field grid gap-[7px]">
                      <span>预计结束</span>
                      <input
                        onChange={(event) => handleStopChange(index, "etaEnd", event.target.value)}
                        type="time"
                        value={stop.etaEnd}
                      />
                    </label>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <div className="sheet-actions grid gap-[8px]">
          <button
            className="ghost-button inline-flex min-h-[38px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-[#475466]"
            onClick={onClose}
            type="button"
          >
            取消
          </button>
          <button
            className="primary-button inline-flex min-h-[38px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white disabled:text-[#748092]"
            disabled={!canSubmit}
            type="submit"
          >
            <CheckCircle2 size={16} />
            创建并开启
          </button>
        </div>
    </Modal>
  );
}
