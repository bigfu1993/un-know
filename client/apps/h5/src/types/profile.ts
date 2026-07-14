export interface ProfileRequirementField {
  key: string;
  label: string;
  placeholder: string;
  kind?: "text" | "area";
  inputMode?: "text" | "tel" | "numeric";
}

export interface ProfileRequirementTemplate {
  title: string;
  description: string;
  fields: ProfileRequirementField[];
}

export interface ProfileRequirement extends ProfileRequirementTemplate {
  missingFields: ProfileRequirementField[];
}

export type ProfileDraftState = Record<string, string>;

export type RegistrationProfileField = ProfileRequirementField;
export type RegistrationProfileTemplate = ProfileRequirementTemplate;
export type RegistrationProfileDraft = ProfileDraftState;

export type AddressInfoFormMode = "edit" | "preview";
export type AddressInfoPreviewVariant = "list" | "card";

/** 后端地址接口上线前，H5 本地持久化的地址簿条目。 */
export interface AddressBookItem {
  createdAt: string;
  draft: ProfileDraftState;
  id: string;
  isCurrent: boolean;
  updatedAt: string;
}

/** 地址信息表单在编辑和预览模式下使用的属性。 */
export interface AddressInfoFormProps {
  areaOptions?: string[];
  actionLabel?: string;
  draft?: ProfileDraftState;
  emptyText?: string;
  fields: ProfileRequirementField[];
  item?: AddressBookItem;
  isCurrent?: boolean;
  mode?: AddressInfoFormMode;
  onChange?: (draft: ProfileDraftState, changedKey: string) => void;
  onDelete?: (item: AddressBookItem) => void;
  onEdit?: (item: AddressBookItem) => void;
  onUse?: (item: AddressBookItem) => void;
  previewVariant?: AddressInfoPreviewVariant;
}

