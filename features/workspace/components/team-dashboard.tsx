"use client";

import { AlertTriangle, CalendarClock, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { KpiCard } from "@/components/shared/kpi-card";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/features/auth/hooks/use-session";
import { TaskDetailSheet } from "@/features/tasks/components/task-detail-sheet";
import { formatDate, formatLocalDateTime, formatPeriod } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useWorkspaceDashboard } from "../hooks/use-workspace";

function Panel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="bg-card min-w-0 rounded-xl border shadow-xs">
      <header className="flex items-center justify-between gap-3 border-b px-5 py-4">
        <h2 className="font-medium">{title}</h2>
        {action}
      </header>
      {children}
    </section>
  );
}

export function TeamDashboard() {
  const { data: me } = useSession();
  const { data: d, isLoading, error, refetch } = useWorkspaceDashboard();
  const [openTask, setOpenTask] = useState<number | null>(null);
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;
  const c = d?.counts;

  const attention = c
    ? [
        { n: c.returned, label: "returned for correction", href: "/team/queue" },
        { n: c.awaiting_reply, label: "client messages waiting for a reply", href: "/team/messages" },
        { n: c.open_requests, label: "document requests outstanding", href: "/team/documents" },
        { n: c.pending_approvals, label: "client approvals pending", href: "/team/approvals" },
        { n: c.draft_reports, label: "report drafts not yet published", href: "/team/reports" },
      ].filter((a) => a.n > 0)
    : [];

  return (
    <>
      <PageHeader
        title={me ? `Good to see you, ${me.fullName.split(" ")[0]}` : "My Dashboard"}
        description={d ? `Your work across ${c!.clients} client${c!.clients === 1 ? "" : "s"} · ${formatPeriod(d.period)}` : "Your work across the clients you're assigned to."}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="My open tasks" value={c?.assigned ?? 0} loading={isLoading} details={c && [{ label: "Due in 7 days", value: c.due_week }]} />
        <KpiCard label="Overdue" value={<span className={cn(c?.overdue ? "text-destructive" : undefined)}>{c?.overdue ?? 0}</span>} loading={isLoading} />
        <KpiCard label="Waiting for my review" value={c?.to_review ?? 0} loading={isLoading} />
        <KpiCard label="My clients" value={c?.clients ?? 0} loading={isLoading} details={c && [{ label: "Documents outstanding", value: c.open_requests }]} />
      </div>

      {attention.length > 0 && (
        <div className="bg-card mt-6 rounded-xl border p-4 shadow-xs">
          <p className="mb-2 flex items-center gap-2 text-sm font-medium"><AlertTriangle className="size-4 text-amber-600" aria-hidden /> Needs your attention</p>
          <ul className="flex flex-wrap gap-2">
            {attention.map((a) => (
              <li key={a.href}>
                <Link href={a.href} className="hover:bg-muted inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm">
                  <span className="font-semibold">{a.n}</span> {a.label} <ChevronRight className="size-3.5" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <Panel title="Up next" action={<Link href="/team/queue" className="text-primary text-xs font-medium hover:underline">Work queue</Link>}>
            {isLoading ? (
              <div className="space-y-2 p-5"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
            ) : !d?.queue.length ? (
              <EmptyState title="You're all caught up" description="No open tasks are assigned to you." />
            ) : (
              <ul className="divide-y">
                {d.queue.map((t) => (
                  <li key={t.id}>
                    <button type="button" onClick={() => setOpenTask(t.id)} className="hover:bg-muted/50 flex w-full flex-wrap items-center justify-between gap-x-3 gap-y-1 px-5 py-3 text-left">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{t.title}</p>
                        <p className="text-muted-foreground truncate text-xs">{t.client_name} · {formatPeriod(t.period)}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className={cn("text-xs", t.overdue ? "text-destructive font-medium" : "text-muted-foreground")}>{t.due_date ? `${t.overdue ? "Overdue · " : "Due "}${formatDate(t.due_date)}` : "No due date"}</span>
                        <StatusBadge status={t.status} />
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
        <Panel title="Upcoming meetings" action={<Link href="/team/meetings" className="text-primary text-xs font-medium hover:underline">All meetings</Link>}>
          {isLoading ? (
            <div className="p-5"><Skeleton className="h-16 w-full" /></div>
          ) : !d?.meetings.length ? (
            <EmptyState title="No meetings scheduled" />
          ) : (
            <ul className="divide-y">
              {d.meetings.map((m) => (
                <li key={m.id} className="flex gap-3 px-5 py-3">
                  <CalendarClock className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden />
                  <div className="min-w-0 text-sm">
                    <p className="font-medium">{m.title}</p>
                    <p className="text-muted-foreground text-xs">{m.client_name} · {formatLocalDateTime(m.starts_at)}</p>
                    {m.meeting_link && <a href={m.meeting_link} target="_blank" rel="noopener noreferrer" className="text-primary text-xs hover:underline">Join</a>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
      <TaskDetailSheet portal="team" taskId={openTask} onClose={() => setOpenTask(null)} />
    </>
  );
}
