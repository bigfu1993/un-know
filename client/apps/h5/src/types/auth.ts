/** H5 宿主页暴露的运行时全局变量，用于覆盖接口地址。 */
export type H5RuntimeGlobals = typeof globalThis & {
  __UNKNOWN_API_BASE_URL__?: string;
};

/** H5 本地请求使用的最小后端响应包。 */
export interface ApiEnvelope<T> {
  code: string;
  message: string;
  data?: T;
}

/** 登录页入口属性。 */
export interface LoginProps {
  onLoginSuccess: (session: import("@unknown/domain").LoginResponse) => void;
}

/** 登录流程组件属性。 */
export type LoginFlowProps = LoginProps;

/** 登录页统一外壳属性。 */
export interface LoginShellProps {
  children: import("react").ReactNode;
  onToastClose: () => void;
  toast: import("@app-types/message-toast").MessageToastState | null;
}

/** 登录页顶部引导卡片属性。 */
export interface LoginGuideCardProps {
  defaultCode: string;
}

/** 登录表单属性。 */
export interface LoginFormProps {
  code: string;
  defaultCode: string;
  isAuthPending: boolean;
  loginCredentialMode: import("@app-types/app").LoginCredentialMode;
  password: string;
  phone: string;
  onCodeChange: (code: string) => void;
  onFillDefaultCode: () => void;
  onForgotPassword: () => void;
  onLoginCredentialModeChange: (mode: import("@app-types/app").LoginCredentialMode) => void;
  onPasswordChange: (password: string) => void;
  onPhoneChange: (phone: string) => void;
  onSubmit: (event: import("react").FormEvent<HTMLFormElement>) => void;
}

/** 注册表单属性。 */
export interface RegisterFormProps {
  code: string;
  defaultCode: string;
  invitationCode: string;
  isAuthPending: boolean;
  phone: string;
  onCodeChange: (code: string) => void;
  onFillDefaultCode: () => void;
  onInvitationCodeChange: (invitationCode: string) => void;
  onPhoneChange: (phone: string) => void;
  onSubmit: (event: import("react").FormEvent<HTMLFormElement>) => void;
}

/** H5 本地重置密码表单属性。 */
export interface PasswordResetCardProps {
  code: string;
  defaultCode: string;
  password: string;
  passwordConfirm: string;
  phone: string;
  onBack: () => void;
  onCodeChange: (code: string) => void;
  onFillDefaultCode: () => void;
  onPasswordChange: (password: string) => void;
  onPasswordConfirmChange: (passwordConfirm: string) => void;
  onPhoneChange: (phone: string) => void;
  onSubmit: (event: import("react").FormEvent<HTMLFormElement>) => void;
}

/** 注册后必选角色面板属性。 */
export interface RegistrationRoleSelectionProps {
  isPending: boolean;
  onBack: () => void;
  onSelect: (role: import("@unknown/domain").Role) => void;
}

/** 注册资料补充步骤属性。 */
export interface RegistrationProfileStepProps {
  birthday: string;
  draft: import("@app-types/profile").ProfileDraftState;
  isSubmitting: boolean;
  nickname: string;
  password: string;
  passwordConfirm: string;
  role: import("@unknown/domain").Role;
  template: import("@app-types/profile").ProfileRequirementTemplate;
  onBack: () => void;
  onBirthdayChange: (birthday: string) => void;
  onChange: (key: keyof import("@app-types/profile").ProfileDraftState, value: string) => void;
  onNicknameChange: (nickname: string) => void;
  onPasswordChange: (password: string) => void;
  onPasswordConfirmChange: (passwordConfirm: string) => void;
  onSubmit: () => void;
}

/** H5 登录/注册卡片组件使用的属性。 */
export interface LoginRegisterCardProps {
  authMode: import("@app-types/app").AuthMode;
  code: string;
  defaultCode: string;
  invitationCode: string;
  isAuthPending: boolean;
  loginCredentialMode: import("@app-types/app").LoginCredentialMode;
  password: string;
  phone: string;
  onAuthModeChange: (mode: import("@app-types/app").AuthMode) => void;
  onCodeChange: (code: string) => void;
  onFillDefaultCode: () => void;
  onForgotPassword: () => void;
  onInvitationCodeChange: (invitationCode: string) => void;
  onLoginCredentialModeChange: (mode: import("@app-types/app").LoginCredentialMode) => void;
  onPasswordChange: (password: string) => void;
  onPhoneChange: (phone: string) => void;
  onSubmit: (event: import("react").FormEvent<HTMLFormElement>) => void;
}
