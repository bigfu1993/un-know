import {
  addressInfoFields,
  campusAreaOptions,
  clearStoredPendingRegistration,
  getFilledProfileDraft,
  getStoredProfileDraft,
  profileDraftToClientAddressRequest,
  setStoredProfileDraft
} from "@shared/clientPageModel";
import { localPasswordMinLength, saveLocalPasswordCredential } from "@tools/localAuth";
import { validateByKey } from "@tools/validation";
import { RegistrationProfileCompletion } from "./RegistrationProfileCompletion";

/** 注册后引导使用的角色图标映射。 */
const registrationRoleIcons = {
  student: GraduationCap,
  merchant: Store,
  parent: UserRound
} satisfies Record<Role, LucideIcon>;

/** 解析 H5 接口基础地址，避免开发热更新期间依赖共享包导出。 */
function getH5ApiBaseUrl() {
  return (globalThis as H5RuntimeGlobals).__UNKNOWN_API_BASE_URL__ ?? "http://127.0.0.1:8080";
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const { toast, showMessage, hideMessage } = useMessageToast();

  useEffect(() => {
    setSelectedRole(null);
    setBirthday("");
    setDraft({});
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
    setNickname("");
    setPassword("");
    setPasswordConfirm("");
    hideMessage();
  }

  /** 更新资料草稿中的单个字段，避免页面层感知字段级变化。 */
  function handleDraftChange(key: string, value: string) {
    setDraft((currentDraft) => ({ ...currentDraft, [key]: value }));
  }

  /** 向后端确认注册角色，保存本地密码，并在地址完整时同步创建服务端地址。 */
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
        displayName: nickname.trim(),
        profileCompletionRequired: !hasCompleteAddress
      };

      if (hasCompleteAddress) {
        await createClientAddressAfterRegistration(session.accessToken, nextProfileDraft);
      }
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

  return (
    <section className="login-card registration-guide-card grid w-full min-w-0 gap-[12px] p-[16px]">
      <MessageToast onClose={hideMessage} toast={toast} />
      <div className="card-title flex min-w-0 items-center justify-start gap-[10px]">
        <BadgeCheck size={18} />
        <div className="min-w-0 flex-1">
          <strong>选择角色</strong>
          <span>{selectedRole ? `${roleLabels[selectedRole]} · 进入前确认资料` : "注册已完成，选择角色后才能进入客户端。"}</span>
        </div>
      </div>

      <div className="registration-guide-body min-w-0">
        {selectedRole ? (
          <RegistrationProfileCompletion
            areaOptions={campusAreaOptions}
            birthday={birthday}
            draft={draft}
            isSubmitting={isSubmitting}
            nickname={nickname}
            password={password}
            passwordConfirm={passwordConfirm}
            onBack={handleBackToRoleSelection}
            onBirthdayChange={setBirthday}
            onChange={handleDraftChange}
            onNicknameChange={setNickname}
            onPasswordChange={setPassword}
            onPasswordConfirmChange={setPasswordConfirm}
            onSubmit={completeRegistration}
            role={selectedRole}
            roleLabel={roleLabels[selectedRole]}
          />
        ) : (
          renderRoleSelection()
        )}
      </div>
    </section>
  );
}
