import "./index.less";
import { hasStoredPendingRegistration, setStoredPendingRegistration } from "@shared/clientPageModel";
import { LoginForm } from "./components/LoginForm";
import { LoginRegisterCard } from "./components/LoginRegisterCard";
import { LoginShell } from "./components/LoginShell";
import { PasswordResetCard } from "./components/PasswordResetCard";
import { RegisterForm } from "./components/RegisterForm";
import { RegistrationProfileStep } from "./components/RegistrationProfileStep";
import { RegistrationRoleSelection } from "./components/RegistrationRoleSelection";

/** 登录页入口，负责登录后跨步骤业务流转、注册角色确认和资料补充流程装配。 */
export function Login({ onLoginSuccess }: LoginProps) {
  const [pendingRegisterSession, setPendingRegisterSession] = useState<LoginResponse | null>(null);
  const [pendingRegisterPhone, setPendingRegisterPhone] = useState("");
  const [selectedRegisterRole, setSelectedRegisterRole] = useState<Role | null>(null);
  const [isPasswordResetOpen, setIsPasswordResetOpen] = useState(false);
  const [passwordResetInitialPhone, setPasswordResetInitialPhone] = useState("");
  const [passwordResetResult, setPasswordResetResult] = useState<PasswordResetResult | null>(null);
  const { toast, showMessage, hideMessage } = useMessageToast();

  /** 暂存新注册会话，直到用户完成强制角色选择。 */
  function handleRegisterSuccess(session: LoginResponse, rawPhone: string) {
    setStoredPendingRegistration(rawPhone);
    setPendingRegisterSession(session);
    setPendingRegisterPhone(rawPhone);
    setSelectedRegisterRole(null);
    showMessage("注册成功，请先选择角色。", { type: "success" });
  }

  /** 登录成功后，如存在未完成注册角色选择，则继续角色选择流程。 */
  function handleAuthenticatedSession(session: LoginResponse, rawPhone: string) {
    if (hasStoredPendingRegistration(rawPhone)) {
      setPendingRegisterSession(session);
      setPendingRegisterPhone(rawPhone);
      setSelectedRegisterRole(null);
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
    hideMessage();
  }

  /** 记录注册角色并打开资料草稿步骤。 */
  function handleRegistrationRoleSelect(role: Role) {
    setSelectedRegisterRole(role);
    showMessage("已选择角色，请填写昵称并设置登录密码。", { type: "success" });
  }

  /** 从注册资料页返回强制角色选择页。 */
  function handleBackToRegistrationRoleSelection() {
    setSelectedRegisterRole(null);
    hideMessage();
  }

  /** 根据当前流程状态渲染登录页内部步骤，外壳只在页面出口统一装配一次。 */
  function renderLoginContent() {
    if (isPasswordResetOpen) {
      return (
        <PasswordResetCard
          initialPhone={passwordResetInitialPhone}
          onBack={handleBackFromPasswordReset}
          onCompleted={handlePasswordResetCompleted}
        />
      );
    }

    if (pendingRegisterSession && !selectedRegisterRole) {
      return (
        <RegistrationRoleSelection
          onBack={handleCancelRegistrationFlow}
          onSelect={handleRegistrationRoleSelect}
        />
      );
    }

    if (pendingRegisterSession && selectedRegisterRole) {
      return (
        <RegistrationProfileStep
          accessToken={pendingRegisterSession.accessToken}
          ownerPhone={pendingRegisterPhone}
          onBack={handleBackToRegistrationRoleSelection}
          onCompleted={onLoginSuccess}
          role={selectedRegisterRole}
        />
      );
    }

    return (
      <LoginRegisterCard
        loginForm={
          <LoginForm
            passwordResetResult={passwordResetResult}
            onAuthenticated={handleAuthenticatedSession}
            onForgotPassword={handleOpenPasswordReset}
          />
        }
        registerForm={<RegisterForm onRegistered={handleRegisterSuccess} />}
      />
    );
  }

  return (
    <LoginShell onToastClose={hideMessage} toast={toast}>
      {renderLoginContent()}
    </LoginShell>
  );
}
