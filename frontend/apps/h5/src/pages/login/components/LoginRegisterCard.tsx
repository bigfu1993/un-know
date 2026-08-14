/** 登录/注册入口卡片，只负责切换两个表单插槽。 */
export function LoginRegisterCard({ loginForm, registerForm }: LoginRegisterCardProps) {
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

      {authMode === "login" ? loginForm : registerForm}
    </section>
  );
}
