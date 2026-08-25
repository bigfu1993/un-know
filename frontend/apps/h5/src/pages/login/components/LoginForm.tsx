import { getStoredPasswordCredential } from "@shared/clientPageModel";
import { localAuthCode, localPasswordMinLength, verifyLocalPasswordCredential } from "@tools/localAuth";
import { hideMessage, showMessage } from "@tools/messageToast";
import { normalizeByKey, validateByKey } from "@tools/validation";

/** 登录表单，内部维护验证码登录和本地密码登录所需的输入、校验和提交逻辑。 */
export function LoginForm({ onAuthenticated }: LoginFormProps) {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [credentialMode, setCredentialMode] = useState<LoginCredentialMode>("code");
  const [password, setPassword] = useState("");
  const loginMutation = useClientLogin();

  const phoneValidation = validateByKey("phone", phone, { label: "手机号", required: true });
  const isPhoneInvalid = Boolean(phone) && !phoneValidation.isValid;
  const isCodeInvalid = Boolean(code) && code !== localAuthCode;
  const isPasswordInvalid = Boolean(password) && password.trim().length < localPasswordMinLength;
  const submitLabel = loginMutation.isPending ? "登录中" : "登录";

  /** 校验登录输入并通过真实登录接口创建会话。 */
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    hideMessage();

    const phoneValidation = validateByKey("phone", phone, { label: "手机号", required: true });

    if (!phoneValidation.isValid) {
      showMessage(phoneValidation.message, { type: "warning" });
      return;
    }

    if (credentialMode === "password") {
      if (password.trim().length < localPasswordMinLength) {
        showMessage(`登录密码至少需要 ${localPasswordMinLength} 位。`, { type: "warning" });
        return;
      }

      try {
        const credential = getStoredPasswordCredential(phone);

        if (!credential) {
          showMessage("该手机号还未设置密码，请先使用验证码登录或注册后设置密码。", { type: "warning" });
          return;
        }

        if (!(await verifyLocalPasswordCredential(phone, password))) {
          showMessage("登录密码不正确。", { type: "warning" });
          return;
        }
      } catch (error) {
        showMessage(getErrorMessage(error, "密码校验失败，请改用验证码登录。"), { type: "error" });
        return;
      }

      loginMutation.mutate(
        { phone, code: localAuthCode },
        {
          onSuccess: (session) => onAuthenticated(session, phone),
          onError: (error) => showMessage(getErrorMessage(error, "登录失败，请稍后重试。"), { type: "error" })
        }
      );
      return;
    }

    if (code !== localAuthCode) {
      showMessage(`本地联调验证码固定为 ${localAuthCode}。`, { type: "warning" });
      return;
    }

    loginMutation.mutate(
      { phone, code },
      {
        onSuccess: (session) => onAuthenticated(session, phone),
        onError: (error) => showMessage(getErrorMessage(error, "登录失败，请稍后重试。"), { type: "error" })
      }
    );
  }

  return (
    <form className="grid w-full min-w-0 gap-[14px]" onSubmit={handleSubmit}>
        <div className="login-mode-switch flex justify-end">
          <button
            className="text-link-button inline-flex items-center gap-[4px]"
            onClick={() => {
              setCredentialMode(credentialMode === "code" ? "password" : "code");
              hideMessage();
            }}
            type="button"
          >
            <ArrowDownUp size={13} />
            {credentialMode === "code" ? "密码登录" : "验证码登录"}
          </button>
        </div>

        <label className={`login-field grid min-w-0 gap-[7px] ${isPhoneInvalid ? "missing" : ""}`}>
          <span>手机号</span>
          <div className="login-phone-input">
            <Smartphone size={18} />
            <input
              inputMode="numeric"
              maxLength={11}
              onChange={(event) => setPhone(normalizeByKey("phone", event.target.value))}
              placeholder="请输入手机号"
              value={phone}
            />
          </div>
          {isPhoneInvalid ? <em>{phoneValidation.message}</em> : null}
        </label>

        {credentialMode === "code" ? (
          <label className={`login-field grid min-w-0 gap-[7px] ${isCodeInvalid ? "missing" : ""}`}>
            <span>验证码</span>
            <div className="login-code-input">
              <KeyRound size={18} />
              <input
                inputMode="numeric"
                maxLength={6}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
                placeholder="请输入短信验证码"
                value={code}
              />
              <button className="login-inline-text-button" onClick={() => setCode(localAuthCode)} type="button">
                填入
              </button>
            </div>
            <em className="login-field-hint">体验模式短信未接入，验证码固定为 {localAuthCode}，点击"填入"自动填写。</em>
          </label>
        ) : (
          <label className={`login-field grid min-w-0 gap-[7px] ${isPasswordInvalid ? "missing" : ""}`}>
            <span>密码</span>
            <div className="login-password-input">
              <KeyRound size={18} />
              <input
                autoComplete="current-password"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="请输入登录密码"
                type="password"
                value={password}
              />
            </div>
            {isPasswordInvalid ? <em>密码至少需要 {localPasswordMinLength} 位。</em> : null}
          </label>
        )}

        <button
          aria-label={submitLabel}
          className="primary-button auth-submit-button full inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white disabled:text-[var(--h5-subtle)]"
          disabled={loginMutation.isPending}
          type="submit"
        >
          <ShieldCheck size={16} />
          {submitLabel}
        </button>
    </form>
  );
}
