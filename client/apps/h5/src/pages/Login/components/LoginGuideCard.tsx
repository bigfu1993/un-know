/** 登录页顶部引导卡片，说明当前认证方式和注册后的必要步骤。 */
export function LoginGuideCard({ defaultCode }: LoginGuideCardProps) {
  return (
    <section className="login-card grid gap-[14px] p-[16px]">
      <div className="card-title flex min-w-0 items-center justify-start gap-[10px]">
        <ShieldCheck size={18} />
        <div className="min-w-0 flex-1">
          <strong>佚名客户端</strong>
          <span>验证码或密码登录，本地验证码 {defaultCode}</span>
        </div>
      </div>
      <p className="login-tip m-0 text-[13px] leading-[1.5] text-[#657181]">
        使用手机号登录；注册完成后需要选择角色并设置密码，随后进入对应客户端。
      </p>
    </section>
  );
}
