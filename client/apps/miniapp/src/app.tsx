import { PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./app.css";

const queryClient = new QueryClient();
const apiBaseUrl = typeof __UNKNOWN_API_BASE_URL__ === "string" ? __UNKNOWN_API_BASE_URL__ : "";

if (apiBaseUrl) {
  (globalThis as typeof globalThis & { __UNKNOWN_API_BASE_URL__?: string }).__UNKNOWN_API_BASE_URL__ = apiBaseUrl;
}

export default function App({ children }: PropsWithChildren) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
