import { LoginForm } from "./LoginForm";
import { RegisterForm } from "./RegisterForm";

/** 登录/注册入口卡片，只负责切换登录与注册两个功能模块。 */
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
  return (
    <section className="login-card login-register-card grid w-full min-w-0 gap-[14px] p-[16px]">
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
        <LoginForm
          code={code}
          defaultCode={defaultCode}
          isAuthPending={isAuthPending}
          loginCredentialMode={loginCredentialMode}
          password={password}
          onCodeChange={onCodeChange}
          onFillDefaultCode={onFillDefaultCode}
          onForgotPassword={onForgotPassword}
          onLoginCredentialModeChange={onLoginCredentialModeChange}
          onPasswordChange={onPasswordChange}
          onPhoneChange={onPhoneChange}
          onSubmit={onSubmit}
          phone={phone}
        />
      ) : (
        <RegisterForm
          code={code}
          defaultCode={defaultCode}
          invitationCode={invitationCode}
          isAuthPending={isAuthPending}
          onCodeChange={onCodeChange}
          onFillDefaultCode={onFillDefaultCode}
          onInvitationCodeChange={onInvitationCodeChange}
          onPhoneChange={onPhoneChange}
          onSubmit={onSubmit}
          phone={phone}
        />
      )}
    </section>
  );
}
