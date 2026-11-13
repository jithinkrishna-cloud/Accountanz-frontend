"use client";

import { CheckCircle2, Circle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { FilterSelect } from "@/components/shared/filter-select";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { type OverrideRequest, ReadyOverrideDialog } from "@/features/closing/components/ready-override-dialog";
import { applyApiError } from "@/lib/form-errors";
import { formatPeriod } from "@/lib/format";
import { useChecklist, useSetReadiness } from "../hooks/use-workspace";
import type { ChecklistItem } from "../types/workspace.types";

function Check({ done, label, href }: { done: boolean; label: string; href?: string }) {
  const Icon = done ? CheckCircle2 : Circle;
  return (
    <li className="flex items-start gap-2 text-sm">
      <Icon className={done ? "mt-0.5 size-4 shrink-0 text-emerald-600" : "text-muted-foreground mt-0.5 size-4 shrink-0"} aria-hidden />
      <span className={done ? "text-muted-foreground" : undefined}>
        {href && !done ? <Link href={href} className="hover:underline">{label}</Link> : label}
        <span className="sr-only">{done ? " (done)" : " (not done)"}</span>
      </span>
    </li>
  );
}

function ClientChecklist({ item, period }: { item: ChecklistItem; period: string }) {
  const setReadiness = useSetReadiness();
  const [override, setOverride] = useState<OverrideRequest | null>(null);
  const change = async (status: "open" | "ready") => {
    if (status === "ready" && !item.complete) {
      setOverride({ clientName: item.client_name, periodLabel: formatPeriod(period), missing: item.missing });
      return;
    }
    try {
      await setReadiness.mutateAsync({ clientId: item.client_id, period, status });
      toast.success(status === "ready" ? `${item.client_name} marked ready for closing` : `${item.client_name} set back to open`);
    } catch (err) {
      applyApiError(err);
    }
  };
  const confirmOverride = async (reason: string) => {
    await setReadiness.mutateAsync({ clientId: item.client_id, period, status: "ready", reason });
    toast.success(`${item.client_name} marked ready with a recorded reason`);
  };
  return (
    <li className="bg-card flex flex-col rounded-xl border p-5 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <Link href={`/team/clients/${item.client_id}`} className="min-w-0 truncate font-medium hover:underline">{item.client_name}</Link>
        <StatusBadge status={item.closing_status} />
      </div>
      <ul className="mt-4 space-y-2">
        <Check done={item.done.tasks} href="/team/queue" label={item.tasks_total === 0 ? "No tasks for this month yet" : `Tasks approved: ${item.tasks_approved} of ${item.tasks_total}${item.tasks_submitted ? ` (${item.tasks_submitted} awaiting review)` : ""}`} />
        <Check done={item.done.documents} href="/team/documents" label={item.open_requests ? `${item.open_requests} document request${item.open_requests === 1 ? "" : "s"} outstanding` : "All requested documents received"} />
        <Check done={item.done.approvals} href="/team/approvals" label={item.pending_approvals ? `${item.pending_approvals} client approval${item.pending_approvals === 1 ? "" : "s"} pending` : "No approvals pending"} />
        <Check done={item.done.reports} href="/team/reports" label={item.reports_published ? `${item.reports_published} report${item.reports_published === 1 ? "" : "s"} published` : item.reports_draft ? `${item.reports_draft} report draft${item.reports_draft === 1 ? "" : "s"}, not published` : "No report published"} />
      </ul>
      {item.ready_override && item.closing_status !== "open" && (
        <p className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <span className="font-medium">Marked ready with open items:</span> {item.ready_override}
        </p>
      )}
      <div className="mt-auto pt-4">
        {item.closing_status === "closed" ? (
          <p className="text-muted-foreground text-xs">Closed by an admin. Tasks for this month are locked.</p>
        ) : !item.can_review ? (
          <p className="text-muted-foreground text-xs">A reviewer on this client marks the month ready; an admin closes it.</p>
        ) : item.closing_status === "ready" ? (
          <Button variant="outline" size="sm" disabled={setReadiness.isPending} onClick={() => void change("open")}>Not ready yet</Button>
        ) : (
          <Button size="sm" variant={item.complete ? "default" : "outline"} disabled={setReadiness.isPending} onClick={() => void change("ready")}>
            {item.complete ? "Mark ready for closing" : "Mark ready with a reason…"}
          </Button>
        )}
      </div>
      <ReadyOverrideDialog request={override} pending={setReadiness.isPending} onConfirm={confirmOverride} onClose={() => setOverride(null)} />
    </li>
  );
}

export function ClosingChecklist() {
  const [period, setPeriod] = useState<string>();
  const { data, isLoading, error, refetch } = useChecklist(period);
  const shown = data?.period ?? period;
  const ready = data?.items.filter((i) => i.closing_status !== "open").length ?? 0;

  return (
    <>
      <PageHeader
        title="Month-End Closing"
        description={data ? `${formatPeriod(data.period)} · ${ready} of ${data.items.length} client${data.items.length === 1 ? "" : "s"} ready or closed` : "What's left before each client's month can close."}
        actions={data && <FilterSelect allLabel={formatPeriod(data.periods[0]!)} value={period && period !== data.periods[0] ? period : undefined} onChange={setPeriod} options={data.periods.slice(1).map((p) => ({ value: p, label: formatPeriod(p) }))} />}
      />
      {error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : isLoading || !data || !shown ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-56 rounded-xl" />)}</div>
      ) : data.items.length === 0 ? (
        <div className="bg-card rounded-xl border"><EmptyState title="No clients to close" description="Clients you're assigned to that are onboarding or active appear here." /></div>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{data.items.map((i) => <ClientChecklist key={i.client_id} item={i} period={shown} />)}</ul>
      )}
    </>
  );
}
