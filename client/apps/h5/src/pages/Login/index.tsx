import {
  clearStoredPendingRegistration,
  getStoredPasswordCredential,
  hasStoredPendingRegistration,
  parentRegistrationAddressFields,
  profileDraftToClientAddressRequest,
  setStoredPendingRegistration
} from "@shared/clientPageModel";
import { localAuthCode, localPasswordMinLength, saveLocalPasswordCredential, verifyLocalPasswordCredential } from "@tools/localAuth";
import { normalizeByKey, validateByKey } from "@tools/validation";

/** H5 宿主页暴露的运行时全局变量，用于覆盖接口地址。 */
type H5RuntimeGlobals = typeof globalThis & {
  __UNKNOWN_API_BASE_URL__?: string;
};

/** 注册后角色确认请求使用的最小后端响应包。 */
interface ApiEnvelope<T> {
  code: string;
  message: string;
  data?: T;
}

/** H5 本地重置密码表单属性。 */
interface PasswordResetCardProps {
  code: string;
  defaultCode: string;
  password: string;
  passwordConfirm: string;
  phone: string;
  onBack: () => void;
  onCodeChange: (code: string) => void;
  onFillDefaultCode: () => void;
  onPasswordChange: (password: string) => void;
  onPasswordConfirmChange: (passwordConfirm: string) => void;
  onPhoneChange: (phone: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

/** 注册后必选角色卡片使用的角色图标映射。 */
const registrationRoleIcons = {
  student: GraduationCap,
  merchant: Store,
  parent: UserRound
} satisfies Record<Role, LucideIcon>;

/** 根据已存草稿和所选角色创建可编辑注册资料草稿。 */
function getInitialRegistrationDraft(role: Role, ownerKey?: string) {
  const storedDraft = getStoredProfileDraft(ownerKey);
  const template = registrationProfileTemplates[role];

  return Object.fromEntries(template.fields.map((field) => [field.key, storedDraft[field.key] ?? ""]));
}

/** 读取注册资料中独立于地址表单的选填生日。 */
function getInitialRegistrationBirthday(ownerKey?: string) {
  return getStoredProfileDraft(ownerKey).birthday ?? "";
}

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

/** 注册资料补充阶段地址填写完整时，使用新会话令牌直接创建服务端当前地址。 */
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

/** 注册成功后立即展示的强制角色选择面板。 */
function RegistrationRoleSelection({
  isPending,
  onBack,
  onSelect
}: {
  isPending: boolean;
  onBack: () => void;
  onSelect: (role: Role) => void;
}) {
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

/** 本地重置密码面板，第一阶段不接入真实短信发送。 */
function PasswordResetCard({
  code,
  defaultCode,
  password,
  passwordConfirm,
  phone,
  onBack,
  onCodeChange,
  onFillDefaultCode,
  onPasswordChange,
  onPasswordConfirmChange,
  onPhoneChange,
  onSubmit
}: PasswordResetCardProps) {
  return (
    <form className="login-card password-reset-card grid w-full min-w-0 gap-[14px] p-[16px]" onSubmit={onSubmit}>
      <div className="card-title flex min-w-0 items-center justify-start gap-[10px]">
        <ShieldCheck size={18} />
        <div className="min-w-0 flex-1">
          <strong>重置密码</strong>
          <span>通过手机号校验后设置新密码。</span>
        </div>
      </div>

      <label className="login-field grid min-w-0 gap-[7px]">
        <span>手机号</span>
        <div>
          <Smartphone size={18} />
          <input
            inputMode="numeric"
            maxLength={11}
            onChange={(event) => onPhoneChange(normalizeByKey("phone", event.target.value))}
            placeholder="请输入手机号"
            value={phone}
          />
        </div>
      </label>

      <label className="login-field grid min-w-0 gap-[7px]">
        <span>验证码</span>
        <div>
          <KeyRound size={18} />
          <input
            inputMode="numeric"
            maxLength={6}
            onChange={(event) => onCodeChange(event.target.value.replace(/\D/g, ""))}
            placeholder={`本地验证码 ${defaultCode}`}
            value={code}
          />
          <button onClick={onFillDefaultCode} type="button">
            填入
          </button>
        </div>
      </label>

      <label className="login-field grid min-w-0 gap-[7px]">
        <span>新密码</span>
        <div>
          <ShieldCheck size={18} />
          <input
            autoComplete="new-password"
            onChange={(event) => onPasswordChange(event.target.value)}
            placeholder="至少 6 位"
            type="password"
            value={password}
          />
        </div>
      </label>

      <label className="login-field grid min-w-0 gap-[7px]">
        <span>确认密码</span>
        <div>
          <ShieldCheck size={18} />
          <input
            autoComplete="new-password"
            onChange={(event) => onPasswordConfirmChange(event.target.value)}
            placeholder="再次输入新密码"
            type="password"
            value={passwordConfirm}
          />
        </div>
      </label>

      <p className="login-tip m-0 text-[13px] leading-[1.5] text-[#657181]">
        短信发送暂未接入，本地联调验证码固定为 {defaultCode}。
      </p>

      <div className="password-reset-actions grid gap-[8px]">
        <button
          className="ghost-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-[#475466]"
          onClick={onBack}
          type="button"
        >
          返回登录
        </button>
        <button
          className="primary-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white"
          type="submit"
        >
          <CheckCircle2 size={16} />
          确认重置
        </button>
      </div>
    </form>
  );
}

/** 登录/注册页面，负责认证表单状态和注册后资料交接。 */
export function Login({
  onLoginSuccess
}: {
  onLoginSuccess: (session: LoginResponse) => void;
}) {
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [loginCredentialMode, setLoginCredentialMode] = useState<LoginCredentialMode>("code");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [invitationCode, setInvitationCode] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [pendingRegisterSession, setPendingRegisterSession] = useState<LoginResponse | null>(null);
  const [pendingRegisterPhone, setPendingRegisterPhone] = useState("");
  const [selectedRegisterRole, setSelectedRegisterRole] = useState<Role | null>(null);
  const [registrationBirthday, setRegistrationBirthday] = useState("");
  const [registrationNickname, setRegistrationNickname] = useState("");
  const [registrationDraft, setRegistrationDraft] = useState<ProfileDraftState>({});
  const [registrationPassword, setRegistrationPassword] = useState("");
  const [registrationPasswordConfirm, setRegistrationPasswordConfirm] = useState("");
  const [isRoleSelectionPending, setIsRoleSelectionPending] = useState(false);
  const [isPasswordResetOpen, setIsPasswordResetOpen] = useState(false);
  const [resetPhone, setResetPhone] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState("");
  const { toast, showMessage, hideMessage } = useMessageToast();
  const loginMutation = useClientLogin();
  const registerMutation = useClientRegister();

  const registrationTemplate = selectedRegisterRole ? registrationProfileTemplates[selectedRegisterRole] : null;

  /** 暂存新注册会话，直到用户完成强制角色选择。 */
  function handleRegisterSuccess(session: LoginResponse, rawPhone: string) {
    setStoredPendingRegistration(rawPhone);
    setPendingRegisterSession(session);
    setPendingRegisterPhone(rawPhone);
    setSelectedRegisterRole(null);
    setRegistrationBirthday("");
    setRegistrationNickname("");
    setRegistrationDraft({});
    setRegistrationPassword("");
    setRegistrationPasswordConfirm("");
    setInvitationCode("");
    showMessage("注册成功，请先选择角色。", { type: "success" });
  }

  /** 登录成功后，如存在未完成注册角色选择，则继续角色选择流程。 */
  function handleAuthenticatedSession(session: LoginResponse, rawPhone: string) {
    if (hasStoredPendingRegistration(rawPhone)) {
      setPendingRegisterSession(session);
      setPendingRegisterPhone(rawPhone);
      setSelectedRegisterRole(null);
      setRegistrationBirthday("");
      setRegistrationNickname("");
      setRegistrationDraft({});
      setRegistrationPassword("");
      setRegistrationPasswordConfirm("");
      showMessage("该账号注册后尚未选择角色，请先完成角色选择。", { type: "warning" });
      return;
    }

    onLoginSuccess(session);
  }

  /** 打开本地重置密码流程，并带入当前登录手机号。 */
  function handleOpenPasswordReset() {
    setIsPasswordResetOpen(true);
    setResetPhone(phone);
    setResetCode("");
    setResetPassword("");
    setResetPasswordConfirm("");
    hideMessage();
  }

  /** 退出本地重置密码流程并返回普通登录表单。 */
  function handleBackFromPasswordReset() {
    setIsPasswordResetOpen(false);
    hideMessage();
  }

  /** 取消注册后流程并返回普通登录入口。 */
  function handleCancelRegistrationFlow() {
    setPendingRegisterSession(null);
    setPendingRegisterPhone("");
    setSelectedRegisterRole(null);
    setRegistrationBirthday("");
    setRegistrationNickname("");
    setRegistrationDraft({});
    setRegistrationPassword("");
    setRegistrationPasswordConfirm("");
    setIsRoleSelectionPending(false);
    setAuthMode("login");
    hideMessage();
  }

  /** 记录注册角色并打开资料草稿步骤。 */
  function handleRegistrationRoleSelect(role: Role) {
    const registrationOwnerKey = pendingRegisterPhone || phone;

    setSelectedRegisterRole(role);
    setRegistrationBirthday(getInitialRegistrationBirthday(registrationOwnerKey));
    setRegistrationNickname("");
    setRegistrationDraft(getInitialRegistrationDraft(role, registrationOwnerKey));
    showMessage("已选择角色，请填写昵称并设置登录密码。", { type: "success" });
  }

  /** 从注册资料页返回强制角色选择页。 */
  function handleBackToRegistrationRoleSelection() {
    setSelectedRegisterRole(null);
    setRegistrationBirthday("");
    setRegistrationNickname("");
    setRegistrationDraft({});
    setRegistrationPassword("");
    setRegistrationPasswordConfirm("");
    hideMessage();
  }

  /** 向后端确认注册角色后进入客户端外壳。 */
  async function completeRegistration() {
    if (!pendingRegisterSession || !selectedRegisterRole || !registrationTemplate) {
      return;
    }

    const nicknameValidation = validateByKey("nickname", registrationNickname, { label: "昵称", required: true });

    if (!nicknameValidation.isValid) {
      showMessage(nicknameValidation.message, { type: "warning" });
      return;
    }
    if (registrationPassword.trim().length < localPasswordMinLength) {
      showMessage(`登录密码至少需要 ${localPasswordMinLength} 位。`, { type: "warning" });
      return;
    }
    if (registrationPassword !== registrationPasswordConfirm) {
      showMessage("两次输入的登录密码不一致。", { type: "warning" });
      return;
    }

    const credentialPhone = pendingRegisterPhone || phone;
    const nextProfileDraft = {
      ...getStoredProfileDraft(credentialPhone),
      ...getFilledProfileDraft({
        ...registrationDraft,
        birthday: registrationBirthday
      })
    };

    setIsRoleSelectionPending(true);
    try {
      const session = await selectClientRoleAfterRegistration(pendingRegisterSession.accessToken, selectedRegisterRole);
      const addressFields =
        selectedRegisterRole === "parent" ? parentRegistrationAddressFields : registrationTemplate.fields;
      const hasCompleteAddress = addressFields.length > 0 && addressFields.every((field) => nextProfileDraft[field.key]?.trim());
      const sessionWithNickname = {
        ...session,
        displayName: registrationNickname.trim(),
        profileCompletionRequired: !hasCompleteAddress
      };

      if (hasCompleteAddress) {
        await createClientAddressAfterRegistration(session.accessToken, nextProfileDraft);
      }
      await saveLocalPasswordCredential(credentialPhone, registrationPassword);
      clearStoredPendingRegistration(credentialPhone);
      setStoredProfileDraft(nextProfileDraft, credentialPhone);
      onLoginSuccess(sessionWithNickname);
    } catch (error) {
      showMessage(getErrorMessage(error, "角色确认或密码保存失败，请稍后重试。"), { type: "error" });
    } finally {
      setIsRoleSelectionPending(false);
    }
  }

  /** 校验本地认证输入，并分发登录或注册动作。 */
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    hideMessage();

    const phoneValidation = validateByKey("phone", phone, { label: "手机号", required: true });

    if (!phoneValidation.isValid) {
      showMessage(phoneValidation.message, { type: "warning" });
      return;
    }

    const submittedPhone = phone;

    if (authMode === "login" && loginCredentialMode === "password") {
      if (loginPassword.trim().length < localPasswordMinLength) {
        showMessage(`登录密码至少需要 ${localPasswordMinLength} 位。`, { type: "warning" });
        return;
      }

      try {
        const credential = getStoredPasswordCredential(submittedPhone);

        if (!credential) {
          showMessage("该手机号还未设置密码，请先使用验证码登录或注册后设置密码。", { type: "warning" });
          return;
        }

        const isPasswordValid = await verifyLocalPasswordCredential(submittedPhone, loginPassword);

        if (!isPasswordValid) {
          showMessage("登录密码不正确。", { type: "warning" });
          return;
        }
      } catch (error) {
        showMessage(getErrorMessage(error, "密码校验失败，请改用验证码登录。"), { type: "error" });
        return;
      }

      loginMutation.mutate({ phone: submittedPhone, code: localAuthCode }, {
        onSuccess: (session) => {
          handleAuthenticatedSession(session, submittedPhone);
        },
        onError: (error) => showMessage(getErrorMessage(error, "登录失败，请稍后重试。"), { type: "error" })
      });
      return;
    }

    if (code !== localAuthCode) {
      showMessage(`本地联调验证码固定为 ${localAuthCode}。`, { type: "warning" });
      return;
    }

    if (authMode === "register") {
      const trimmedInvitationCode = invitationCode.trim();
      const registerPayload = trimmedInvitationCode
        ? { phone: submittedPhone, code, invitationCode: trimmedInvitationCode }
        : { phone: submittedPhone, code };

      registerMutation.mutate(registerPayload, {
        onSuccess: (session) => handleRegisterSuccess(session, submittedPhone),
        onError: (error) => showMessage(getErrorMessage(error, "注册失败，请稍后重试。"), { type: "error" })
      });
      return;
    }

    loginMutation.mutate({ phone: submittedPhone, code }, {
      onSuccess: (session) => {
        handleAuthenticatedSession(session, submittedPhone);
      },
      onError: (error) => showMessage(getErrorMessage(error, "登录失败，请稍后重试。"), { type: "error" })
    });
  }

  /** 校验临时本地重置密码表单，不调用后端短信接口。 */
  async function handlePasswordResetSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    hideMessage();

    const resetPhoneValidation = validateByKey("phone", resetPhone, { label: "手机号", required: true });

    if (!resetPhoneValidation.isValid) {
      showMessage(resetPhoneValidation.message, { type: "warning" });
      return;
    }
    if (resetCode !== localAuthCode) {
      showMessage(`本地联调验证码固定为 ${localAuthCode}。`, { type: "warning" });
      return;
    }
    if (resetPassword.trim().length < localPasswordMinLength) {
      showMessage(`新密码至少需要 ${localPasswordMinLength} 位。`, { type: "warning" });
      return;
    }
    if (resetPassword !== resetPasswordConfirm) {
      showMessage("两次输入的新密码不一致。", { type: "warning" });
      return;
    }

    try {
      await saveLocalPasswordCredential(resetPhone, resetPassword);
      setPhone(resetPhone);
      setCode(localAuthCode);
      setLoginPassword(resetPassword);
      setLoginCredentialMode("password");
      setIsPasswordResetOpen(false);
      showMessage("密码已重置，请继续登录。", { type: "success" });
    } catch (error) {
      showMessage(getErrorMessage(error, "密码保存失败，请稍后重试。"), { type: "error" });
    }
  }

  if (isPasswordResetOpen) {
    return (
      <main className="login-shell mx-auto grid min-h-screen w-full max-w-[540px] content-center gap-[14px] overflow-hidden px-[14px] py-[28px] text-[#17212b]">
        <MessageToast onClose={hideMessage} toast={toast} />
        <PasswordResetCard
          code={resetCode}
          defaultCode={localAuthCode}
          onBack={handleBackFromPasswordReset}
          onCodeChange={setResetCode}
          onFillDefaultCode={() => setResetCode(localAuthCode)}
          onPasswordChange={setResetPassword}
          onPasswordConfirmChange={setResetPasswordConfirm}
          onPhoneChange={setResetPhone}
          onSubmit={handlePasswordResetSubmit}
          password={resetPassword}
          passwordConfirm={resetPasswordConfirm}
          phone={resetPhone}
        />
      </main>
    );
  }

  if (pendingRegisterSession && !selectedRegisterRole) {
    return (
      <main className="login-shell mx-auto grid min-h-screen w-full max-w-[540px] content-center gap-[14px] overflow-hidden px-[14px] py-[28px] text-[#17212b]">
        <MessageToast onClose={hideMessage} toast={toast} />
        <RegistrationRoleSelection
          isPending={isRoleSelectionPending}
          onBack={handleCancelRegistrationFlow}
          onSelect={handleRegistrationRoleSelect}
        />
      </main>
    );
  }

  if (pendingRegisterSession && selectedRegisterRole && registrationTemplate) {
    return (
      <main className="login-shell mx-auto grid min-h-screen w-full max-w-[540px] content-center gap-[14px] overflow-hidden px-[14px] py-[28px] text-[#17212b]">
        <MessageToast onClose={hideMessage} toast={toast} />
        <RegistrationProfileCompletion
          areaOptions={campusAreaOptions}
          birthday={registrationBirthday}
          draft={registrationDraft}
          isSubmitting={isRoleSelectionPending}
          nickname={registrationNickname}
          password={registrationPassword}
          passwordConfirm={registrationPasswordConfirm}
          onChange={(key, value) => setRegistrationDraft((draft) => ({ ...draft, [key]: value }))}
          onBack={handleBackToRegistrationRoleSelection}
          onBirthdayChange={setRegistrationBirthday}
          onNicknameChange={setRegistrationNickname}
          onPasswordChange={setRegistrationPassword}
          onPasswordConfirmChange={setRegistrationPasswordConfirm}
          onSubmit={completeRegistration}
          role={selectedRegisterRole}
          roleLabel={roleLabels[selectedRegisterRole]}
          template={registrationTemplate}
        />
      </main>
    );
  }

  const isAuthPending = loginMutation.isPending || registerMutation.isPending;

  return (
    <main className="login-shell mx-auto grid min-h-screen w-full max-w-[540px] content-center gap-[14px] overflow-hidden px-[14px] py-[28px] text-[#17212b]">
      <MessageToast onClose={hideMessage} toast={toast} />
      <section className="login-card grid gap-[14px] p-[16px]">
        <div className="card-title flex min-w-0 items-center justify-start gap-[10px]">
          <ShieldCheck size={18} />
          <div className="min-w-0 flex-1">
            <strong>佚名客户端</strong>
            <span>验证码或密码登录，本地验证码 {localAuthCode}</span>
          </div>
        </div>
        <p className="login-tip m-0 text-[13px] leading-[1.5] text-[#657181]">
          使用手机号登录；注册完成后需要选择角色并设置密码，随后进入对应客户端。
        </p>
      </section>
      <LoginRegisterCard
        authMode={authMode}
        code={code}
        defaultCode={localAuthCode}
        invitationCode={invitationCode}
        isAuthPending={isAuthPending}
        loginCredentialMode={loginCredentialMode}
        password={loginPassword}
        onAuthModeChange={setAuthMode}
        onCodeChange={setCode}
        onFillDefaultCode={() => setCode(localAuthCode)}
        onForgotPassword={handleOpenPasswordReset}
        onInvitationCodeChange={setInvitationCode}
        onLoginCredentialModeChange={(mode) => {
          setLoginCredentialMode(mode);
          hideMessage();
        }}
        onPasswordChange={setLoginPassword}
        onPhoneChange={setPhone}
        onSubmit={handleSubmit}
        phone={phone}
      />
    </main>
  );
}
