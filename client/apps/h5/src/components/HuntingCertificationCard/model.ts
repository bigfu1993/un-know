/** 狩猎资格认证状态。 */
export type HuntingCertificationStatus = "pending" | "reviewing" | "normal" | "frozen";

/** 狩猎认证卡片展示模式：entry 为认证入口，status 为审核态，simple 为认证通过后的简洁状态。 */
export type HuntingCertificationCardMode = "entry" | "status" | "simple";

/** 狩猎认证卡片展示数据。 */
export interface HuntingCertificationCardData {
  certificationStatus: HuntingCertificationStatus;
}

/** 狩猎认证状态中文文案。 */
export const huntingCertificationStatusLabels: Record<HuntingCertificationStatus, string> = {
  pending: "待认证",
  reviewing: "认证中",
  normal: "正常",
  frozen: "冻结"
};

/** 从本地资料草稿生成狩猎认证状态，等待后端认证接口接入后替换数据源。 */
export function getHuntingCertificationDataFromDraft(profileDraft: ProfileDraftState): HuntingCertificationCardData {
  const rawStatus = profileDraft.huntingCertificationStatus as HuntingCertificationStatus | undefined;
  const certificationStatus =
    rawStatus && rawStatus in huntingCertificationStatusLabels ? rawStatus : "pending";

  return {
    certificationStatus
  };
}

/** 根据认证状态选择狩猎认证卡片模式。 */
export function getHuntingCertificationCardMode(certificationStatus: HuntingCertificationStatus) {
  if (certificationStatus === "pending") {
    return "entry";
  }
  if (certificationStatus !== "normal") {
    return "status";
  }
  return "simple";
}
