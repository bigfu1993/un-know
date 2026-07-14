/**
 * H5 运行时可能注入到 window 上的环境变量。
 */
export interface H5RuntimeGlobals {
  /**
   * 后端接口基础地址，未注入时使用本地默认地址。
   */
  __UNKNOWN_API_BASE_URL__?: string;
}

/**
 * 后端统一接口响应包装。
 */
export interface ApiEnvelope<T> {
  /** 业务状态码，OK 表示成功。 */
  code: string;
  /** 业务提示信息。 */
  message: string;
  /** 接口返回数据。 */
  data: T;
}

/**
 * 忘记密码完成后回填登录表单的凭据结果。
 */
export interface PasswordResetResult {
  /** 完成密码重置的手机号。 */
  phone: string;
  /** 本地保存后的登录密码。 */
  password: string;
}

/**
 * 登录页入口组件属性。
 */
export interface LoginProps {
  /**
   * 完成登录、角色确认和必要资料补充后的回调。
   */
  onLoginSuccess: (session: LoginResponse) => void;
}

/**
 * 登录页外壳组件属性。
 */
export interface LoginShellProps {
  /** 页面主体内容。 */
  children: ReactNode;
  /** 关闭页面级提示的回调。 */
  onToastClose: () => void;
  /** 页面级提示元信息。 */
  toast: MessageToastState | null;
}

/**
 * 登录表单组件属性。
 */
export interface LoginFormProps {
  /** 忘记密码完成后的回填结果。 */
  passwordResetResult?: PasswordResetResult | null;
  /**
   * 完成登录后的业务回调。
   */
  onAuthenticated: (session: LoginResponse, phone: string) => void;
  /**
   * 进入忘记密码流程的业务回调。
   */
  onForgotPassword: (phone?: string) => void;
}

/**
 * 注册表单组件属性。
 */
export interface RegisterFormProps {
  /**
   * 完成注册后的业务回调。
   */
  onRegistered: (session: LoginResponse, phone: string) => void;
}

/**
 * 登录注册卡片组件属性。
 */
export interface LoginRegisterCardProps {
  /** 忘记密码完成后的登录凭据结果。 */
  passwordResetResult?: PasswordResetResult | null;
  /**
   * 完成登录后的业务回调。
   */
  onAuthenticated: (session: LoginResponse, phone: string) => void;
  /**
   * 进入忘记密码流程的业务回调。
   */
  onForgotPassword: (phone?: string) => void;
  /**
   * 完成注册后的业务回调。
   */
  onRegistered: (session: LoginResponse, phone: string) => void;
}

/**
 * 忘记密码卡片组件属性。
 */
export interface PasswordResetCardProps {
  /** 从登录表单带入的初始手机号。 */
  initialPhone?: string;
  /** 返回登录注册入口的回调。 */
  onBack: () => void;
  /**
   * 密码重置完成后的业务回调。
   */
  onCompleted: (result: PasswordResetResult) => void;
}

/**
 * 注册角色选择组件属性。
 */
export interface RegistrationRoleSelectionProps {
  /** 返回登录注册入口的回调。 */
  onBack: () => void;
  /** 确认注册角色的回调。 */
  onSelect: (role: Role) => void;
}

/**
 * 注册资料补充组件属性。
 */
export interface RegistrationProfileStepProps {
  /** 注册临时会话令牌，用于确认最终角色。 */
  accessToken: string;
  /** 注册流程对应的手机号，用于读取草稿和保存本地密码。 */
  ownerPhone: string;
  /** 当前选择角色。 */
  role: Role;
  /** 返回角色选择的回调。 */
  onBack: () => void;
  /** 角色确认和资料补充完成后的业务回调。 */
  onCompleted: (session: LoginResponse) => void;
}

/**
 * 注册后资料表单展示组件属性。
 */
export interface RegistrationProfileCompletionProps {
  /** 可选区域列表。 */
  areaOptions: string[];
  /** 生日字段值。 */
  birthday: string;
  /** 资料草稿。 */
  draft: ProfileDraftState;
  /** 是否正在提交。 */
  isSubmitting?: boolean;
  /** 昵称字段值。 */
  nickname: string;
  /** 登录密码字段值。 */
  password: string;
  /** 重复密码字段值。 */
  passwordConfirm: string;
  /** 资料字段变化回调。 */
  onChange: (key: string, value: string) => void;
  /** 返回上一步回调。 */
  onBack: () => void;
  /** 生日字段变化回调。 */
  onBirthdayChange: (birthday: string) => void;
  /** 昵称字段变化回调。 */
  onNicknameChange: (nickname: string) => void;
  /** 密码字段变化回调。 */
  onPasswordChange: (password: string) => void;
  /** 重复密码字段变化回调。 */
  onPasswordConfirmChange: (passwordConfirm: string) => void;
  /** 提交表单回调。 */
  onSubmit: () => void;
  /** 当前角色。 */
  role: Role;
  /** 当前角色显示文案。 */
  roleLabel: string;
  /** 当前角色的资料补充模板。 */
  template: ProfileRequirementTemplate;
}
