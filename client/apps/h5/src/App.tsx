/**
 * Page metadata for stack-based secondary surfaces.
 * Routed pages own their page headers in pages/*.
 */
function getPageMeta(page: PageSurface, role: Role) {
  if (page === "mine") {
    return { title: "我的", eyebrow: roleLabels[role] };
  }
  if (page === "wallet") {
    return { title: "钱包详情", eyebrow: "可提现与观察期账户" };
  }
  if (page === "orders") {
    return { title: "订单详情", eyebrow: "订单与配送" };
  }
  return { title: "设置", eyebrow: "账户与绑定信息" };
}

/**
 * Application shell: owns auth, role-level data loading, routing, and global dialogs.
 * Module-specific state should stay in pages/* or components/*.
 */
export function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [authSession, setAuthSession] = useState<LoginResponse | null>(() => getStoredClientAuthSession());
  const [role, setRole] = useState<Role>(() => getStoredClientAuthSession()?.role ?? "student");
  const [activeTab, setActiveTab] = useState<ClientModuleKey>(() =>
    getDefaultPrimaryTab(authSession?.role ?? "student")
  );
  const [pageStack, setPageStack] = useState<PageSurface[]>([]);
  const [isOngoingOpen, setIsOngoingOpen] = useState(false);
  const [isMineOpen, setIsMineOpen] = useState(false);
  const { hideMessage, showMessage, toast } = useMessageToast();
  const [checkout, setCheckout] = useState<CheckoutState | null>(null);
  const [profileDraft, setProfileDraft] = useState<ProfileDraftState>(() => getStoredProfileDraft());
  const [isProfileCompletionOpen, setIsProfileCompletionOpen] = useState(false);
  const isAuthenticated = authSession !== null;
  // Role-level data is shared across routes; page-local filters stay inside page modules.
  const { data: homeData, error: homeError, isLoading: isHomeLoading } = useClientHome(role, isAuthenticated);
  const {
    data: workspaceResponse,
    error: workspaceError,
    isLoading: isWorkspaceLoading
  } = useClientWorkspace(role, isAuthenticated);
  const purchaseMutation = usePurchaseProduct();

  const roleOrders = useMemo(
    () => (workspaceResponse?.orders ?? []).filter((order) => order.role === role),
    [workspaceResponse?.orders, role]
  );
  const hasPaymentRisk = roleOrders.some((order) => order.risk === "payment");
  const activeDescription =
    clientPrimaryTabs[role].find((tab) => tab.key === activeTab)?.description ?? getRoleHint(role);
  const profileRequirement = getProfileRequirement(role, activeTab, profileDraft);
  const profileCompletionTemplate = getProfileRequirementTemplate(role, activeTab);
  const activePage = pageStack.length > 0 ? pageStack[pageStack.length - 1] : null;
  const dataError = homeError ?? workspaceError;
  const isInitialDataLoading = isHomeLoading || isWorkspaceLoading;

  function handleLoginSuccess(session: LoginResponse) {
    setAuthSession(session);
    setRole(session.role);
    setActiveTab(getDefaultPrimaryTab(session.role));
    setPageStack([]);
    setIsOngoingOpen(false);
    setIsMineOpen(false);
    setIsProfileCompletionOpen(false);
    setProfileDraft(getStoredProfileDraft());
    showMessage(session.profileCompletionRequired ? "登录成功，可稍后进入设置补充资料。" : "登录成功。", {
      type: "success"
    });
    setCheckout(null);
    navigate(getDefaultRouteForRole(session.role), { replace: true });
  }

  function handleLogout() {
    clearStoredClientAuthSession();
    setAuthSession(null);
    setRole("student");
    setActiveTab(getDefaultPrimaryTab("student"));
    setPageStack([]);
    setIsOngoingOpen(false);
    setIsMineOpen(false);
    setIsProfileCompletionOpen(false);
    hideMessage();
    setCheckout(null);
    navigate("/login", { replace: true });
  }

  function handleOpenTab(tab: ClientModuleKey) {
    setActiveTab(tab);
    setPageStack([]);
    setIsOngoingOpen(false);
    setIsMineOpen(false);
    setIsProfileCompletionOpen(false);
    navigate(getRouteForTab(tab));
  }

  function handleNavigate(page: PageSurface) {
    if (page === "settings" || page === "mine") {
      navigate(page === "settings" ? "/settings" : "/mine");
      setPageStack([]);
      setIsMineOpen(false);
      setIsOngoingOpen(false);
      setIsProfileCompletionOpen(false);
      return;
    }

    setPageStack((stack) => [...stack, page]);
    setIsMineOpen(false);
    setIsOngoingOpen(false);
    setIsProfileCompletionOpen(false);
  }

  function handleBack() {
    setPageStack((stack) => stack.slice(0, -1));
    setIsMineOpen(false);
    setIsProfileCompletionOpen(false);
  }

  // Checkout is guarded here because profile completion is a cross-module flow.
  function handleOpenCheckout(product: ProductSummary) {
    const featuredRequirement = getProfileRequirement(role, "featured", profileDraft);

    if (featuredRequirement) {
      showMessage(`请先补充${featuredRequirement.missingFields.map((field) => field.label).join("、")}`, {
        type: "warning"
      });
      setIsProfileCompletionOpen(true);
      return;
    }

    setCheckout({
      product,
      deliveryMode: getDefaultDeliveryMode(role, product),
      paymentMethod: "wechat"
    });
  }

  function handleProfileDraftChange(key: string, value: string) {
    setProfileDraft((draft) => ({
      ...draft,
      [key]: value
    }));
  }

  function handleSaveProfileDraft() {
    try {
      setStoredProfileDraft(profileDraft);
      setIsProfileCompletionOpen(false);
      showMessage("资料已保存，当前模块可以继续操作。", { type: "success" });
    } catch {
      showMessage("资料保存失败，请检查浏览器存储权限。", { type: "error" });
    }
  }

  function handleOpenProfileCompletion() {
    setIsMineOpen(false);
    setIsOngoingOpen(false);
    setIsProfileCompletionOpen(true);
  }

  // Delegation owns the online toggle; App only answers whether the user may go online.
  function handleRequestHuntingOnline() {
    const huntingRequirement = getProfileRequirement(role, "hunting", profileDraft);

    if (huntingRequirement) {
      showMessage(`请先补充${huntingRequirement.missingFields.map((field) => field.label).join("、")}`, {
        type: "warning"
      });
      setIsProfileCompletionOpen(true);
      return false;
    }

    return true;
  }

  function handleSubmitPurchase() {
    if (!checkout) {
      return;
    }

    purchaseMutation.mutate(
      {
        productId: checkout.product.id,
        role,
        deliveryMode: checkout.deliveryMode,
        paymentMethod: checkout.paymentMethod,
        quantity: 1
      },
      {
        onSuccess: (order) => {
          showMessage(
            `订单 ${order.orderId} 已创建，状态：${order.status}，应付 ${formatCurrency(order.payableAmount)}。`,
            {
              type: "success"
            }
          );
          setCheckout(null);
          handleNavigate("orders");
        },
        onError: (error) => {
          showMessage(getErrorMessage(error, "购买失败，请稍后重试。"), { type: "error" });
        }
      }
    );
  }

  const profileName = homeData?.profile.name ?? roleLabels[role];
  const accountStatus = homeData ? accountStatusLabels[homeData.profile.accountStatus] : "正常";
  const creditScore = homeData?.profile.creditScore ?? 0;
  const pageMeta = activePage ? getPageMeta(activePage, role) : null;
  const isSettingsRoute = location.pathname === "/settings";
  const isMineRoute = location.pathname === "/mine";

  // Browser routes drive the active module; activeTab mirrors only primary module routes.
  useEffect(() => {
    if (!isAuthenticated) {
      if (location.pathname !== "/login") {
        navigate("/login", { replace: true });
      }
      return;
    }

    if (location.pathname === "/" || location.pathname === "/login") {
      navigate(getDefaultRouteForRole(role), { replace: true });
      return;
    }

    const routeTab = getTabFromRoute(location.pathname);
    if (routeTab && routeTab !== activeTab) {
      setActiveTab(routeTab);
      setPageStack([]);
      setIsMineOpen(false);
      setIsOngoingOpen(false);
      setIsProfileCompletionOpen(false);
    }
  }, [activeTab, isAuthenticated, location.pathname, navigate, role]);

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<Login initialRole={role} onLoginSuccess={handleLoginSuccess} />} />
        <Route path="*" element={<Navigate replace to="/login" />} />
      </Routes>
    );
  }

  if (dataError) {
    return (
      <main className="login-shell mx-auto grid min-h-screen max-w-[540px] content-center gap-[14px] px-[14px] py-[28px] text-[#17212b]">
        <section className="login-card grid gap-[14px] p-[16px]">
          <div className="card-title flex items-center justify-between gap-[10px] min-w-0 ">
            <AlertCircle size={18} />
            <strong>真实接口连接失败</strong>
          </div>
          <p className="notice mt-[12px] p-[12px] text-[#61420d] danger">
            {dataError instanceof Error ? dataError.message : "请检查后端服务和云数据库连接。"}
          </p>
          <button
            className="primary-button inline-flex min-h-[34px] items-center justify-center gap-[5px] px-[10px] py-[8px] text-white disabled:text-[#748092] w-full full"
            onClick={handleLogout}
            type="button"
          >
            <LogOut size={16} />
            退出并重新登录
          </button>
        </section>
      </main>
    );
  }

  if (!homeData || !workspaceResponse || isInitialDataLoading) {
    return (
      <main className="login-shell mx-auto grid min-h-screen max-w-[540px] content-center gap-[14px] px-[14px] py-[28px] text-[#17212b]">
        <section className="login-card grid gap-[14px] p-[16px]">
          <div className="card-title flex items-center justify-between gap-[10px] min-w-0 ">
            <ShieldCheck size={18} />
            <strong>正在加载云端真实数据</strong>
          </div>
          <p className="login-tip m-0 text-[13px] leading-[1.5] text-[#657181]">
            正在读取 PostgreSQL 中的首页、商品、订单、钱包和工作台数据。
          </p>
        </section>
      </main>
    );
  }

  const workspaceData = workspaceResponse;

  return (
    <main
      className={`h5-shell mx-auto min-h-screen max-w-[540px] px-[14px] pt-[14px] text-[#17212b] ${
        activePage || isSettingsRoute || isMineRoute
          ? "page-mode pb-[28px]"
          : "pb-[calc(92px+env(safe-area-inset-bottom))]"
      }`}
    >
      <MessageToast onClose={hideMessage} toast={toast} />
      {activePage && pageMeta ? (
        <PageShell eyebrow={pageMeta.eyebrow} onBack={handleBack} title={pageMeta.title}>
          {activePage === "wallet" ? (
            <Wallet walletRecords={workspaceData.walletRecords} walletSummary={workspaceData.walletSummary} />
          ) : activePage === "orders" ? (
            <Orders orders={roleOrders} />
          ) : null}
        </PageShell>
      ) : isMineRoute ? (
        <Mine
          role={role}
          onBack={() => navigate(getRouteForTab(activeTab), { replace: true })}
          onNavigate={handleNavigate}
        />
      ) : isSettingsRoute ? (
        <SettingsView role={role} onBack={() => navigate(getRouteForTab(activeTab), { replace: true })} />
      ) : (
        <>
          <Header activeTab={activeTab} role={role} />

          <ProfileContextCard
            description={activeDescription}
            onOpenCompletion={handleOpenProfileCompletion}
            requirement={profileRequirement}
            role={role}
          />

          <Routes>
            <Route
              path="/featured"
              element={
                <Featured
                  onOpenCheckout={handleOpenCheckout}
                  purchasePending={purchaseMutation.isPending}
                  role={role}
                />
              }
            />
            <Route
              path="/part-time"
              element={
                <PartTime dashboard={workspaceData.merchantDashboard} jobs={workspaceData.partTimeJobs} role={role} />
              }
            />
            <Route
              path="/delegation"
              element={
                <Delegation
                  huntingSummary={workspaceData.huntingSummary}
                  huntingTasks={workspaceData.huntingTasks}
                  onRequestOnline={handleRequestHuntingOnline}
                />
              }
            />
            <Route
              path="/merchant-sales"
              element={
                <MerchantSales
                  dashboard={workspaceData.merchantDashboard}
                  merchantProducts={workspaceData.merchantProducts}
                />
              }
            />
            <Route path="/marketing" element={<Marketing />} />
            <Route path="/tutor" element={<Tutor tutorDemands={workspaceData.tutorDemands} />} />
            <Route path="*" element={<Navigate replace to={getDefaultRouteForRole(role)} />} />
          </Routes>

          {isMineOpen ? (
            <MinePopover
              accountStatus={accountStatus}
              creditScore={creditScore}
              onClose={() => setIsMineOpen(false)}
              onLogout={handleLogout}
              onNavigate={handleNavigate}
              onOpenTab={handleOpenTab}
              profileName={profileName}
              role={role}
              walletSummary={workspaceData.walletSummary}
            />
          ) : null}

          {roleOrders.length > 0 ? (
            <button
              className={`order-shortcut grid h-[46px] w-[46px] place-items-center font-extrabold text-white ${hasPaymentRisk ? "danger" : ""}`}
              onClick={() => {
                setIsOngoingOpen(true);
                setIsMineOpen(false);
              }}
              type="button"
            >
              <PackageCheck size={18} />
              {roleOrders.length}
            </button>
          ) : null}

          <button
            className="floating-avatar grid h-[54px] w-[54px] place-items-center text-[#17212b]"
            onClick={() => setIsMineOpen((value) => !value)}
            type="button"
          >
            <UserRound size={22} />
          </button>

          <BottomTabs role={role} activeTab={activeTab} onChange={handleOpenTab} />
        </>
      )}

      {isOngoingOpen ? (
        <OngoingOrdersDialog
          onClose={() => setIsOngoingOpen(false)}
          onOpenOrders={() => {
            setIsOngoingOpen(false);
            handleNavigate("orders");
          }}
          orders={roleOrders}
        />
      ) : null}

      {checkout ? (
        <CheckoutSheet
          checkout={checkout}
          onClose={() => setCheckout(null)}
          onDeliveryChange={(deliveryMode) => setCheckout((value) => (value ? { ...value, deliveryMode } : value))}
          onPaymentChange={(paymentMethod) => setCheckout((value) => (value ? { ...value, paymentMethod } : value))}
          onSubmit={handleSubmitPurchase}
          purchasePending={purchaseMutation.isPending}
          role={role}
        />
      ) : null}

      {isProfileCompletionOpen && profileCompletionTemplate ? (
        <ProfileCompletionDialog
          onChange={handleProfileDraftChange}
          onClose={() => setIsProfileCompletionOpen(false)}
          onSave={handleSaveProfileDraft}
          profileDraft={profileDraft}
          template={profileCompletionTemplate}
        />
      ) : null}
    </main>
  );
}
