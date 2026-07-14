import {
  campusAreaOptions,
  clearStoredPendingRegistration,
  getFilledProfileDraft,
  getStoredProfileDraft,
  parentRegistrationAddressFields,
  profileDraftToClientAddressRequest,
  registrationProfileTemplates,
  setStoredProfileDraft
} from "@shared/clientPageModel";
import { localPasswordMinLength, saveLocalPasswordCredential } from "@tools/localAuth";
import { validateByKey } from "@tools/validation";
import { RegistrationProfileCompletion } from "./RegistrationProfileCompletion";

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

/** 注册角色选择后的资料补充步骤，内部维护草稿、校验和最终确认提交。 */
export function RegistrationProfileStep({
  accessToken,
  ownerPhone,
  role,
  onBack,
  onCompleted
}: RegistrationProfileStepProps) {
  const [birthday, setBirthday] = useState("");
  const [draft, setDraft] = useState<ProfileDraftState>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const { toast, showMessage, hideMessage } = useMessageToast();
  const template = registrationProfileTemplates[role];

  useEffect(() => {
    setBirthday(getInitialRegistrationBirthday(ownerPhone));
    setDraft(getInitialRegistrationDraft(role, ownerPhone));
    setNickname("");
    setPassword("");
    setPasswordConfirm("");
  }, [ownerPhone, role]);

  /** 更新资料草稿中的单个字段，避免页面层感知字段级变化。 */
  function handleDraftChange(key: string, value: string) {
    setDraft((currentDraft) => ({ ...currentDraft, [key]: value }));
  }

  /** 向后端确认注册角色，保存本地密码，并在地址完整时同步创建服务端地址。 */
  async function completeRegistration() {
    const nicknameValidation = validateByKey("nickname", nickname, { label: "昵称", required: true });

    hideMessage();
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

    setIsSubmitting(true);
    try {
      const session = await selectClientRoleAfterRegistration(accessToken, role);
      const addressFields = role === "parent" ? parentRegistrationAddressFields : template.fields;
      const hasCompleteAddress =
        addressFields.length > 0 && addressFields.every((field) => nextProfileDraft[field.key]?.trim());
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

  return (
    <>
      <MessageToast onClose={hideMessage} toast={toast} />
      <RegistrationProfileCompletion
        areaOptions={campusAreaOptions}
        birthday={birthday}
        draft={draft}
        isSubmitting={isSubmitting}
        nickname={nickname}
        password={password}
        passwordConfirm={passwordConfirm}
        onChange={handleDraftChange}
        onBack={onBack}
        onBirthdayChange={setBirthday}
        onNicknameChange={setNickname}
        onPasswordChange={setPassword}
        onPasswordConfirmChange={setPasswordConfirm}
        onSubmit={completeRegistration}
        role={role}
        roleLabel={roleLabels[role]}
        template={template}
      />
    </>
  );
}
