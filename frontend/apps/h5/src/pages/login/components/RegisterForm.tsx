import { localAuthCode } from "@tools/localAuth";
import { hideMessage, showMessage } from "@tools/messageToast";
import { normalizeByKey, validateByKey } from "@tools/validation";

/** 注册表单，内部维护手机号、验证码、邀请码和注册接口提交逻辑。 */
export function RegisterForm({ onRegistered }: RegisterFormProps) {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [invitationCode, setInvitationCode] = useState("");
  const registerMutation = useClientRegister();
  const submitLabel = registerMutation.isPending ? "注册中" : "注册";

  /** 校验注册输入并调用真实注册接口创建临时会话。 */
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
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

    const trimmedInvitationCode = invitationCode.trim();
    const registerPayload = trimmedInvitationCode
      ? { phone, code, invitationCode: trimmedInvitationCode }
      : { phone, code };

    registerMutation.mutate(registerPayload, {
      onSuccess: (session) => onRegistered(session, phone),
      onError: (error) => showMessage(getErrorMessage(error, "注册失败，请稍后重试。"), { type: "error" })
    });
  }

  return (
    <form className="grid w-full min-w-0 gap-[14px]" onSubmit={handleSubmit}>
        <label className="login-field grid min-w-0 gap-[7px]">
          <span>手机号</span>
          <div className="register-phone-input">
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
          <div className="register-code-input">
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
          <span>邀请码（选填）</span>
          <div className="register-invitation-input">
            <KeyRound size={18} />
            <input
              autoCapitalize="characters"
              maxLength={20}
              onChange={(event) => setInvitationCode(event.target.value.trim().toUpperCase())}
              placeholder="请输入邀请码"
              value={invitationCode}
            />
          </div>
        </label>

        <p className="login-tip m-0 text-[13px] leading-[1.5] text-[#657181]">
          本地联调验证码固定为 {localAuthCode}；注册成功后 token 会写入本地存储，后续请求自动携带。
        </p>

        <p className="login-tip m-0 text-[13px] leading-[1.5] text-[#657181]">
          注册成功后需要先选择角色，再补充基础信息后进入。
        </p>

        <button
          aria-label={submitLabel}
          className="primary-button auth-submit-button register-mode full inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white disabled:text-[#748092]"
          disabled={registerMutation.isPending}
          type="submit"
        >
          <ShieldCheck size={16} />
          {submitLabel}
        </button>
    </form>
  );
}
