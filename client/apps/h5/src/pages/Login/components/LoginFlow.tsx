import {
  clearStoredPendingRegistration,
  getStoredPasswordCredential,
  hasStoredPendingRegistration,
  parentRegistrationAddressFields,
  profileDraftToClientAddressRequest,
  setStoredPendingRegistration
} from "@shared/clientPageModel";
import { localAuthCode, localPasswordMinLength, saveLocalPasswordCredential, verifyLocalPasswordCredential } from "@tools/localAuth";
import { validateByKey } from "@tools/validation";
import { LoginGuideCard } from "./LoginGuideCard";
import { LoginRegisterCard } from "./LoginRegisterCard";
import { LoginShell } from "./LoginShell";
import { PasswordResetCard } from "./PasswordResetCard";
import { RegistrationProfileStep } from "./RegistrationProfileStep";
import { RegistrationRoleSelection } from "./RegistrationRoleSelection";

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

/** 登录流程组件，负责认证状态、注册角色选择、资料补充和忘记密码流程。 */
export function LoginFlow({ onLoginSuccess }: LoginFlowProps) {
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
      const hasCompleteAddress =
        addressFields.length > 0 && addressFields.every((field) => nextProfileDraft[field.key]?.trim());
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

      loginMutation.mutate(
        { phone: submittedPhone, code: localAuthCode },
        {
          onSuccess: (session) => {
            handleAuthenticatedSession(session, submittedPhone);
          },
          onError: (error) => showMessage(getErrorMessage(error, "登录失败，请稍后重试。"), { type: "error" })
        }
      );
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

    loginMutation.mutate(
      { phone: submittedPhone, code },
      {
        onSuccess: (session) => {
          handleAuthenticatedSession(session, submittedPhone);
        },
        onError: (error) => showMessage(getErrorMessage(error, "登录失败，请稍后重试。"), { type: "error" })
      }
    );
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
      <LoginShell onToastClose={hideMessage} toast={toast}>
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
      </LoginShell>
    );
  }

  if (pendingRegisterSession && !selectedRegisterRole) {
    return (
      <LoginShell onToastClose={hideMessage} toast={toast}>
        <RegistrationRoleSelection
          isPending={isRoleSelectionPending}
          onBack={handleCancelRegistrationFlow}
          onSelect={handleRegistrationRoleSelect}
        />
      </LoginShell>
    );
  }

  if (pendingRegisterSession && selectedRegisterRole && registrationTemplate) {
    return (
      <LoginShell onToastClose={hideMessage} toast={toast}>
        <RegistrationProfileStep
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
          template={registrationTemplate}
        />
      </LoginShell>
    );
  }

  const isAuthPending = loginMutation.isPending || registerMutation.isPending;

  return (
    <LoginShell onToastClose={hideMessage} toast={toast}>
      <LoginGuideCard defaultCode={localAuthCode} />
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
    </LoginShell>
  );
}
