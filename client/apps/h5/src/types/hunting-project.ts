export type HuntingAreaInputMode = "preset" | "custom";

/** 狩猎项目下一站区域配置。 */
export interface HuntingProjectStop {
  area: string;
  customArea: string;
  etaEnd: string;
  etaStart: string;
  id: string;
  inputMode: HuntingAreaInputMode;
}

/** 狩猎项目提交前的表单草稿。 */
export interface HuntingProjectDraft {
  currentArea: string;
  nextStops: HuntingProjectStop[];
}

/** 狩猎快捷开启后创建的本地项目。 */
export interface HuntingProject extends HuntingProjectDraft {
  createdAt: string;
  id: string;
  matchedTaskIds: string[];
  status: "matching" | "closed";
}

/** 狩猎项目表单弹窗属性。 */
export interface HuntingProjectDialogProps {
  areaOptions: string[];
  initialProject?: HuntingProject | null;
  onClose: () => void;
  onSubmit: (draft: HuntingProjectDraft) => void;
}
