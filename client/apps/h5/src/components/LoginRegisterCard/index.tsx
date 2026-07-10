export function LoginRegisterCard({
  authMode,
  code,
  isAuthPending,
  loginRole,
  phone,
  roles,
  onAuthModeChange,
  onCodeChange,
  onFillDefaultCode,
  onPhoneChange,
  onRoleChange,
  onSubmit
}: LoginRegisterCardProps) {
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

      {authMode === "register" ? (
        <div className="login-role-tabs grid min-w-0 gap-[8px]" aria-label="选择注册身份">
          {roles.map((item) => (
            <button
              className={loginRole === item ? "active" : ""}
              key={item}
              onClick={() => onRoleChange(item)}
              type="button"
            >
              {roleLabels[item]}
            </button>
          ))}
        </div>
      ) : null}

      <label className="login-field grid min-w-0 gap-[7px]">
        <span>手机号</span>
        <div>
          <Smartphone size={18} />
          <input
            inputMode="numeric"
            maxLength={11}
            onChange={(event) => onPhoneChange(event.target.value.replace(/\D/g, ""))}
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
            placeholder="本地验证码 123456"
            value={code}
          />
          <button onClick={onFillDefaultCode} type="button">
            填入
          </button>
        </div>
      </label>

      <p className="login-tip m-0 text-[13px] leading-[1.5] text-[#657181]">
        本地联调验证码固定为 123456；登录成功后 token 会写入本地存储，后续请求自动携带。
      </p>

      <p className="login-tip m-0 text-[13px] leading-[1.5] text-[#657181]">
        {authMode === "register"
          ? "注册成功后会自动登录；学生和商户身份不能用同一手机号同时注册。"
          : "未注册手机号需要先切换到注册入口完成开户。"}
      </p>

      <button
        aria-label={
          isAuthPending
            ? authMode === "register"
              ? "注册中"
              : "登录中"
            : authMode === "register"
              ? "注册并补充资料"
              : "登录并进入"
        }
        className={`primary-button auth-submit-button full inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white disabled:text-[#748092] ${authMode === "register" ? "register-mode" : ""}`}
        disabled={isAuthPending}
        type="submit"
      >
        <ShieldCheck size={16} />
        {isAuthPending
          ? authMode === "register"
            ? "注册中"
            : "登录中"
          : authMode === "register"
            ? "注册并补充资料"
            : "登录并进入"}
      </button>
    </form>
  );
}
