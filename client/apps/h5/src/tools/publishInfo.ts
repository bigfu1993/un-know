import type { PublishHuntingTaskRequest } from "@unknown/domain";
import type { AddressBookItem } from "@app-types/profile";

/** 本地发布草稿存储 key，用于保存未正式发布的信息。 */
const localPublishInfoStorageKey = "unknown_h5_publish_info_drafts_v1";

/** 发布信息类型。 */
export type PublishInfoType = "delegation" | "recycle" | "partTime" | "tutor";

/** 委托金额模式。 */
export type DelegationAmountMode = "input" | "negotiable";

/** 委托发布要求标签。 */
export const delegationRequirementTags = ["无损", "无拆", "准时", "尽快"];

/** 发布信息弹窗表单草稿。 */
export interface PublishInfoDraft {
  addressId: string;
  amount: string;
  amountMode: DelegationAmountMode;
  checkInMode: string;
  childId: string;
  delegationTime: string;
  depositAmount: string;
  depositRequired: "no" | "yes";
  description: string;
  partTimeWageMode: string;
  requirement: string;
  requirementTags: string[];
  signupFields: string;
  title: string;
  trialDuration: string;
  trialEnabled: string;
  tutorDateEnd: string;
  tutorDateStart: string;
  tutorSchoolTags: string[];
  tutorSubject: string;
  tutorTime: string;
  tutorWageMode: string;
  type: PublishInfoType;
}

/** 本地发布草稿记录，补充创建时间和发布状态。 */
export type LocalPublishInfoDraft = PublishInfoDraft & {
  createdAt: string;
  publishState: "draft" | "published";
};

/** 判断金额是否为大于 0 的数字。 */
export function isPositiveAmount(value: string) {
  const amount = Number(value.trim());

  return Number.isFinite(amount) && amount > 0;
}

/** 判断委托发布草稿是否选择协商金额。 */
export function isNegotiableAmount(draft: Pick<PublishInfoDraft, "amountMode">) {
  return draft.amountMode === "negotiable";
}

/** 判断当前发布类型是否可进入委托任务接口。 */
export function isHuntingTaskPublishType(type: PublishInfoType): type is "delegation" | "recycle" {
  return type === "delegation" || type === "recycle";
}

/** 获取委托发布截止时间展示文案。 */
export function getDelegationLatestTimeLabel(value: string) {
  const normalizedValue = value.trim();
  const quickOptionMatched = /^(\d+)min$/.exec(normalizedValue);

  if (quickOptionMatched) {
    return `发布后 ${quickOptionMatched[1]} 分钟内`;
  }

  if (/^\d{2}:\d{2}$/.test(normalizedValue)) {
    return `截止 ${normalizedValue}`;
  }

  return normalizedValue;
}

/** 获取发布委托使用的目的地展示文案。 */
export function getPublishDestinationLabel(addressId: string, addressItems: AddressBookItem[]) {
  const matchedAddress = addressItems.find((item) => item.id === addressId);
  const { buildingFloor, campusArea, deliveryAddress } = matchedAddress?.draft ?? {};
  const location = [campusArea, buildingFloor, deliveryAddress].filter(Boolean).join(" · ");

  return location || "目的地待补充";
}

/** 获取委托要求标签和自定义要求合并后的展示文案。 */
export function getDelegationRequirementLabel(requirementTags: string[], customRequirement = "") {
  const normalizedCustomRequirement = customRequirement.trim();
  const requirementItems = [
    ...requirementTags,
    ...(normalizedCustomRequirement ? [normalizedCustomRequirement] : [])
  ];

  return requirementItems.length > 0 ? requirementItems.join("、") : "无特殊要求";
}

/** 根据发布弹窗草稿构建委托任务发布接口参数。 */
export function buildPublishHuntingTaskRequest(
  draft: PublishInfoDraft,
  addressItems: AddressBookItem[]
): PublishHuntingTaskRequest {
  if (!isHuntingTaskPublishType(draft.type)) {
    throw new Error("当前仅支持发布委托和回收");
  }

  return {
    amount: isNegotiableAmount(draft) ? null : Number(draft.amount.trim()),
    amountNegotiable: isNegotiableAmount(draft),
    depositAmount: draft.depositRequired === "yes" ? Number(draft.depositAmount.trim()) : null,
    depositRequired: draft.depositRequired === "yes",
    description: draft.description.trim(),
    destination: getPublishDestinationLabel(draft.addressId, addressItems),
    latestTime: getDelegationLatestTimeLabel(draft.delegationTime),
    location: getPublishDestinationLabel(draft.addressId, addressItems),
    requirement: getDelegationRequirementLabel(draft.requirementTags, draft.requirement),
    requirementTags: draft.requirementTags,
    title: draft.title.trim(),
    type: draft.type
  };
}

/** 容错读取本地发布草稿。 */
export function getLocalPublishInfoDrafts(): LocalPublishInfoDraft[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const stored = window.localStorage.getItem(localPublishInfoStorageKey);
    return stored ? (JSON.parse(stored) as LocalPublishInfoDraft[]) : [];
  } catch {
    return [];
  }
}

/** 保存发布信息草稿。 */
export function saveLocalPublishInfoDraft(draft: PublishInfoDraft, publishState: LocalPublishInfoDraft["publishState"]) {
  if (typeof window === "undefined") {
    return [];
  }

  const drafts = getLocalPublishInfoDrafts();
  const nextDrafts: LocalPublishInfoDraft[] = [
    {
      ...draft,
      createdAt: new Date().toISOString(),
      publishState
    },
    ...drafts
  ];

  window.localStorage.setItem(localPublishInfoStorageKey, JSON.stringify(nextDrafts));
  return nextDrafts;
}
