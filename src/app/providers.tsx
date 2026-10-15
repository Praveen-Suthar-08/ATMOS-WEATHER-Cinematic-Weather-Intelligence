import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Retries are handled (bounded, with backoff) inside the API service layer.
      retry: false,
      refetchOnWindowFocus: false,
      // Sensible defaults for a weather app viewed by many concurrent users:
      // data stays "fresh" for 5 minutes (hooks override up to 10–120 minutes),
      // and cached entries are kept for 30 minutes so repeat views of a city
      // cost zero network requests.
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
    },
  },
});

export function AppProviders({ children }: PropsWithChildren) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
