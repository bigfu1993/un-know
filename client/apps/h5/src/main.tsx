const queryClient = new QueryClient();
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;

if (apiBaseUrl) {
  (globalThis as typeof globalThis & { __UNKNOWN_API_BASE_URL__?: string }).__UNKNOWN_API_BASE_URL__ = apiBaseUrl;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
);
