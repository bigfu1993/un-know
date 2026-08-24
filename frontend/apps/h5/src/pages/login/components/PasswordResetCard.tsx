import {
  localAuthCode,
  localPasswordMinLength,
  saveLocalPasswordCredential
} from "@tools/localAuth";
import { hideMessage, showMessage } from "@tools/messageToast";
import { normalizeByKey, validateByKey } from "@tools/validation";

/** 重置密码面板，内部维护重置表单并通过服务端接口完成校验和密码落库。 */
export function PasswordResetCard({ initialPhone = "", onBack, onCompleted }: PasswordResetCardProps) {
  const [phone, setPhone] = useState(initialPhone);
  const [code, setCode] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [verifyMode, setVerifyMode] = useState<PasswordResetVerifyMode>("code");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const resetPasswordMutation = useResetClientPassword();

  useEffect(() => {
    setPhone(initialPhone);
  }, [initialPhone]);

  /** 校验验证码或旧密码和新密码，成功后保存密码凭据并触发后续自动登录。 */
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    hideMessage();

    const phoneValidation = validateByKey("phone", phone, { label: "手机号", required: true });

    if (!phoneValidation.isValid) {
      showMessage(phoneValidation.message, { type: "warning" });
      return;
    }
    if (verifyMode === "password") {
      if (oldPassword.trim().length < localPasswordMinLength) {
        showMessage(`旧密码至少需要 ${localPasswordMinLength} 位。`, { type: "warning" });
        return;
      }
    }
    if (verifyMode === "code" && code !== localAuthCode) {
      showMessage(`本地联调验证码固定为 ${localAuthCode}。`, { type: "warning" });
      return;
    }
    if (password.trim().length < localPasswordMinLength) {
      showMessage(`新密码至少需要 ${localPasswordMinLength} 位。`, { type: "warning" });
      return;
    }
    if (password !== passwordConfirm) {
      showMessage("两次输入的新密码不一致。", { type: "warning" });
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPasswordMutation.mutateAsync({
        phone,
        verifyMode,
        code: verifyMode === "code" ? code : undefined,
        oldPassword: verifyMode === "password" ? oldPassword : undefined,
        password,
        passwordConfirm
      });
      await saveLocalPasswordCredential(phone, password);
      await onCompleted({ phone });
    } catch (error) {
      showMessage(getErrorMessage(error, "密码重置失败，请稍后重试。"), { type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="login-card password-reset-card grid w-full min-w-0 gap-[14px] p-[16px]" onSubmit={handleSubmit}>
      <div className="card-title flex min-w-0 items-center justify-start gap-[10px]">
        <ShieldCheck size={18} />
        <div className="min-w-0 flex-1">
          <strong>重置密码</strong>
          <span>通过验证码或旧密码校验后设置新密码。</span>
        </div>
      </div>

      <div className="login-method-tabs flex min-w-0 gap-[8px] p-[4px]" aria-label="选择重置校验方式">
        <button
          className={verifyMode === "code" ? "active" : ""}
          onClick={() => {
            setVerifyMode("code");
            hideMessage();
          }}
          type="button"
        >
          验证码
        </button>
        <button
          className={verifyMode === "password" ? "active" : ""}
          onClick={() => {
            setVerifyMode("password");
            hideMessage();
          }}
          type="button"
        >
          旧密码
        </button>
      </div>

      <label className="login-field grid min-w-0 gap-[7px]">
        <span>手机号</span>
        <div className="password-reset-phone-input">
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

      {verifyMode === "code" ? (
        <label className="login-field grid min-w-0 gap-[7px]">
          <span>验证码</span>
          <div className="password-reset-code-input">
            <KeyRound size={18} />
            <input
              inputMode="numeric"
              maxLength={6}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
              placeholder={`本地验证码 ${localAuthCode}`}
              value={code}
            />
            <button className="login-inline-text-button" onClick={() => setCode(localAuthCode)} type="button">
              填入
            </button>
          </div>
        </label>
      ) : null}

      {verifyMode === "password" ? (
        <label className="login-field grid min-w-0 gap-[7px]">
          <span>旧密码</span>
          <div className="password-reset-old-password-input">
            <KeyRound size={18} />
            <input
              autoComplete="current-password"
              onChange={(event) => setOldPassword(event.target.value)}
              placeholder="请输入旧密码"
              type="password"
              value={oldPassword}
            />
          </div>
        </label>
      ) : null}

      <label className="login-field grid min-w-0 gap-[7px]">
        <span>新密码</span>
        <div className="password-reset-new-password-input">
          <ShieldCheck size={18} />
          <input
            autoComplete="new-password"
            onChange={(event) => setPassword(event.target.value)}
            placeholder={`至少 ${localPasswordMinLength} 位`}
            type="password"
            value={password}
          />
        </div>
      </label>

      <label className="login-field grid min-w-0 gap-[7px]">
        <span>确认密码</span>
        <div className="password-reset-confirm-password-input">
          <ShieldCheck size={18} />
          <input
            autoComplete="new-password"
            onChange={(event) => setPasswordConfirm(event.target.value)}
            placeholder="再次输入新密码"
            type="password"
            value={passwordConfirm}
          />
        </div>
      </label>

      <p className="login-tip m-0 text-[13px] leading-[1.5] text-[var(--h5-muted)]">
        {verifyMode === "code"
          ? `短信发送暂未接入，本地联调验证码固定为 ${localAuthCode}。`
          : "旧密码会提交到真实接口校验，通过后再保存新密码。"}
      </p>

      <div className="password-reset-actions grid gap-[8px]">
        <button
          className="ghost-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-[var(--h5-muted)]"
          disabled={isSubmitting}
          onClick={onBack}
          type="button"
        >
          返回登录
        </button>
        <button
          className="primary-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white disabled:text-[var(--h5-subtle)]"
          disabled={isSubmitting}
          type="submit"
        >
          <CheckCircle2 size={16} />
          {isSubmitting ? "处理中" : "确认重置"}
        </button>
      </div>
    </form>
  );
}
