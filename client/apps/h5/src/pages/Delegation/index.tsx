/** Delegation/hunting page: owns online state; App provides admission validation. */
export function Delegation({
  huntingSummary,
  huntingTasks,
  onRequestOnline
}: {
  huntingSummary: HuntingSummary;
  huntingTasks: HuntingTask[];
  onRequestOnline: () => boolean;
}) {
  const [isOnline, setIsOnline] = useState(false);

  function handleToggleOnline() {
    if (!isOnline && !onRequestOnline()) {
      return;
    }
    setIsOnline((value) => !value);
  }

  return (
    <section className="module-stack grid gap-[10px]">
      <SectionHeader
        countText={isOnline ? "狩猎中" : "未上线"}
        eyebrow="发布方为委托，服务方为狩猎"
        title="委托/狩猎"
      />

      <article className="flow-card p-[14px] verification-card">
        <div className="card-title flex items-center justify-between gap-[10px] min-w-0">
          <ShieldCheck size={18} />
          <div>
            <strong>狩猎准入</strong>
            <span>人工审核身份证照片 + 学信网截图，押金从钱包处理</span>
          </div>
        </div>
        <div className="metric-grid grid gap-[8px]">
          <Metric label="学生认证" value={huntingSummary.studentCertification} />
          <Metric label="二次验证" value={huntingSummary.secondVerification} />
          <Metric label="狩猎押金" value={huntingSummary.depositText} />
          <Metric label="信用分" value={huntingSummary.creditText} />
        </div>
        <div className="product-actions mt-[12px] flex flex-wrap items-center justify-between gap-[10px]">
          <span>不选择狩猎时间默认次日 0 点下线，允许跨天。</span>
          <button
            className={
              isOnline
                ? "warning-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-[#b4233a]"
                : "primary-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white disabled:text-[#748092]"
            }
            onClick={handleToggleOnline}
            type="button"
          >
            <Crosshair size={15} />
            {isOnline ? "下线狩猎" : "上线狩猎"}
          </button>
        </div>
      </article>

      <div className="split-actions grid gap-[8px]">
        <article className="flow-card p-[14px] compact">
          <div className="card-title flex items-center justify-between gap-[10px] min-w-0">
            <Plus size={18} />
            <strong>发布委托</strong>
          </div>
          <p>可选报价发布或服务发布，填写地点、最晚送达、紧急程度和委托时效；系统默认通过后入池。</p>
          <div className="form-preview mt-[10px] grid gap-[8px] text-center">
            <span>报价发布</span>
            <span>服务发布</span>
            <span>押金发布</span>
            <span>委托发布</span>
          </div>
        </article>

        <article className="flow-card p-[14px] compact">
          <div className="card-title flex items-center justify-between gap-[10px] min-w-0">
            <WalletCards size={18} />
            <strong>结算规则</strong>
          </div>
          <p>发布方确认服务结束后进入观察期，当前默认 3 天后进入可提现钱包。</p>
        </article>
      </div>

      <div className="card-list grid gap-[10px]">
        {huntingTasks.map((task) => (
          <article className="flow-card p-[14px]" key={task.id}>
            <div className="card-title flex items-center justify-between gap-[10px] min-w-0">
              <Crosshair size={18} />
              <div>
                <strong>{task.title}</strong>
                <span>{task.mode}</span>
              </div>
              <em>{task.fee > 0 ? formatCurrency(task.fee) : "待报价"}</em>
            </div>
            <div className="meta-line mt-[10px] flex flex-wrap items-center gap-[6px] text-[13px] leading-[1.45] text-[#657181]">
              <span>{task.latestTime}</span>
              <span>{task.location}</span>
              <span>{task.urgency}</span>
              <span>{task.status}</span>
            </div>
            <div className="product-actions mt-[12px] flex flex-wrap items-center justify-between gap-[10px]">
              <span>2 分钟内可自助取消，5 分钟内可协商取消。</span>
              <div>
                <button
                  className="ghost-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-[#475466]"
                  type="button"
                >
                  <MessageCircle size={15} /> 联系
                </button>
                <button
                  className="primary-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white disabled:text-[#748092]"
                  type="button"
                >
                  <CheckCircle2 size={15} />
                  {task.mode === "报价发布" ? "报价委托" : "接受委托"}
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
