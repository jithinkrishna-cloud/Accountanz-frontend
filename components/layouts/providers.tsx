"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { ApiError } from "@/lib/api-client";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            // Don't retry client errors (401/403/404/validation); retry transient failures once.
            retry: (count, err) => !(err instanceof ApiError && err.status >= 400 && err.status < 500) && count < 1,
          },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      {children}
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  );
}
