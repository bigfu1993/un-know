import { localAuthCode, localPasswordMinLength, saveLocalPasswordCredential } from "@tools/localAuth";
import { normalizeByKey, validateByKey } from "@tools/validation";

/** 本地重置密码面板，内部维护重置表单和本地密码凭据保存逻辑。 */
export function PasswordResetCard({ initialPhone = "", onBack, onCompleted }: PasswordResetCardProps) {
  const [phone, setPhone] = useState(initialPhone);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast, showMessage, hideMessage } = useMessageToast();

  useEffect(() => {
    setPhone(initialPhone);
  }, [initialPhone]);

  /** 校验本地验证码和新密码，成功后保存本地密码凭据并回传结果。 */
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    hideMessage();

    const phoneValidation = validateByKey("phone", phone, { label: "手机号", required: true });

    if (!phoneValidation.isValid) {
      showMessage(phoneValidation.message, { type: "warning" });
      return;
    }
    if (code !== localAuthCode) {
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
      await saveLocalPasswordCredential(phone, password);
      onCompleted({ phone, password });
    } catch (error) {
      showMessage(getErrorMessage(error, "密码保存失败，请稍后重试。"), { type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <MessageToast onClose={hideMessage} toast={toast} />
      <form className="login-card password-reset-card grid w-full min-w-0 gap-[14px] p-[16px]" onSubmit={handleSubmit}>
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
              onChange={(event) => setPhone(normalizeByKey("phone", event.target.value))}
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
              onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
              placeholder={`本地验证码 ${localAuthCode}`}
              value={code}
            />
            <button onClick={() => setCode(localAuthCode)} type="button">
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
              onChange={(event) => setPassword(event.target.value)}
              placeholder={`至少 ${localPasswordMinLength} 位`}
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
              onChange={(event) => setPasswordConfirm(event.target.value)}
              placeholder="再次输入新密码"
              type="password"
              value={passwordConfirm}
            />
          </div>
        </label>

        <p className="login-tip m-0 text-[13px] leading-[1.5] text-[#657181]">
          短信发送暂未接入，本地联调验证码固定为 {localAuthCode}。
        </p>

        <div className="password-reset-actions grid gap-[8px]">
          <button
            className="ghost-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-[#475466]"
            disabled={isSubmitting}
            onClick={onBack}
            type="button"
          >
            返回登录
          </button>
          <button
            className="primary-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white disabled:text-[#748092]"
            disabled={isSubmitting}
            type="submit"
          >
            <CheckCircle2 size={16} />
            {isSubmitting ? "保存中" : "确认重置"}
          </button>
        </div>
      </form>
    </>
  );
}
