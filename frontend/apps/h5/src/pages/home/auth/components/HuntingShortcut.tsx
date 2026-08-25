import { OngoingHuntings } from "../huntings";

/** 狩猎快捷入口，封装右下角按钮、创建项目弹窗和推荐委托弹窗。 */
export function HuntingShortcut({
  areaOptions,
  initialProject,
  isEnabled,
  isProjectOpen,
  isRecommendationOpen,
  onCloseProject,
  onCloseRecommendation,
  onDisable,
  onOpen,
  onSubmitProject,
  recommendedTasks
}: HuntingShortcutProps) {
  return (
    <>
      <button
        className={`quick-action-button quick-action-hunting hunting-shortcut grid h-[46px] w-[46px] place-items-center font-extrabold text-white ${
          isEnabled ? "active" : ""
        }`}
        onClick={onOpen}
        type="button"
        aria-expanded={isProjectOpen || isRecommendationOpen}
        aria-haspopup="dialog"
        aria-label={isEnabled ? "查看狩猎推荐委托" : "开启狩猎快捷开关"}
      >
        {isEnabled ? (
          <>
            <svg className="hunting-ecg-icon" aria-hidden="true" viewBox="0 0 30 22">
              <polyline points="1,12 7,12 10,5 14,18 18,8 21,12 29,12" />
            </svg>
            <span className="quick-action-badge">{recommendedTasks.length}</span>
          </>
        ) : (
          <Crosshair size={18} />
        )}
      </button>

      {isProjectOpen ? (
        <HuntingProject
          areaOptions={areaOptions}
          initialProject={initialProject}
          onClose={onCloseProject}
          onSubmit={onSubmitProject}
        />
      ) : null}

      {isRecommendationOpen ? (
        <OngoingHuntings onClose={onCloseRecommendation} onDisable={onDisable} tasks={recommendedTasks} />
      ) : null}
    </>
  );
}
