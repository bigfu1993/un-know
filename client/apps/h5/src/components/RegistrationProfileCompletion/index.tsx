import { AddressInfoForm } from "@components/AddressInfoForm";
import { parentChildInfoFields, parentRegistrationAddressFields } from "@shared/clientPageModel";
import { validateByKey } from "@tools/validation";

/** 进入 H5 前渲染注册后的昵称、地址和密码设置表单。 */
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
  role,
  roleLabel,
  template
}: RegistrationProfileCompletionProps) {
  const [isParentAddressVisible, setIsParentAddressVisible] = useState(false);
  const [isParentChildVisible, setIsParentChildVisible] = useState(false);
  const visibleProfileFields =
    role === "parent"
      ? [
          ...(isParentAddressVisible ? parentRegistrationAddressFields : []),
          ...(isParentChildVisible ? parentChildInfoFields : [])
        ]
      : template.fields;
  const nicknameValidation = validateByKey("nickname", nickname, { label: "昵称", required: true });
  const hasMissingProfileFields = visibleProfileFields.some((field) => !draft[field.key]?.trim());
  const isNicknameInvalid = !nicknameValidation.isValid;
  const isPasswordMissing = !password.trim();
  const isPasswordConfirmMissing = !passwordConfirm.trim();
  const isPasswordConfirmInvalid = Boolean(passwordConfirm.trim()) && password !== passwordConfirm;
  const hasInvalidProfileFields = visibleProfileFields.some(
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

  /** 必填昵称和选填地址格式通过本地校验后提交。 */
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

        {role === "parent" ? (
          <div className="parent-registration-shortcuts grid gap-[10px]">
            <div className="parent-registration-shortcut-row flex flex-wrap gap-[8px]">
              <button
                className="ghost-button inline-flex min-h-[32px] items-center justify-center gap-[5px] px-[10px] py-[7px] text-[#475466]"
                onClick={() => setIsParentAddressVisible((visible) => !visible)}
                type="button"
              >
                {isParentAddressVisible ? "收起地址信息" : "添加地址信息"}
              </button>
              <button
                className="ghost-button inline-flex min-h-[32px] items-center justify-center gap-[5px] px-[10px] py-[7px] text-[#475466]"
                onClick={() => setIsParentChildVisible((visible) => !visible)}
                type="button"
              >
                {isParentChildVisible ? "收起孩子信息" : "添加孩子信息"}
              </button>
            </div>

            {isParentAddressVisible ? (
              <AddressInfoForm
                areaOptions={areaOptions}
                draft={draft}
                fields={parentRegistrationAddressFields}
                mode="edit"
                onChange={onChange}
              />
            ) : null}

            {isParentChildVisible ? (
              <AddressInfoForm
                areaOptions={areaOptions}
                draft={draft}
                fields={parentChildInfoFields}
                mode="edit"
                onChange={onChange}
              />
            ) : null}
          </div>
        ) : (
          <AddressInfoForm
            areaOptions={areaOptions}
            draft={draft}
            fields={template.fields}
            mode="edit"
            onChange={onChange}
          />
        )}

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
        昵称和登录密码为必填；生日、地址和孩子信息可以先留空，后续可在设置页或业务流程中补充。
      </p>
    </form>
  );
}
