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
 * 忘记密码完成后用于自动登录的重置结果。
 */
export interface PasswordResetResult {
  /** 完成密码重置的手机号。 */
  phone: string;
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
 * 登录表单组件属性。
 */
export interface LoginFormProps {
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
  /** 登录表单插槽。 */
  loginForm: ReactNode;
  /** 注册表单插槽。 */
  registerForm: ReactNode;
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
  onCompleted: (result: PasswordResetResult) => Promise<void> | void;
}

/**
 * 注册后引导组件属性。
 */
export interface RegistrationGuideProps {
  /** 注册临时会话令牌，用于确认最终角色。 */
  accessToken: string;
  /** 注册流程对应的手机号，用于读取资料草稿和保存本地密码。 */
  ownerPhone: string;
  /** 返回登录注册入口的回调。 */
  onBack: () => void;
  /** 注册引导完成后的业务回调。 */
  onCompleted: (session: LoginResponse) => void;
}
