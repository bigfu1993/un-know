/**
 * 登录/注册入口卡片，默认展示登录表单，注册通过底部文字入口切换，不用双层 tab 抢视觉权重。
 * "忘记密码"和"还没有账号"都是脱离当前表单主流程的次要跳转，收在同一行左右分布。
 */
export function LoginRegisterCard({ loginForm, onForgotPassword, registerForm }: LoginRegisterCardProps) {
  const [authMode, setAuthMode] = useState<AuthMode>("login");

  return (
    <section className="login-card login-register-card grid w-full min-w-0 gap-[14px] p-[16px]">
      {authMode === "login" ? loginForm : registerForm}

      <div className="login-secondary-actions">
        {authMode === "login" ? (
          <button className="text-link-button muted" onClick={onForgotPassword} type="button">
            忘记密码
          </button>
        ) : (
          <span />
        )}

        <p className="m-0">
          {authMode === "login" ? (
            <>
              还没有账号？
              <button className="text-link-button" onClick={() => setAuthMode("register")} type="button">
                立即注册
              </button>
            </>
          ) : (
            <>
              已有账号？
              <button className="text-link-button" onClick={() => setAuthMode("login")} type="button">
                直接登录
              </button>
            </>
          )}
        </p>
      </div>
    </section>
  );
}
