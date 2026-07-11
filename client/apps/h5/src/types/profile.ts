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

/** Local H5 address-book item persisted before backend address APIs are available. */
export interface AddressBookItem {
  createdAt: string;
  draft: ProfileDraftState;
  id: string;
  isCurrent: boolean;
  updatedAt: string;
}

/** Props consumed by the shared address information form in edit and preview mode. */
export interface AddressInfoFormProps {
  areaOptions: string[];
  actionLabel?: string;
  draft: ProfileDraftState;
  emptyText?: string;
  fields: ProfileRequirementField[];
  isCurrent?: boolean;
  mode: AddressInfoFormMode;
  onChange?: (key: string, value: string) => void;
  onEdit?: () => void;
  onUse?: () => void;
  previewVariant?: AddressInfoPreviewVariant;
}

/** Props consumed by the post-registration profile form with required password setup. */
export interface RegistrationProfileCompletionProps {
  areaOptions: string[];
  birthday: string;
  draft: RegistrationProfileDraft;
  isSubmitting?: boolean;
  nickname: string;
  password: string;
  passwordConfirm: string;
  onChange: (key: string, value: string) => void;
  onBack: () => void;
  onBirthdayChange: (birthday: string) => void;
  onNicknameChange: (nickname: string) => void;
  onPasswordChange: (password: string) => void;
  onPasswordConfirmChange: (passwordConfirm: string) => void;
  onSubmit: () => void;
  roleLabel: string;
  template: RegistrationProfileTemplate;
}
