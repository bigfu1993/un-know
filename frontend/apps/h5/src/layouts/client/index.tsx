import { CheckoutProvider } from "@h5/overlays/checkout/provider";
import { GlobalOverlayHost } from "@h5/overlays/host";
import { PublishOverlayProvider } from "@h5/overlays/publish/provider";
import { TutorOverlayProvider } from "@h5/overlays/tutor/provider";
import { useHomeRuntimeContext } from "@pages/home/provider";
import { OngoingQuote } from "@pages/home/commission/components/OngoingQuote";
import { DataErrorScreen, InitialLoadingScreen } from "@pages/home/auth/components/AppStateScreens";
import { Navigate, Outlet } from "react-router-dom";

/** 登录后的 H5 公共布局，统一承载页面区域、全局 Overlay 和跨一级路由共享的业务 Provider。 */
export function ClientLayout() {
  const { home, layout, navigation, session } = useHomeRuntimeContext();

  if (!session.isAuthenticated) {
    return <Navigate replace to="/login" />;
  }

  if (session.dataError) {
    return <DataErrorScreen error={session.dataError} onLogout={session.handleLogout} />;
  }

  // 工作台聚合数据按消费场景加载，只有角色资料和地址簿阻塞首屏公共布局。
  if (!session.homeData || session.isInitialDataLoading) {
    return <InitialLoadingScreen />;
  }

  return (
    <CheckoutProvider
      currentAddressDraft={layout.currentAddressDraft}
      onOpenProfileCompletion={home.handleOpenProfileCompletion}
      onOrderCreated={() => navigation.handleNavigate("orders")}
      role={home.role}
    >
      <TutorOverlayProvider syncProfileDraft={layout.syncProfileDraft}>
        <PublishOverlayProvider
          addressItems={layout.addressItems}
          onBeforeOpen={layout.handleBeforeOpenPublish}
          onPublishedToTab={layout.handlePublishedToTab}
          refetchWorkspace={layout.refetchWorkspaceData}
        >
          <main
            className={`h5-shell mx-auto min-h-screen max-w-[540px] px-[14px] pt-[14px] text-[#17212b] ${
              navigation.activePage || navigation.isSettingsRoute || navigation.isMineRoute
                ? "page-mode pb-[28px]"
                : "pb-[calc(92px+env(safe-area-inset-bottom))]"
            } ${
              navigation.activeTab === "hunting" &&
              !navigation.activePage &&
              !navigation.isSettingsRoute &&
              !navigation.isMineRoute
                ? "commission-shell"
                : ""
            } ${layout.isPrimaryListShell ? "list-shell" : ""} ${
              layout.hasPrimaryContextCard ? "has-context-card" : "no-context-card"
            }`}
          >
            <Outlet />

            {layout.ongoingQuoteTask ? (
              <OngoingQuote
                initialQuoteId={layout.ongoingQuoteInitialQuoteId}
                onClose={layout.handleCloseOngoingQuoteList}
                onConfirmQuote={layout.handleConfirmHuntingQuote}
                onCounterQuote={layout.handleCounterHuntingQuote}
                onRejectQuote={layout.handleRejectHuntingQuote}
                task={layout.ongoingQuoteTask}
              />
            ) : null}

            <GlobalOverlayHost />

            {layout.isProfileCompletionOpen && layout.profileCompletionTemplate ? (
              <ProfileCompletion
                isSaving={layout.isProfileSaving}
                onChange={layout.handleProfileDraftChange}
                onClose={() => layout.setIsProfileCompletionOpen(false)}
                onSave={layout.handleSaveProfileDraft}
                profileDraft={layout.profileDraft}
                template={layout.profileCompletionTemplate}
              />
            ) : null}
          </main>
        </PublishOverlayProvider>
      </TutorOverlayProvider>
    </CheckoutProvider>
  );
}
