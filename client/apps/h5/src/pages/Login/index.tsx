/** Login/register route: owns auth form state and registration profile handoff. */
export function Login({
  initialRole,
  onLoginSuccess
}: {
  initialRole: Role;
  onLoginSuccess: (session: LoginResponse) => void;
}) {
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [loginRole, setLoginRole] = useState<Role>(initialRole);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [pendingRegisterSession, setPendingRegisterSession] = useState<LoginResponse | null>(null);
  const [registrationDraft, setRegistrationDraft] = useState<ProfileDraftState>({});
  const { toast, showMessage, hideMessage } = useMessageToast();
  const loginMutation = useClientLogin();
  const registerMutation = useClientRegister();

  const registrationTemplate = pendingRegisterSession
    ? registrationProfileTemplates[pendingRegisterSession.role]
    : null;

  function handleRegisterSuccess(session: LoginResponse) {
    const storedDraft = getStoredProfileDraft();
    const template = registrationProfileTemplates[session.role];
    const nextDraft = Object.fromEntries(template.fields.map((field) => [field.key, storedDraft[field.key] ?? ""]));

    setRegistrationDraft(nextDraft);
    setPendingRegisterSession(session);
    showMessage("注册成功，请补充资料或跳过后直接进入。", { type: "success" });
  }

  function completeRegistration(shouldSaveProfile: boolean) {
    if (!pendingRegisterSession) {
      return;
    }

    if (shouldSaveProfile) {
      setStoredProfileDraft({
        ...getStoredProfileDraft(),
        ...getFilledProfileDraft(registrationDraft)
      });
    }

    setStoredClientAuthSession(pendingRegisterSession);
    onLoginSuccess(pendingRegisterSession);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    hideMessage();

    if (!phonePattern.test(phone)) {
      showMessage("请输入正确的手机号。", { type: "warning" });
      return;
    }
    if (code !== "123456") {
      showMessage("本地联调验证码固定为 123456。", { type: "warning" });
      return;
    }

    const payload = { phone, code, role: loginRole };
    if (authMode === "register") {
      registerMutation.mutate(payload, {
        onSuccess: handleRegisterSuccess,
        onError: (error) => showMessage(getErrorMessage(error, "注册失败，请稍后重试。"), { type: "error" })
      });
      return;
    }

    loginMutation.mutate(payload, {
      onSuccess: (session) => {
        setStoredClientAuthSession(session);
        onLoginSuccess(session);
      },
      onError: (error) => showMessage(getErrorMessage(error, "登录失败，请稍后重试。"), { type: "error" })
    });
  }

  if (pendingRegisterSession && registrationTemplate) {
    return (
      <main className="login-shell mx-auto grid min-h-screen w-full max-w-[540px] content-center gap-[14px] overflow-hidden px-[14px] py-[28px] text-[#17212b]">
        <MessageToast onClose={hideMessage} toast={toast} />
        <RegistrationProfileCompletion
          areaOptions={campusAreaOptions}
          draft={registrationDraft}
          onChange={(key, value) => setRegistrationDraft((draft) => ({ ...draft, [key]: value }))}
          onSkip={() => completeRegistration(false)}
          onSubmit={() => completeRegistration(true)}
          roleLabel={roleLabels[pendingRegisterSession.role]}
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
            <span>手机号登录，本地验证码 123456</span>
          </div>
        </div>
        <p className="login-tip m-0 text-[13px] leading-[1.5] text-[#657181]">
          使用手机号和验证码登录；注册时选择学生、商户或家长身份，登录后进入对应客户端。
        </p>
      </section>
      <LoginRegisterCard
        authMode={authMode}
        code={code}
        isAuthPending={isAuthPending}
        loginRole={loginRole}
        onAuthModeChange={setAuthMode}
        onCodeChange={setCode}
        onFillDefaultCode={() => setCode("123456")}
        onPhoneChange={setPhone}
        onRoleChange={setLoginRole}
        onSubmit={handleSubmit}
        phone={phone}
        roles={roles}
      />
    </main>
  );
}
