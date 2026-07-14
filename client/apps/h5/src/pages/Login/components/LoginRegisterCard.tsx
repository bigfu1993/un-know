import { LoginForm } from "./LoginForm";
import { RegisterForm } from "./RegisterForm";

/** 登录/注册入口卡片，只负责切换两个独立业务表单并向页面层回传最终业务结果。 */
export function LoginRegisterCard({
  passwordResetResult,
  onAuthenticated,
  onForgotPassword,
  onRegistered
}: LoginRegisterCardProps) {
  const [authMode, setAuthMode] = useState<AuthMode>("login");

  return (
    <section className="login-card login-register-card grid w-full min-w-0 gap-[14px] p-[16px]">
      <div className="login-mode-tabs flex min-w-0 gap-[8px] p-[4px]" aria-label="选择登录或注册">
        <button className={authMode === "login" ? "active" : ""} onClick={() => setAuthMode("login")} type="button">
          登录
        </button>
        <button
          className={authMode === "register" ? "active" : ""}
          onClick={() => setAuthMode("register")}
          type="button"
        >
          注册
        </button>
      </div>

      {authMode === "login" ? (
        <LoginForm
          passwordResetResult={passwordResetResult}
          onAuthenticated={onAuthenticated}
          onForgotPassword={onForgotPassword}
        />
      ) : (
        <RegisterForm onRegistered={onRegistered} />
      )}
    </section>
  );
}
