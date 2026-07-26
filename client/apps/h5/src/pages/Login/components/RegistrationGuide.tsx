import { AddressInfoForm } from "@components/AddressInfoForm";
import {
  addressInfoFields,
  campusAreaOptions,
  clearStoredPendingRegistration,
  getFilledProfileDraft,
  getStoredProfileDraft,
  merchantRegistrationBusinessFields,
  parentChildInfoFields,
  profileDraftToClientAddressRequest,
  setStoredProfileDraft
} from "@shared/clientPageModel";
import { localAuthCode, localPasswordMinLength, saveLocalPasswordCredential } from "@tools/localAuth";
import { hideMessage, showMessage } from "@tools/messageToast";
import { getFilledFieldCount, hasInvalidFields, validateByKey } from "@tools/validation";

/** 注册后引导使用的角色图标映射。 */
const registrationRoleIcons = {
  student: GraduationCap,
  merchant: Store,
  parent: UserRound
} satisfies Record<Role, LucideIcon>;

/** 注册信息录入表单 id，供同级固定 footer 中的提交按钮绑定。 */
const registrationProfileFormId = "registration-profile-form";

/** 解析 H5 接口基础地址，避免开发热更新期间依赖共享包导出。 */
function getH5ApiBaseUrl() {
  return (globalThis as H5RuntimeGlobals).__UNKNOWN_API_BASE_URL__ ?? "http://127.0.0.1:9988";
}

/** 为刚注册的账号确认最终角色，并返回刷新后的会话。 */
async function selectClientRoleAfterRegistration(accessToken: string, role: Role) {
  const response = await fetch(`${getH5ApiBaseUrl()}/api/client/auth/select-role`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ role })
  });
  const result = (await response.json()) as ApiEnvelope<LoginResponse>;

  if (!response.ok || result.code !== "OK" || !result.data) {
    throw new Error(result.message || `HTTP ${response.status}`);
  }

  return result.data;
}

/** 注册引导阶段地址填写完整时，使用新会话令牌直接创建服务端当前地址。 */
async function createClientAddressAfterRegistration(accessToken: string, profileDraft: ProfileDraftState) {
  const response = await fetch(`${getH5ApiBaseUrl()}/api/client/profile/addresses`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(profileDraftToClientAddressRequest(profileDraft, true))
  });
  const result = (await response.json()) as ApiEnvelope<ClientAddress>;

  if (!response.ok || result.code !== "OK" || !result.data) {
    throw new Error(result.message || `HTTP ${response.status}`);
  }

  return result.data;
}

