/** 登录页统一外壳，负责承载消息提示和当前登录步骤内容。 */
export function LoginShell({ children, onToastClose, toast }: LoginShellProps) {
  return (
    <main className="login-shell mx-auto grid min-h-screen w-full max-w-[540px] content-center gap-[14px] overflow-hidden px-[14px] py-[28px] text-[#17212b]">
      <MessageToast onClose={onToastClose} toast={toast} />
      {children}
    </main>
  );
}
