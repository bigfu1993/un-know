/** 未登录时的根路由：只暴露登录页，其它路径统一重定向到登录页。 */
export function UnauthenticatedScreen({ onLoginSuccess }: { onLoginSuccess: (session: LoginResponse) => void }) {
  return (
    <Routes>
      <Route path="/login" element={<Login onLoginSuccess={onLoginSuccess} />} />
      <Route path="*" element={<Navigate replace to="/login" />} />
    </Routes>
  );
}

/** 真实接口连接失败时的整屏替代页，提供退出重登入口。 */
export function DataErrorScreen({ error, onLogout }: { error: unknown; onLogout: () => void }) {
  return (
    <main className="login-shell mx-auto grid min-h-screen max-w-[540px] content-center gap-[14px] px-[14px] py-[28px] text-[#17212b]">
      <section className="login-card grid gap-[14px] p-[16px]">
        <div className="card-title flex items-center justify-between gap-[10px] min-w-0 ">
          <AlertCircle size={18} />
          <strong>真实接口连接失败</strong>
        </div>
        <p className="notice mt-[12px] p-[12px] text-[#61420d] danger">
          {error instanceof Error ? error.message : "请检查后端服务和云数据库连接。"}
        </p>
        <button
          className="primary-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white disabled:text-[#748092] w-full full"
          onClick={onLogout}
          type="button"
        >
          <LogOut size={16} />
          退出并重新登录
        </button>
      </section>
    </main>
  );
}

/** 首屏基础数据（角色资料 + 地址簿）加载中的整屏替代页。 */
export function InitialLoadingScreen() {
  return (
    <main className="login-shell mx-auto grid min-h-screen max-w-[540px] content-center gap-[14px] px-[14px] py-[28px] text-[#17212b]">
      <section className="login-card grid gap-[14px] p-[16px]">
        <div className="card-title flex items-center justify-between gap-[10px] min-w-0 ">
          <ShieldCheck size={18} />
          <strong>正在加载云端真实数据</strong>
        </div>
        <p className="login-tip m-0 text-[13px] leading-[1.5] text-[#657181]">
          正在读取 PostgreSQL 中的首页、商品、订单、钱包和工作台数据。
        </p>
      </section>
    </main>
  );
}
