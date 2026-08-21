import "./styles.less";
import { OverlayProvider } from "@h5/overlays/provider";

const queryClient = new QueryClient();
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;
const unknownGlobal = globalThis as typeof globalThis & {
  __UNKNOWN_API_BASE_URL__?: string;
  __UNKNOWN_VIEWPORT_GUARDS_INSTALLED__?: boolean;
};

if (apiBaseUrl) {
  unknownGlobal.__UNKNOWN_API_BASE_URL__ = apiBaseUrl;
}

const preventDefaultWhenCancelable = (event: Event) => {
  if (event.cancelable) {
    event.preventDefault();
  }
};

const installViewportInteractionGuards = () => {
  if (unknownGlobal.__UNKNOWN_VIEWPORT_GUARDS_INSTALLED__) {
    return;
  }

  unknownGlobal.__UNKNOWN_VIEWPORT_GUARDS_INSTALLED__ = true;

  let lastTouchEndAt = 0;

  document.addEventListener(
    "touchmove",
    (event) => {
      if (event.touches.length > 1) {
        preventDefaultWhenCancelable(event);
      }
    },
    { passive: false }
  );

  document.addEventListener(
    "touchend",
    (event) => {
      const now = Date.now();

      if (now - lastTouchEndAt <= 300) {
        preventDefaultWhenCancelable(event);
      }

      lastTouchEndAt = now;
    },
    { passive: false }
  );

  for (const eventName of ["gesturestart", "gesturechange", "gestureend"]) {
    window.addEventListener(eventName, preventDefaultWhenCancelable, { passive: false });
  }
};

installViewportInteractionGuards();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <MessageToast />
      <OverlayProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </OverlayProvider>
    </QueryClientProvider>
  </StrictMode>
);
