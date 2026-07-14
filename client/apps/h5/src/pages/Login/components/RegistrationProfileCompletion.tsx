import { AddressInfoForm } from "@components/AddressInfoForm";
import { addressInfoFields, merchantRegistrationBusinessFields, parentChildInfoFields } from "@shared/clientPageModel";
import { getFilledFieldCount, hasInvalidFields, validateByKey } from "@tools/validation";

/** 注册引导内的资料与密码设置表单，只负责展示、字段切换和字段级交互。 */
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
  roleLabel
}: RegistrationProfileCompletionProps) {
  const [isAddressVisible, setIsAddressVisible] = useState(false);
  const [isBusinessVisible, setIsBusinessVisible] = useState(false);
  const [isChildVisible, setIsChildVisible] = useState(false);
  const visibleProfileFields = [
    ...(isAddressVisible ? addressInfoFields : []),
    ...(role === "parent" && isChildVisible ? parentChildInfoFields : []),
    ...(role === "merchant" && isBusinessVisible ? merchantRegistrationBusinessFields : [])
  ];
  const nicknameValidation = validateByKey("nickname", nickname, { label: "昵称", required: true });
  const hasMissingProfileFields = getFilledFieldCount(visibleProfileFields, draft) < visibleProfileFields.length;
  const isNicknameInvalid = !nicknameValidation.isValid;
  const isPasswordMissing = !password.trim();
  const isPasswordConfirmMissing = !passwordConfirm.trim();
  const isPasswordConfirmInvalid = Boolean(passwordConfirm.trim()) && password !== passwordConfirm;
  const hasInvalidProfileFields = hasInvalidFields(visibleProfileFields, draft);
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
    <form className="registration-profile-form grid w-full min-w-0 gap-[12px]" onSubmit={handleSubmit}>
      <p className="login-tip m-0 text-[13px] leading-[1.5] text-[#657181]">
        {roleLabel}资料可先补充必要信息；昵称和登录密码必须设置后才能进入。
      </p>
      <div className="registration-profile-fields grid gap-[10px]">
        <label
          className={`registration-profile-field grid gap-[7px] w-full min-w-0 font-bold ${
            isNicknameInvalid ? "missing" : ""
          }`}
        >
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

        <div className="registration-profile-shortcuts grid gap-[10px]">
          <div className="registration-profile-shortcut-row flex flex-wrap gap-[8px]">
            <button
              className="ghost-button inline-flex min-h-[32px] items-center justify-center gap-[5px] px-[10px] py-[7px] text-[#475466]"
              onClick={() => setIsAddressVisible((visible) => !visible)}
              type="button"
            >
              <Plus size={15} />
              {isAddressVisible ? "收起地址" : "添加地址"}
            </button>
            {role === "parent" ? (
              <button
                className="ghost-button inline-flex min-h-[32px] items-center justify-center gap-[5px] px-[10px] py-[7px] text-[#475466]"
                onClick={() => setIsChildVisible((visible) => !visible)}
                type="button"
              >
                <Plus size={15} />
                {isChildVisible ? "收起孩子" : "添加孩子"}
              </button>
            ) : null}
            {role === "merchant" ? (
              <button
                className="ghost-button inline-flex min-h-[32px] items-center justify-center gap-[5px] px-[10px] py-[7px] text-[#475466]"
                onClick={() => setIsBusinessVisible((visible) => !visible)}
                type="button"
              >
                <Plus size={15} />
                {isBusinessVisible ? "收起工商信息" : "添加工商信息"}
              </button>
            ) : null}
          </div>

          {isAddressVisible ? (
            <AddressInfoForm
              areaOptions={areaOptions}
              draft={draft}
              fields={addressInfoFields}
              onChange={(nextDraft, changedKey) => onChange(changedKey, nextDraft[changedKey] ?? "")}
            />
          ) : null}

          {role === "parent" && isChildVisible ? (
            <AddressInfoForm
              areaOptions={areaOptions}
              draft={draft}
              fields={parentChildInfoFields}
              onChange={(nextDraft, changedKey) => onChange(changedKey, nextDraft[changedKey] ?? "")}
            />
          ) : null}

          {role === "merchant" && isBusinessVisible ? (
            <AddressInfoForm
              areaOptions={areaOptions}
              draft={draft}
              fields={merchantRegistrationBusinessFields}
              onChange={(nextDraft, changedKey) => onChange(changedKey, nextDraft[changedKey] ?? "")}
            />
          ) : null}
        </div>

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
        昵称和登录密码为必填；生日、地址、孩子和工商信息可以先留空，后续可在设置页或业务流程中补充。
      </p>
    </form>
  );
}
