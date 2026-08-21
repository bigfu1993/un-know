import { BottomTabs, PageShell, ProfileContextCard } from "@components/AppShell";
import { FloatingActions } from "@pages/home/auth";
import { HuntingCertification } from "@pages/home/auth/components/Mine/components/HuntingCertification";
import { TutorCertification } from "@pages/home/auth/components/Mine/components/TutorCertification";
import { Orders } from "@pages/orders";
import { Wallet } from "@pages/wallet";
import { getErrorMessage, showMessage } from "@tools/messageToast";
import { Outlet } from "react-router-dom";
import { useHomeRuntimeContext } from "./provider";

/** Home 布局，维护主模块公共区域并通过 Outlet 渲染当前二级模块。 */
export function HomePage() {
  const { home, layout, navigation, pages } = useHomeRuntimeContext();

  if (navigation.activePage && navigation.pageMeta) {
    return (
      <PageShell eyebrow={navigation.pageMeta.eyebrow} onBack={navigation.handleBack} title={navigation.pageMeta.title}>
        {navigation.activePage === "wallet" ? (
          <Wallet walletRecords={pages.walletRecords} walletSummary={pages.walletSummary} />
        ) : navigation.activePage === "orders" ? (
          <Orders
            onRepublishDelegation={(order) => void layout.handleHuntingTaskFulfillmentAction(order, "republish")}
            orders={pages.orderDetailOrders}
          />
        ) : navigation.activePage === "tutorCertification" ? (
          <TutorCertification
            onBack={navigation.handleBack}
            onSubmitError={(error) =>
              showMessage(getErrorMessage(error, "家教认证提交失败，请稍后重试。"), { type: "error" })
            }
            onSubmitted={pages.handleTutorCertificationSubmitted}
          />
        ) : navigation.activePage === "huntingCertification" ? (
          <HuntingCertification
            onBack={navigation.handleBack}
            onSubmitError={(error) =>
              showMessage(getErrorMessage(error, "狩猎认证提交失败，请稍后重试。"), { type: "error" })
            }
            onSubmitted={pages.handleHuntingCertificationSubmitted}
          />
        ) : null}
      </PageShell>
    );
  }

  return (
    <>
      <ProfileContextCard onOpenCompletion={home.handleOpenProfileCompletion} requirement={home.profileRequirement} />

      <Outlet />

      <FloatingActions {...home.floatingActionsProps} />

      <BottomTabs activeTab={navigation.activeTab} onChange={home.handleOpenTab} />
    </>
  );
}
