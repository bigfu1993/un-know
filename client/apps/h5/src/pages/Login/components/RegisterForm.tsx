import { normalizeByKey } from "@tools/validation";

/** 注册表单，负责手机号、验证码和选填邀请码输入。 */
export function RegisterForm({
  code,
  defaultCode,
  invitationCode,
  isAuthPending,
  phone,
  onCodeChange,
  onFillDefaultCode,
  onInvitationCodeChange,
  onPhoneChange,
  onSubmit
}: RegisterFormProps) {
  const submitLabel = isAuthPending ? "注册中" : "注册";

  return (
    <form className="grid w-full min-w-0 gap-[14px]" onSubmit={onSubmit}>
      <label className="login-field grid min-w-0 gap-[7px]">
        <span>手机号</span>
        <div>
          <Smartphone size={18} />
          <input
            inputMode="numeric"
            maxLength={11}
            onChange={(event) => onPhoneChange(normalizeByKey("phone", event.target.value))}
            placeholder="请输入手机号"
            value={phone}
          />
        </div>
      </label>

      <label className="login-field grid min-w-0 gap-[7px]">
        <span>验证码</span>
        <div>
          <KeyRound size={18} />
          <input
            inputMode="numeric"
            maxLength={6}
            onChange={(event) => onCodeChange(event.target.value.replace(/\D/g, ""))}
            placeholder={`本地验证码 ${defaultCode}`}
            value={code}
          />
          <button onClick={onFillDefaultCode} type="button">
            填入
          </button>
        </div>
      </label>

      <label className="login-field grid min-w-0 gap-[7px]">
        <span>邀请码（选填）</span>
        <div>
          <KeyRound size={18} />
          <input
            autoCapitalize="characters"
            maxLength={20}
            onChange={(event) => onInvitationCodeChange(event.target.value.trim().toUpperCase())}
            placeholder="请输入邀请码"
            value={invitationCode}
          />
        </div>
      </label>

      <p className="login-tip m-0 text-[13px] leading-[1.5] text-[#657181]">
        本地联调验证码固定为 {defaultCode}；登录成功后 token 会写入本地存储，后续请求自动携带。
      </p>

      <p className="login-tip m-0 text-[13px] leading-[1.5] text-[#657181]">
        注册成功后需要先选择角色，再补充基础信息后进入。
      </p>

      <button
        aria-label={submitLabel}
        className="primary-button auth-submit-button register-mode full inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white disabled:text-[#748092]"
        disabled={isAuthPending}
        type="submit"
      >
        <ShieldCheck size={16} />
        {submitLabel}
      </button>
    </form>
  );
}
