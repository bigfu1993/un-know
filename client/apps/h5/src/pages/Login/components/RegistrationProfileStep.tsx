/** 注册角色选择后的资料补充步骤，负责装配通用资料补充组件。 */
export function RegistrationProfileStep({
  birthday,
  draft,
  isSubmitting,
  nickname,
  password,
  passwordConfirm,
  role,
  template,
  onBack,
  onBirthdayChange,
  onChange,
  onNicknameChange,
  onPasswordChange,
  onPasswordConfirmChange,
  onSubmit
}: RegistrationProfileStepProps) {
  return (
    <RegistrationProfileCompletion
      areaOptions={campusAreaOptions}
      birthday={birthday}
      draft={draft}
      isSubmitting={isSubmitting}
      nickname={nickname}
      password={password}
      passwordConfirm={passwordConfirm}
      onChange={onChange}
      onBack={onBack}
      onBirthdayChange={onBirthdayChange}
      onNicknameChange={onNicknameChange}
      onPasswordChange={onPasswordChange}
      onPasswordConfirmChange={onPasswordConfirmChange}
      onSubmit={onSubmit}
      role={role}
      roleLabel={roleLabels[role]}
      template={template}
    />
  );
}
