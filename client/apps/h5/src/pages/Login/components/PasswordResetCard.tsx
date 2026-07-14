import { normalizeByKey } from "@tools/validation";

/** 本地重置密码面板，第一阶段不接入真实短信发送。 */
export function PasswordResetCard({
  code,
  defaultCode,
  password,
  passwordConfirm,
  phone,
  onBack,
  onCodeChange,
  onFillDefaultCode,
  onPasswordChange,
  onPasswordConfirmChange,
  onPhoneChange,
  onSubmit
}: PasswordResetCardProps) {
  return (
    <form className="login-card password-reset-card grid w-full min-w-0 gap-[14px] p-[16px]" onSubmit={onSubmit}>
      <div className="card-title flex min-w-0 items-center justify-start gap-[10px]">
        <ShieldCheck size={18} />
        <div className="min-w-0 flex-1">
          <strong>重置密码</strong>
          <span>通过手机号校验后设置新密码。</span>
        </div>
      </div>

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
        <span>新密码</span>
        <div>
          <ShieldCheck size={18} />
          <input
            autoComplete="new-password"
            onChange={(event) => onPasswordChange(event.target.value)}
            placeholder="至少 6 位"
            type="password"
            value={password}
          />
        </div>
      </label>

      <label className="login-field grid min-w-0 gap-[7px]">
        <span>确认密码</span>
        <div>
          <ShieldCheck size={18} />
          <input
            autoComplete="new-password"
            onChange={(event) => onPasswordConfirmChange(event.target.value)}
            placeholder="再次输入新密码"
            type="password"
            value={passwordConfirm}
          />
        </div>
      </label>

      <p className="login-tip m-0 text-[13px] leading-[1.5] text-[#657181]">
        短信发送暂未接入，本地联调验证码固定为 {defaultCode}。
      </p>

      <div className="password-reset-actions grid gap-[8px]">
        <button
          className="ghost-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-[#475466]"
          onClick={onBack}
          type="button"
        >
          返回登录
        </button>
        <button
          className="primary-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white"
          type="submit"
        >
          <CheckCircle2 size={16} />
          确认重置
        </button>
      </div>
    </form>
  );
}
