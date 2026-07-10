/** Settings route for account, binding, address, protocol, version, and feedback entries. */
export function SettingsView({ role, onBack }: { role: Role; onBack: () => void }) {
  const bindingText =
    role === "student"
      ? "学生认证、家教资质、宿舍楼栋楼层"
      : role === "merchant"
        ? "工商信息、门店信息、员工子账号"
        : "孩子信息、多学科选择、收货地址";

  return (
    <section className="page-view grid gap-[12px]">
      <header className="page-header grid items-center gap-[10px] p-[12px]">
        <button
          className="back-button grid h-[38px] w-[38px] place-items-center text-[#17212b]"
          onClick={onBack}
          type="button"
          aria-label="返回"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <span>账户与绑定信息</span>
          <strong>设置</strong>
        </div>
      </header>

      <SectionHeader countText="设置" eyebrow="账户、绑定、地址、协议、建议" title="设置项目" />
      <div className="card-list grid gap-[10px]">
        {[
          ["账户信息", "手机号、角色身份、账号状态"],
          ["绑定信息", bindingText],
          ["收货地址", role === "parent" ? "家长商品固定快递配送地址" : "校内位置块和自定义位置"],
          ["平台协议", "用户协议、隐私政策、交易规则"],
          ["版本&更新", clientPublishPlatformLabels.h5],
          ["建议", "点击打开文本框提交建议"]
        ].map(([title, detail]) => (
          <article className="flow-card p-[14px] compact" key={title}>
            <div className="card-title flex items-center justify-between gap-[10px] min-w-0">
              <Settings size={18} />
              <div>
                <strong>{title}</strong>
                <span>{detail}</span>
              </div>
              <ChevronRight size={16} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
