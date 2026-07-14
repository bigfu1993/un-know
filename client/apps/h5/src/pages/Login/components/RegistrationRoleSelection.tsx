/** 注册后必选角色卡片使用的角色图标映射。 */
const registrationRoleIcons = {
  student: GraduationCap,
  merchant: Store,
  parent: UserRound
} satisfies Record<Role, LucideIcon>;

/** 注册成功后立即展示的强制角色选择面板。 */
export function RegistrationRoleSelection({ isPending, onBack, onSelect }: RegistrationRoleSelectionProps) {
  return (
    <section className="login-card registration-role-card grid w-full min-w-0 gap-[12px] p-[16px]">
      <div className="card-title flex min-w-0 items-center justify-start gap-[10px]">
        <BadgeCheck size={18} />
        <div className="min-w-0 flex-1">
          <strong>选择角色</strong>
          <span>注册已完成，选择角色后才能进入客户端。</span>
        </div>
      </div>

      <div className="registration-role-list grid gap-[10px]" aria-label="选择注册角色">
        {roles.map((item) => {
          const Icon = registrationRoleIcons[item];

          return (
            <button
              className="registration-role-option grid min-w-0 items-center gap-[10px] p-[12px] text-left"
              disabled={isPending}
              key={item}
              onClick={() => onSelect(item)}
              type="button"
            >
              <span className="registration-role-icon grid h-[38px] w-[38px] place-items-center">
                <Icon size={20} />
              </span>
              <span className="min-w-0">
                <strong>{roleLabels[item]}</strong>
                <em>{getRoleHint(item)}</em>
              </span>
            </button>
          );
        })}
      </div>

      <p className="login-tip m-0 text-[13px] leading-[1.5] text-[#657181]">
        角色选择为必选步骤；昵称和密码必须设置后才能进入，地址信息可以留空。
      </p>

      <button
        className="ghost-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-[#475466]"
        disabled={isPending}
        onClick={onBack}
        type="button"
      >
        返回登录
      </button>
    </section>
  );
}
