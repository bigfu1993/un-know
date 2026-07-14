import "./styles.less";
import { GlobalStoreProvider } from "@h5/store/GlobalStoreProvider";

const queryClient = new QueryClient();
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;

if (apiBaseUrl) {
  (globalThis as typeof globalThis & { __UNKNOWN_API_BASE_URL__?: string }).__UNKNOWN_API_BASE_URL__ = apiBaseUrl;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <GlobalStoreProvider>
      <QueryClientProvider client={queryClient}>
        <MessageToast />
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </GlobalStoreProvider>
  </StrictMode>
);
