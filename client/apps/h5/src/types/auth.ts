/** H5 登录/注册卡片组件使用的属性。 */
export interface LoginRegisterCardProps {
  authMode: import("./app").AuthMode;
  code: string;
  defaultCode: string;
  invitationCode: string;
  isAuthPending: boolean;
  loginCredentialMode: import("./app").LoginCredentialMode;
  password: string;
  phone: string;
  onAuthModeChange: (mode: import("./app").AuthMode) => void;
  onCodeChange: (code: string) => void;
  onFillDefaultCode: () => void;
  onForgotPassword: () => void;
  onInvitationCodeChange: (invitationCode: string) => void;
  onLoginCredentialModeChange: (mode: import("./app").LoginCredentialMode) => void;
  onPasswordChange: (password: string) => void;
  onPhoneChange: (phone: string) => void;
  onSubmit: (event: import("react").FormEvent<HTMLFormElement>) => void;
}
