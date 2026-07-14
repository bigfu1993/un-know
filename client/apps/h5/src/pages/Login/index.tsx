import "./index.less";
import { LoginFlow } from "./components/LoginFlow";

/** 登录页入口，仅负责装配登录流程组件和页面样式。 */
export function Login({ onLoginSuccess }: LoginProps) {
  return <LoginFlow onLoginSuccess={onLoginSuccess} />;
}
