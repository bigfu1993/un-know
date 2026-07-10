export interface LoginRegisterCardProps {
  authMode: import("./app").AuthMode;
  code: string;
  isAuthPending: boolean;
  loginRole: import("@unknown/domain").Role;
  phone: string;
  roles: import("@unknown/domain").Role[];
  onAuthModeChange: (mode: import("./app").AuthMode) => void;
  onCodeChange: (code: string) => void;
  onFillDefaultCode: () => void;
  onPhoneChange: (phone: string) => void;
  onRoleChange: (role: import("@unknown/domain").Role) => void;
  onSubmit: (event: import("react").FormEvent<HTMLFormElement>) => void;
}
