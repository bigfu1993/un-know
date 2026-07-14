import react from "@vitejs/plugin-react";
import AutoImport from "unplugin-auto-import/vite";
import { defineConfig } from "vite";
import path from "node:path";

export default defineConfig({
  plugins: [
    react(),
    AutoImport({
      dts: path.resolve(__dirname, "src/auto-imports.d.ts"),
      dirs: ["src/components/**", "src/pages/**", "src/shared/**", "src/store/**", "src/tools/**", "src/types/*.ts"],
      imports: [
        "react",
        {
          "@h5/App": ["App"],
          "@tanstack/react-query": ["QueryClient", "QueryClientProvider"],
          "@unknown/api-client": [
            "clearStoredClientAuthSession",
            "getStoredClientAuthSession",
            "setStoredClientAuthSession"
          ],
          "@unknown/domain": [
            "accountStatusLabels",
            "clientPrimaryTabs",
            "clientPublishPlatformLabels",
            "deliveryModeLabels",
            "getDefaultPrimaryTab",
            "mineEntryLabels",
            "paymentMethodLabels",
            "roleLabels"
          ],
          "@unknown/hooks": [
            "useApplyTutorTrial",
            "useChatConversations",
            "useChatMessages",
            "useChatQuickActions",
            "useClientAddresses",
            "useClientHome",
            "useClientLogin",
            "useClientRegister",
            "useClientWorkspace",
            "useCreateChatConversation",
            "useCreateChatQuickAction",
            "useCreateClientAddress",
            "useCreateHuntingProject",
            "useDeleteClientAddress",
            "usePublishHuntingTask",
            "usePublishTutorDemand",
            "useProducts",
            "usePurchaseProduct",
            "useSendChatMessage",
            "useUpdateClientAddress",
            "useUpdateTutorExposure",
            "useUseClientAddress"
          ],
          "lucide-react": [
            "AlertCircle",
            "ArrowDownUp",
            "ArrowLeft",
            "BadgeCheck",
            "BriefcaseBusiness",
            "CalendarClock",
            "CheckCircle2",
            "ChevronRight",
            "CircleDollarSign",
            "ClipboardCheck",
            "Crosshair",
            "Filter",
            "GraduationCap",
            "Heart",
            "Home",
            "KeyRound",
            "LogOut",
            "Megaphone",
            "MessageCircle",
            "PackageCheck",
            "Plus",
            "Settings",
            "ShieldCheck",
            "ShoppingBag",
            "Smartphone",
            "Store",
            "Truck",
            "UserRound",
            "WalletCards",
            "XCircle"
          ],
          react: ["StrictMode"],
          "react-dom/client": ["createRoot"],
          "react-router-dom": ["BrowserRouter", "Navigate", "Route", "Routes", "useLocation", "useNavigate"]
        }
      ]
    })
  ],
  resolve: {
    alias: {
      "@h5": path.resolve(__dirname, "src"),
      "@components": path.resolve(__dirname, "src/components"),
      "@pages": path.resolve(__dirname, "src/pages"),
      "@shared": path.resolve(__dirname, "src/shared"),
      "@store": path.resolve(__dirname, "src/store"),
      "@tools": path.resolve(__dirname, "src/tools"),
      "@app-types": path.resolve(__dirname, "src/types"),
      "@unknown/api-client": path.resolve(__dirname, "../../packages/api-client/src"),
      "@unknown/domain": path.resolve(__dirname, "../../packages/domain/src"),
      "@unknown/hooks": path.resolve(__dirname, "../../packages/hooks/src"),
      "@unknown/ui-tokens": path.resolve(__dirname, "../../packages/ui-tokens/src")
    }
  },
  server: {
    host: "0.0.0.0",
    port: 5174
  },
  optimizeDeps: {
    exclude: ["@unknown/api-client", "@unknown/domain", "@unknown/hooks", "@unknown/ui-tokens"]
  },
  preview: {
    port: 4174
  }
});
