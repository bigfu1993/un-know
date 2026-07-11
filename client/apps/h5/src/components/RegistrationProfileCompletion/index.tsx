import { AddressInfoForm } from "../AddressInfoForm";
import { validateByKey } from "../../tools/validation";

/** Renders post-registration nickname, address, and password setup before entering H5. */
export function RegistrationProfileCompletion({
  areaOptions,
  birthday,
  draft,
  isSubmitting = false,
  nickname,
  password,
  passwordConfirm,
  onChange,
  onBack,
  onBirthdayChange,
  onNicknameChange,
  onPasswordChange,
  onPasswordConfirmChange,
  onSubmit,
  roleLabel,
  template
}: RegistrationProfileCompletionProps) {
  const nicknameValidation = validateByKey("nickname", nickname, { label: "昵称", required: true });
  const hasMissingProfileFields = template.fields.some((field) => !draft[field.key]?.trim());
  const isNicknameInvalid = !nicknameValidation.isValid;
  const isPasswordMissing = !password.trim();
  const isPasswordConfirmMissing = !passwordConfirm.trim();
  const isPasswordConfirmInvalid = Boolean(passwordConfirm.trim()) && password !== passwordConfirm;
  const hasInvalidProfileFields = template.fields.some(
    (field) => !validateByKey(field.key, draft[field.key] ?? "", { label: field.label }).isValid
  );
  const submitLabel = isSubmitting
    ? "进入中"
    : isNicknameInvalid
      ? "填写昵称并进入"
      : isPasswordMissing || isPasswordConfirmMissing || isPasswordConfirmInvalid
      ? "设置密码并进入"
      : hasInvalidProfileFields
        ? "修正资料并进入"
      : hasMissingProfileFields
        ? "留空资料并进入"
        : "确认并进入";

  /** Submits after required nickname and optional address-field formats pass local validation. */
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isNicknameInvalid || hasInvalidProfileFields) {
      return;
    }
    onSubmit();
  }

  return (
    <form
      className="login-card registration-profile-card grid w-full min-w-0 gap-[12px] p-[16px]"
      onSubmit={handleSubmit}
    >
      <div className="card-title flex min-w-0 items-center justify-start gap-[10px]">
        <BadgeCheck size={18} />
        <div className="min-w-0 flex-1">
          <strong>{template.title}</strong>
          <span>{roleLabel} · 进入前确认资料</span>
        </div>
      </div>

      <p className="login-tip m-0 text-[13px] leading-[1.5] text-[#657181]">{template.description}</p>

      <div className="registration-profile-fields grid gap-[10px]">
        <label className={`registration-profile-field grid gap-[7px] w-full min-w-0 font-bold ${isNicknameInvalid ? "missing" : ""}`}>
          <span>昵称（必填）</span>
          <input
            autoComplete="nickname"
            maxLength={20}
            onChange={(event) => onNicknameChange(event.target.value)}
            placeholder="请输入登录后展示的昵称"
            value={nickname}
          />
          {isNicknameInvalid ? <em>{nicknameValidation.message}</em> : null}
        </label>

        <label className="registration-profile-field grid gap-[7px] w-full min-w-0 font-bold">
          <span>生日（选填）</span>
          <input
            onChange={(event) => onBirthdayChange(event.target.value)}
            placeholder="请选择生日"
            type="date"
            value={birthday}
          />
        </label>

        <AddressInfoForm
          areaOptions={areaOptions}
          draft={draft}
          fields={template.fields}
          mode="edit"
          onChange={onChange}
        />

        <label
          className={`registration-profile-field grid gap-[7px] w-full min-w-0 font-bold ${
            isPasswordMissing ? "missing" : ""
          }`}
        >
          <span>登录密码（必填）</span>
          <input
            autoComplete="new-password"
            minLength={6}
            onChange={(event) => onPasswordChange(event.target.value)}
            placeholder="至少 6 位"
            type="password"
            value={password}
          />
        </label>

        <label
          className={`registration-profile-field grid gap-[7px] w-full min-w-0 font-bold ${
            isPasswordConfirmMissing || isPasswordConfirmInvalid ? "missing" : ""
          }`}
        >
          <span>重复密码（必填）</span>
          <input
            autoComplete="new-password"
            minLength={6}
            onChange={(event) => onPasswordConfirmChange(event.target.value)}
            placeholder="再次输入登录密码"
            type="password"
            value={passwordConfirm}
          />
        </label>
      </div>

      <div className="registration-profile-actions grid gap-[8px]">
        <button
          className="ghost-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-[#475466]"
          disabled={isSubmitting}
          onClick={onBack}
          type="button"
        >
          返回重选角色
        </button>
        <button
          className="primary-button inline-flex min-h-[34px] w-full items-center justify-center gap-[5px] px-[10px] py-[8px] text-white disabled:text-[#748092]"
          disabled={isSubmitting || isNicknameInvalid || hasInvalidProfileFields}
          type="submit"
        >
          <CheckCircle2 size={16} />
          {submitLabel}
        </button>
      </div>
      <p className="login-tip m-0 text-[13px] leading-[1.5] text-[#657181]">
        昵称和登录密码为必填；生日和地址字段可以先留空，后续可在设置页维护地址列表。
      </p>
    </form>
  );
}