/** 注册后的角色选择和资料补充引导，内部维护所选角色、资料草稿和最终提交。 */
export function RegistrationGuide({ accessToken, ownerPhone, onBack, onCompleted }: RegistrationGuideProps) {
  const [birthday, setBirthday] = useState("");
  const [draft, setDraft] = useState<ProfileDraftState>({});
  const [isAddressVisible, setIsAddressVisible] = useState(false);
  const [isBusinessVisible, setIsBusinessVisible] = useState(false);
  const [isChildVisible, setIsChildVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const resetPasswordMutation = useResetClientPassword();
  const visibleProfileFields = [
    ...(isAddressVisible ? addressInfoFields : []),
    ...(selectedRole === "parent" && isChildVisible ? parentChildInfoFields : []),
    ...(selectedRole === "merchant" && isBusinessVisible ? merchantRegistrationBusinessFields : [])
  ];
  const nicknameValidation = validateByKey("nickname", nickname, { label: "昵称", required: true });
  const hasMissingProfileFields = getFilledFieldCount(visibleProfileFields, draft) < visibleProfileFields.length;
  const isNicknameInvalid = !nicknameValidation.isValid;
  const isPasswordMissing = !password.trim();
  const isPasswordConfirmMissing = !passwordConfirm.trim();
  const isPasswordConfirmInvalid = Boolean(passwordConfirm.trim()) && password !== passwordConfirm;
  const hasInvalidProfileFields = hasInvalidFields(visibleProfileFields, draft);
  const submitLabel = isSubmitting
    ? "进入中"
    : isNicknameInvalid
      ? "填写昵称并进入"
      : isPasswordMissing || isPasswordConfirmMissing || isPasswordConfirmInvalid
        ? "设置密码并进入"
        : hasInvalidProfileFields
          ? "修正资料并进入"
          : hasMissingProfileFields
            ? "留空资料并进入"
            : "确认并进入";

  useEffect(() => {
    setSelectedRole(null);
    setBirthday("");
    setDraft({});
    setIsAddressVisible(false);
    setIsBusinessVisible(false);
    setIsChildVisible(false);
    setNickname("");
    setPassword("");
    setPasswordConfirm("");
    setIsSubmitting(false);
  }, [accessToken, ownerPhone]);

  /** 选择角色后初始化该账号的注册资料草稿，并进入资料补充表单。 */
  function handleRoleSelect(role: Role) {
    const storedDraft = getStoredProfileDraft(ownerPhone);

    setSelectedRole(role);
    setBirthday(storedDraft.birthday ?? "");
    setDraft(storedDraft);
    setIsAddressVisible(false);
    setIsBusinessVisible(false);
    setIsChildVisible(false);
    setNickname("");
    setPassword("");
    setPasswordConfirm("");
    hideMessage();
  }

  /** 从资料表单返回角色选择，并清空本轮表单临时输入。 */
  function handleBackToRoleSelection() {
    setSelectedRole(null);
    setBirthday("");
    setDraft({});
    setIsAddressVisible(false);
    setIsBusinessVisible(false);
    setIsChildVisible(false);
    setNickname("");
    setPassword("");
    setPasswordConfirm("");
    hideMessage();
  }

  /** 更新资料草稿中的单个字段，避免页面层感知字段级变化。 */
  function handleDraftChange(key: string, value: string) {
    setDraft((currentDraft) => ({ ...currentDraft, [key]: value }));
  }

  /** 必填昵称和选填资料格式通过本地校验后提交注册引导。 */
  function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isNicknameInvalid || hasInvalidProfileFields) {
      return;
    }
    void completeRegistration();
  }

  /** 向后端确认注册角色，保存服务端和本地密码凭据，并在地址完整时同步创建服务端地址。 */
  async function completeRegistration() {
    const nicknameValidation = validateByKey("nickname", nickname, { label: "昵称", required: true });

    hideMessage();
    if (!selectedRole) {
      showMessage("请先选择角色。", { type: "warning" });
      return;
    }
    if (!ownerPhone) {
      showMessage("注册手机号缺失，请返回后重新登录或注册。", { type: "error" });
      return;
    }
    if (!nicknameValidation.isValid) {
      showMessage(nicknameValidation.message, { type: "warning" });
      return;
    }
    if (password.trim().length < localPasswordMinLength) {
      showMessage(`登录密码至少需要 ${localPasswordMinLength} 位。`, { type: "warning" });
      return;
    }
    if (password !== passwordConfirm) {
      showMessage("两次输入的登录密码不一致。", { type: "warning" });
      return;
    }

    const nextProfileDraft = {
      ...getStoredProfileDraft(ownerPhone),
      ...getFilledProfileDraft({
        ...draft,
        birthday
      })
    };
    const hasCompleteAddress = addressInfoFields.every((field) => nextProfileDraft[field.key]?.trim());

    setIsSubmitting(true);
    try {
      const session = await selectClientRoleAfterRegistration(accessToken, selectedRole);
      const sessionWithNickname = {
        ...session,
        nickname: nickname.trim(),
        profileCompletionRequired: !hasCompleteAddress
      };

      if (hasCompleteAddress) {
        await createClientAddressAfterRegistration(session.accessToken, nextProfileDraft);
      }
      await resetPasswordMutation.mutateAsync({
        phone: ownerPhone,
        verifyMode: "code",
        code: localAuthCode,
        password,
        passwordConfirm
      });
      await saveLocalPasswordCredential(ownerPhone, password);
      clearStoredPendingRegistration(ownerPhone);
      setStoredProfileDraft(nextProfileDraft, ownerPhone);
      onCompleted(sessionWithNickname);
    } catch (error) {
      showMessage(getErrorMessage(error, "角色确认或密码保存失败，请稍后重试。"), { type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  }

  /** 渲染角色选择入口，未选角色时只允许返回登录或选择角色。 */
  function renderRoleSelection() {
    return (
      <div className="registration-role-panel grid gap-[12px]">
        <div className="registration-role-list grid gap-[10px]" aria-label="选择注册角色">
          {roles.map((item) => {
            const Icon = registrationRoleIcons[item];

            return (
              <button
                className="registration-role-option grid min-w-0 items-center gap-[10px] p-[12px] text-left"
                key={item}
                onClick={() => handleRoleSelect(item)}
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
          onClick={onBack}
          type="button"
        >
          返回登录
        </button>
      </div>
    );
  }

  /** 渲染可选资料分组卡，标题、操作按钮和展开表单保持在同一个视觉整体内。 */
  function renderProfileExtraCard({
    actionLabel,
    children,
    description,
    isExpanded,
    onToggle,
    title
  }: {
    actionLabel: string;
    children: ReactNode;
    description: string;
    isExpanded: boolean;
    onToggle: () => void;
    title: string;
  }) {
    return (
      <section className={`registration-profile-extra-card grid gap-[10px] ${isExpanded ? "expanded" : ""}`}>
        <div className="registration-profile-extra-head flex min-w-0 items-center justify-between gap-[10px]">
          <div className="min-w-0">
            <strong>{title}</strong>
            <span>{description}</span>
          </div>
          <button
            className="ghost-button inline-flex min-h-[32px] shrink-0 items-center justify-center gap-[5px] px-[10px] py-[7px] text-[#475466]"
            onClick={onToggle}
            type="button"
          >
            <Plus size={15} />
            {actionLabel}
          </button>
        </div>
        {isExpanded ? <div className="registration-profile-extra-body grid gap-[10px]">{children}</div> : null}
      </section>
    );
  }

  /** 渲染角色选择后的资料与密码表单，表单状态归属于注册引导组件内部。 */
  function renderProfileForm(role: Role) {
    return (
      <form
        className="registration-profile-form grid w-full min-w-0"
        id={registrationProfileFormId}
        onSubmit={handleProfileSubmit}
      >
        <div className="registration-profile-scroll grid min-w-0 gap-[12px]">
          <p className="login-tip m-0 text-[13px] leading-[1.5] text-[#657181]">
            {roleLabels[role]}资料可先补充必要信息；昵称和登录密码必须设置后才能进入。
          </p>
          <div className="registration-profile-fields grid gap-[10px]">
            <label
              className={`registration-profile-field grid gap-[7px] w-full min-w-0 font-bold ${
                isNicknameInvalid ? "missing" : ""
              }`}
            >
              <span>昵称（必填）</span>
              <input
                autoComplete="nickname"
                maxLength={20}
                onChange={(event) => setNickname(event.target.value)}
                placeholder="请输入登录后展示的昵称"
                value={nickname}
              />
              {isNicknameInvalid ? <em>{nicknameValidation.message}</em> : null}
            </label>

            <label
              className={`registration-profile-field grid gap-[7px] w-full min-w-0 font-bold ${
                isPasswordMissing ? "missing" : ""
              }`}
            >
              <span>登录密码（必填）</span>
              <input
                autoComplete="new-password"
                minLength={6}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="至少 6 位"
                type="password"
                value={password}
              />
            </label>

            <label
              className={`registration-profile-field grid gap-[7px] w-full min-w-0 font-bold ${
                isPasswordConfirmMissing || isPasswordConfirmInvalid ? "missing" : ""
              }`}
            >
              <span>重复密码（必填）</span>
              <input
                autoComplete="new-password"
                minLength={6}
                onChange={(event) => setPasswordConfirm(event.target.value)}
                placeholder="再次输入登录密码"
                type="password"
                value={passwordConfirm}
              />
            </label>

            <label className="registration-profile-field grid gap-[7px] w-full min-w-0 font-bold">
              <span>生日（选填）</span>
              <input
                onChange={(event) => setBirthday(event.target.value)}
                placeholder="请选择生日"
                type="date"
                value={birthday}
              />
            </label>

            <div className="registration-profile-extra-list grid gap-[10px]">
              {renderProfileExtraCard({
                actionLabel: isAddressVisible ? "收起地址" : "添加地址",
                description: "联系人、区域和收货地址可以后续补充。",
                isExpanded: isAddressVisible,
                onToggle: () => setIsAddressVisible((visible) => !visible),
                title: "地址信息",
                children: (
                  <AddressInfoForm
                    areaOptions={campusAreaOptions}
                    draft={draft}
                    fields={addressInfoFields}
                    onChange={(nextDraft, changedKey) => handleDraftChange(changedKey, nextDraft[changedKey] ?? "")}
                  />
                )
              })}

              {role === "parent"
                ? renderProfileExtraCard({
                    actionLabel: isChildVisible ? "收起孩子" : "添加孩子",
                    description: "孩子资料只在家长角色需要时补充。",
                    isExpanded: isChildVisible,
                    onToggle: () => setIsChildVisible((visible) => !visible),
                    title: "孩子信息",
                    children: (
                      <AddressInfoForm
                        areaOptions={campusAreaOptions}
                        draft={draft}
                        fields={parentChildInfoFields}
                        onChange={(nextDraft, changedKey) =>
                          handleDraftChange(changedKey, nextDraft[changedKey] ?? "")
                        }
                      />
                    )
                  })
                : null}

              {role === "merchant"
                ? renderProfileExtraCard({
                    actionLabel: isBusinessVisible ? "收起工商信息" : "添加工商信息",
                    description: "经营主体资料只在商户角色需要时补充。",
                    isExpanded: isBusinessVisible,
                    onToggle: () => setIsBusinessVisible((visible) => !visible),
                    title: "工商信息",
                    children: (
                      <AddressInfoForm
                        areaOptions={campusAreaOptions}
                        draft={draft}
                        fields={merchantRegistrationBusinessFields}
                        onChange={(nextDraft, changedKey) =>
                          handleDraftChange(changedKey, nextDraft[changedKey] ?? "")
                        }
                      />
                    )
                  })
                : null}
            </div>
          </div>
        </div>
      </form>
    );
  }

  /** 渲染信息录入固定底部操作区，作为卡片直接子节点与标题同级。 */
  function renderProfileFooter() {
    return (
      <div className="registration-profile-footer grid gap-[8px]">
        <div className="registration-profile-actions grid gap-[8px]">
          <button
            className="ghost-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-[#475466]"
            disabled={isSubmitting}
            onClick={handleBackToRoleSelection}
            type="button"
          >
            返回重选角色
          </button>
          <button
            className="primary-button inline-flex min-h-[34px] w-full items-center justify-center gap-[5px] px-[10px] py-[8px] text-white disabled:text-[#748092]"
            disabled={isSubmitting || isNicknameInvalid || hasInvalidProfileFields}
            form={registrationProfileFormId}
            type="submit"
          >
            <CheckCircle2 size={16} />
            {submitLabel}
          </button>
        </div>
        <p className="login-tip m-0 text-[13px] leading-[1.5] text-[#657181]">
          昵称和登录密码为必填；生日、地址、孩子和工商信息可以先留空，后续可在设置页或业务流程中补充。
        </p>
      </div>
    );
  }

  const guideTitle = selectedRole ? `${roleLabels[selectedRole]}信息录入` : "选择角色";
  const guideDescription = selectedRole ? "昵称和登录密码必须设置后才能进入。" : "注册已完成，选择角色后才能进入客户端。";

  return (
    <section
      className={`login-card registration-guide-card grid w-full min-w-0 gap-[12px] p-[16px] ${
        selectedRole ? "profile-mode" : "role-mode"
      }`}
    >
      <div className="card-title flex min-w-0 items-center justify-start gap-[10px]">
        <BadgeCheck size={18} />
        <div className="min-w-0 flex-1">
          <strong>{guideTitle}</strong>
          <span>{guideDescription}</span>
        </div>
      </div>

      <div className="registration-guide-body min-w-0">
        {selectedRole ? (
          renderProfileForm(selectedRole)
        ) : (
          renderRoleSelection()
        )}
      </div>

      {selectedRole ? renderProfileFooter() : null}
    </section>
  );
}
