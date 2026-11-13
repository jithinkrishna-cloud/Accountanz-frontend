"use client";

import { Building2 } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { humanize } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useMyClients } from "../hooks/use-workspace";

function Stat({ n, label, alert }: { n: number; label: string; alert?: boolean }) {
  return (
    <div>
      <p className={cn("text-lg font-semibold", alert && n > 0 && "text-destructive")}>{n}</p>
      <p className="text-muted-foreground text-xs">{label}</p>
    </div>
  );
}

export function MyClients() {
  const { data, isLoading, error, refetch } = useMyClients();
  return (
    <>
      <PageHeader title="My Clients" description="Companies you're assigned to today, with what's open on each." />
      {error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-44 rounded-xl" />)}</div>
      ) : !data?.length ? (
        <div className="bg-card rounded-xl border"><EmptyState title="No clients assigned" description="An admin assigns you to clients in Assignments. Access starts on the assignment's start date." /></div>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.map((c) => (
            <li key={c.id}>
              <Link href={`/team/clients/${c.id}`} className="bg-card hover:border-primary/40 block h-full rounded-xl border p-5 shadow-xs transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg"><Building2 className="size-4" aria-hidden /></span>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{c.name}</p>
                      <p className="text-muted-foreground truncate text-xs">{c.package_name ?? "No active package"}</p>
                    </div>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
                <p className="text-muted-foreground mt-3 text-xs">My role: {c.roles ? c.roles.split(",").map(humanize).join(", ") : "Admin access"}</p>
                <div className="mt-4 grid grid-cols-4 gap-2 border-t pt-4">
                  <Stat n={c.open_tasks} label="Open tasks" />
                  <Stat n={c.overdue_tasks} label="Overdue" alert />
                  <Stat n={c.open_requests} label="Docs owed" />
                  <Stat n={c.awaiting_reply} label="To reply" alert />
                </div>
                <p className="text-muted-foreground mt-3 text-xs">This month: <StatusBadge status={c.closing_status} className="ml-1" /></p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
