"use client";

import { Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatINR, humanize } from "@/lib/format";
import { usePackages } from "../hooks/use-catalogue";
import type { ServicePackage } from "../types/service.types";
import { PackageFormDialog } from "./package-form-dialog";
import { PACKAGE_ROLE_INFO } from "../types/service.types";

export function PackageList() {
  const { data, isLoading, error, refetch } = usePackages();
  const [editing, setEditing] = useState<ServicePackage | null | undefined>(undefined);

  return (
    <>
      <PageHeader
        title="Packages"
        description="Bundled services with a monthly fee and scope."
        actions={<Button onClick={() => setEditing(null)}><Plus className="size-4" /> Add package</Button>}
      />
      {error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">{[0, 1].map((i) => <Skeleton key={i} className="h-48 rounded-xl" />)}</div>
      ) : !data?.length ? (
        <div className="bg-card rounded-xl border"><EmptyState title="No packages yet" description="Create a package from your services." /></div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.map((p) => (
            <article key={p.id} className="bg-card flex flex-col rounded-xl border p-5 shadow-xs">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{p.name}</h2>
                  <p className="text-muted-foreground text-sm">{p.description}</p>
                </div>
                <Button variant="ghost" size="icon" aria-label={`Edit ${p.name}`} onClick={() => setEditing(p)}><Pencil className="size-4" /></Button>
              </div>
              <p className="mt-4 text-2xl font-semibold tabular-nums">
                {formatINR(p.monthly_fee)} <span className="text-muted-foreground text-sm font-normal">· {humanize(p.billing_cycle)}</span>
              </p>
              {p.scope_notes && <p className="text-muted-foreground mt-2 text-sm">{p.scope_notes}</p>}
              <p className="text-muted-foreground mt-2 text-xs">Team: {p.team_roles.map((r) => PACKAGE_ROLE_INFO[r].label).join(" · ")}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {p.services.map((s) => <span key={s.id} className="bg-accent text-accent-foreground rounded-md px-2 py-0.5 text-xs font-medium">{s.name}</span>)}
              </div>
              <div className="mt-4 border-t pt-3">
                <StatusBadge status={p.is_active ? "active" : "paused"} label={p.is_active ? "Available" : "Not offered"} />
              </div>
            </article>
          ))}
        </div>
      )}
      <PackageFormDialog open={editing !== undefined} onOpenChange={(o) => !o && setEditing(undefined)} pkg={editing ?? undefined} />
    </>
  );
}
