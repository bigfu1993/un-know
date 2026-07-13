import { normalizeByKey } from "@tools/validation";

/** 渲染登录/注册共用表单，并将认证动作交给登录页面处理。 */
export function LoginRegisterCard({
  authMode,
  code,
  defaultCode,
  invitationCode,
  isAuthPending,
  loginCredentialMode,
  password,
  phone,
  onAuthModeChange,
  onCodeChange,
  onFillDefaultCode,
  onForgotPassword,
  onInvitationCodeChange,
  onLoginCredentialModeChange,
  onPasswordChange,
  onPhoneChange,
  onSubmit
}: LoginRegisterCardProps) {
  const shouldShowCodeField = authMode === "register" || loginCredentialMode === "code";
  const shouldShowPasswordField = authMode === "login" && loginCredentialMode === "password";
  const submitLabel = isAuthPending
    ? authMode === "register"
      ? "注册中"
      : "登录中"
    : authMode === "register"
      ? "注册"
      : loginCredentialMode === "password"
        ? "密码登录"
        : "验证码登录";

  return (
    <form className="login-card login-register-card grid w-full min-w-0 gap-[14px] p-[16px]" onSubmit={onSubmit}>
      <div className="login-mode-tabs flex min-w-0 gap-[8px] p-[4px]" aria-label="选择登录或注册">
        <button
          className={authMode === "login" ? "active" : ""}
          onClick={() => onAuthModeChange("login")}
          type="button"
        >
          登录
        </button>
        <button
          className={authMode === "register" ? "active" : ""}
          onClick={() => onAuthModeChange("register")}
          type="button"
        >
          注册
        </button>
      </div>

      {authMode === "login" ? (
        <div className="login-method-tabs flex min-w-0 gap-[8px] p-[4px]" aria-label="选择登录方式">
          <button
            className={loginCredentialMode === "code" ? "active" : ""}
            onClick={() => onLoginCredentialModeChange("code")}
            type="button"
          >
            验证码登录
          </button>
          <button
            className={loginCredentialMode === "password" ? "active" : ""}
            onClick={() => onLoginCredentialModeChange("password")}
            type="button"
          >
            密码登录
          </button>
        </div>
      ) : null}

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

      {shouldShowCodeField ? (
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
      ) : null}

      {authMode === "register" ? (
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
      ) : null}

      {shouldShowPasswordField ? (
        <label className="login-field grid min-w-0 gap-[7px]">
          <span>密码</span>
          <div>
            <KeyRound size={18} />
            <input
              autoComplete="current-password"
              onChange={(event) => onPasswordChange(event.target.value)}
              placeholder="请输入登录密码"
              type="password"
              value={password}
            />
          </div>
        </label>
      ) : null}

      <p className="login-tip m-0 text-[13px] leading-[1.5] text-[#657181]">
        {authMode === "login" && loginCredentialMode === "password"
          ? "密码会先在本地校验，测试环境继续使用现有登录接口进入。"
          : `本地联调验证码固定为 ${defaultCode}；登录成功后 token 会写入本地存储，后续请求自动携带。`}
      </p>

      <p className="login-tip m-0 text-[13px] leading-[1.5] text-[#657181]">
        {authMode === "register"
          ? "注册成功后需要先选择角色，再补充基础信息后进入。"
          : loginCredentialMode === "password"
            ? "未设置密码时可切换验证码登录，或注册后在补充页设置密码。"
            : "未注册手机号需要先切换到注册入口完成开户。"}
      </p>

      {authMode === "login" ? (
        <button className="text-link-button justify-self-end" onClick={onForgotPassword} type="button">
          忘记密码？
        </button>
      ) : null}

      <button
        aria-label={submitLabel}
        className={`primary-button auth-submit-button full inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white disabled:text-[#748092] ${authMode === "register" ? "register-mode" : ""}`}
        disabled={isAuthPending}
        type="submit"
      >
        <ShieldCheck size={16} />
        {submitLabel}
      </button>
    </form>
  );
}
