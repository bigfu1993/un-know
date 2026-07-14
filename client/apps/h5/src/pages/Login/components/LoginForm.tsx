import { getStoredPasswordCredential } from "@shared/clientPageModel";
import { localAuthCode, localPasswordMinLength, verifyLocalPasswordCredential } from "@tools/localAuth";
import { hideMessage, showMessage } from "@tools/messageToast";
import { normalizeByKey, validateByKey } from "@tools/validation";

/** 登录表单，内部维护验证码登录和本地密码登录所需的输入、校验和提交逻辑。 */
export function LoginForm({ onAuthenticated, onForgotPassword }: LoginFormProps) {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [credentialMode, setCredentialMode] = useState<LoginCredentialMode>("code");
  const [password, setPassword] = useState("");
  const loginMutation = useClientLogin();

  const submitLabel = loginMutation.isPending ? "登录中" : credentialMode === "password" ? "密码登录" : "验证码登录";

  /** 校验登录输入并通过真实登录接口创建会话。 */
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    hideMessage();

    const phoneValidation = validateByKey("phone", phone, { label: "手机号", required: true });

    if (!phoneValidation.isValid) {
      showMessage(phoneValidation.message, { type: "warning" });
      return;
    }

    const submittedPhone = phone;

    if (credentialMode === "password") {
      if (password.trim().length < localPasswordMinLength) {
        showMessage(`登录密码至少需要 ${localPasswordMinLength} 位。`, { type: "warning" });
        return;
      }

      try {
        const credential = getStoredPasswordCredential(submittedPhone);

        if (!credential) {
          showMessage("该手机号还未设置密码，请先使用验证码登录或注册后设置密码。", { type: "warning" });
          return;
        }

        const isPasswordValid = await verifyLocalPasswordCredential(submittedPhone, password);

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
          onSuccess: (session) => onAuthenticated(session, submittedPhone),
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
      { phone: submittedPhone, code },
      {
        onSuccess: (session) => onAuthenticated(session, submittedPhone),
        onError: (error) => showMessage(getErrorMessage(error, "登录失败，请稍后重试。"), { type: "error" })
      }
    );
  }

  return (
    <form className="grid w-full min-w-0 gap-[14px]" onSubmit={handleSubmit}>
        <div className="login-method-tabs flex min-w-0 gap-[8px] p-[4px]" aria-label="选择登录方式">
          <button
            className={credentialMode === "code" ? "active" : ""}
            onClick={() => {
              setCredentialMode("code");
              hideMessage();
            }}
            type="button"
          >
            验证码登录
          </button>
          <button
            className={credentialMode === "password" ? "active" : ""}
            onClick={() => {
              setCredentialMode("password");
              hideMessage();
            }}
            type="button"
          >
            密码登录
          </button>
        </div>

        <label className="login-field grid min-w-0 gap-[7px]">
          <span>手机号</span>
          <div>
            <Smartphone size={18} />
            <input
              inputMode="numeric"
              maxLength={11}
              onChange={(event) => setPhone(normalizeByKey("phone", event.target.value))}
              placeholder="请输入手机号"
              value={phone}
            />
          </div>
        </label>

        {credentialMode === "code" ? (
          <label className="login-field grid min-w-0 gap-[7px]">
            <span>验证码</span>
            <div>
              <KeyRound size={18} />
              <input
                inputMode="numeric"
                maxLength={6}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
                placeholder={`本地验证码 ${localAuthCode}`}
                value={code}
              />
              <button onClick={() => setCode(localAuthCode)} type="button">
                填入
              </button>
            </div>
          </label>
        ) : null}

        {credentialMode === "password" ? (
          <label className="login-field grid min-w-0 gap-[7px]">
            <span>密码</span>
            <div>
              <KeyRound size={18} />
              <input
                autoComplete="current-password"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="请输入登录密码"
                type="password"
                value={password}
              />
            </div>
          </label>
        ) : null}

        <p className="login-tip m-0 text-[13px] leading-[1.5] text-[#657181]">
          {credentialMode === "password"
            ? "密码会先在本地校验，测试环境继续使用现有登录接口进入。"
            : `本地联调验证码固定为 ${localAuthCode}；登录成功后 token 会写入本地存储，后续请求自动携带。`}
        </p>

        <p className="login-tip m-0 text-[13px] leading-[1.5] text-[#657181]">
          {credentialMode === "password"
            ? "未设置密码时可切换验证码登录，或注册后在补充页设置密码。"
            : "未注册手机号需要先切换到注册入口完成开户。"}
        </p>

        <button className="text-link-button justify-self-end" onClick={() => onForgotPassword(phone)} type="button">
          忘记密码？
        </button>

        <button
          aria-label={submitLabel}
          className="primary-button auth-submit-button full inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white disabled:text-[#748092]"
          disabled={loginMutation.isPending}
          type="submit"
        >
          <ShieldCheck size={16} />
          {submitLabel}
        </button>
    </form>
  );
}
