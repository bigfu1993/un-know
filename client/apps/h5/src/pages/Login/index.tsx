import "./index.less";
import {
  clearStoredPendingRegistration,
  hasStoredPendingRegistration,
  parentRegistrationAddressFields,
  profileDraftToClientAddressRequest,
  setStoredPendingRegistration
} from "@shared/clientPageModel";
import { localPasswordMinLength, saveLocalPasswordCredential } from "@tools/localAuth";
import { validateByKey } from "@tools/validation";
import { LoginGuideCard } from "./components/LoginGuideCard";
import { LoginRegisterCard } from "./components/LoginRegisterCard";
import { LoginShell } from "./components/LoginShell";
import { PasswordResetCard } from "./components/PasswordResetCard";
import { RegistrationProfileStep } from "./components/RegistrationProfileStep";
import { RegistrationRoleSelection } from "./components/RegistrationRoleSelection";

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

/** 登录页入口，负责登录后跨步骤业务流转、注册角色确认和资料补充流程装配。 */
export function Login({ onLoginSuccess }: LoginProps) {
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
  const [passwordResetInitialPhone, setPasswordResetInitialPhone] = useState("");
  const [passwordResetResult, setPasswordResetResult] = useState<PasswordResetResult | null>(null);
  const { toast, showMessage, hideMessage } = useMessageToast();

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

  /** 打开本地重置密码流程，并带入当前登录表单手机号。 */
  function handleOpenPasswordReset(phone?: string) {
    setIsPasswordResetOpen(true);
    setPasswordResetInitialPhone(phone ?? "");
    hideMessage();
  }

  /** 退出本地重置密码流程并返回普通登录表单。 */
  function handleBackFromPasswordReset() {
    setIsPasswordResetOpen(false);
    hideMessage();
  }

  /** 接收忘记密码结果，并回到登录表单进行密码登录。 */
  function handlePasswordResetCompleted(result: PasswordResetResult) {
    setPasswordResetResult(result);
    setIsPasswordResetOpen(false);
    showMessage("密码已重置，请继续登录。", { type: "success" });
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
    hideMessage();
  }

  /** 记录注册角色并打开资料草稿步骤。 */
  function handleRegistrationRoleSelect(role: Role) {
    const registrationOwnerKey = pendingRegisterPhone;

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

  /** 向后端确认注册角色，保存本地密码，并在地址完整时同步创建服务端地址。 */
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

    const credentialPhone = pendingRegisterPhone;
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

  if (isPasswordResetOpen) {
    return (
      <LoginShell onToastClose={hideMessage} toast={toast}>
        <PasswordResetCard
          initialPhone={passwordResetInitialPhone}
          onBack={handleBackFromPasswordReset}
          onCompleted={handlePasswordResetCompleted}
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

  return (
    <LoginShell onToastClose={hideMessage} toast={toast}>
      <LoginGuideCard />
      <LoginRegisterCard
        passwordResetResult={passwordResetResult}
        onAuthenticated={handleAuthenticatedSession}
        onForgotPassword={handleOpenPasswordReset}
        onRegistered={handleRegisterSuccess}
      />
    </LoginShell>
  );
}
