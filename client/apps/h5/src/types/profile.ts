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

export interface RegistrationProfileCompletionProps {
  areaOptions: string[];
  draft: RegistrationProfileDraft;
  onChange: (key: string, value: string) => void;
  onSkip: () => void;
  onSubmit: () => void;
  roleLabel: string;
  template: RegistrationProfileTemplate;
}
