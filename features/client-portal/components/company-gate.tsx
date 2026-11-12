"use client";

import { Building2 } from "lucide-react";
import { ErrorState } from "@/components/shared/states";
import { Skeleton } from "@/components/ui/skeleton";
import { useCompany } from "../hooks/use-client-portal";
import type { PortalCompany } from "../types/client-portal.types";

/** Renders the page only once the user's company is known; otherwise the existing app's "no company" state. */
export function CompanyGate({ children }: { children: (company: PortalCompany) => React.ReactNode }) {
  const { data: company, isLoading, error, refetch } = useCompany();
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (isLoading) return <Skeleton className="h-40 w-full rounded-xl" />;
  if (!company) {
    return (
      <div className="bg-card flex flex-col items-center gap-2 rounded-xl border px-6 py-16 text-center">
        <Building2 className="text-muted-foreground size-8" aria-hidden />
        <h1 className="text-lg font-semibold">No company linked to your account yet</h1>
        <p className="text-muted-foreground max-w-md text-sm">
          Your Accountanz team links your login to your company once onboarding is complete. If you think this is a mistake, contact your accountant.
        </p>
      </div>
    );
  }
  return <>{children(company)}</>;
}
