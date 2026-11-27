"use client";

import { ArrowLeft, CircleCheck, Undo2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { KpiCard } from "@/components/shared/kpi-card";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart } from "@/features/analytics/components/bar-chart";
import { ROLE_LABELS } from "@/lib/constants";
import { formatDate, formatLocalDateTime, formatPeriod, humanize } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PortalRole } from "@/types/auth";
import { usePersonProgress } from "../hooks/use-progress";
import { PeriodSelect } from "./period-select";

function Panel({ title, subtitle, children, className }: { title: string; subtitle?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("bg-card min-w-0 rounded-xl border shadow-xs", className)}>
      <header className="border-b px-5 py-4">
        <h2 className="font-medium">{title}</h2>
        {subtitle && <p className="text-muted-foreground text-xs">{subtitle}</p>}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

const shortMonth = (p: string) => formatPeriod(p).split(" ")[0]!;
const Num = ({ v, warn }: { v: number; warn?: boolean }) => (
  <span className={cn("tabular-nums", v === 0 ? "text-muted-foreground" : warn && "text-destructive font-medium")}>{v}</span>
);

/** Admin → Individual Progress → one person: workload today, output for the month, per-client work, trend and recent reviews. */
export function PersonProgressView({ id }: { id: number }) {
  const [period, setPeriod] = useState<string>();
  const { data, isLoading, error, refetch } = usePersonProgress(id, period);

  const back = (
    <Link href="/admin/progress" className="text-muted-foreground mb-4 inline-flex items-center gap-1 text-sm hover:underline">
      <ArrowLeft className="size-4" /> Individual Progress
    </Link>
  );
  if (error) return <>{back}<ErrorState error={error} onRetry={() => void refetch()} /></>;
  if (isLoading || !data) {
    return (
      <>
        {back}
        <Skeleton className="mb-6 h-8 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
      </>
    );
  }

  const { person: p, clients, trend, open_tasks, recent_reviews } = data;
  const month = formatPeriod(data.period);
  const profileHref = `/admin/${p.staff_type === "accountant" ? "accountants" : "employees"}/${p.user_id}`;

  return (
    <>
      {back}
      <PageHeader
        title={p.full_name}
        description={`${ROLE_LABELS[p.portal_role as PortalRole] ?? humanize(p.portal_role)} · ${p.email}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <PeriodSelect value={data.period} periods={data.periods} onChange={setPeriod} />
            <Button variant="outline" asChild><Link href={profileHref}>Profile</Link></Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Open tasks"
          value={p.open_tasks}
          details={[
            { label: "Overdue", value: <span className={p.overdue ? "text-destructive" : undefined}>{p.overdue}</span> },
            { label: "Awaiting review", value: p.awaiting_review },
          ]}
        />
        <KpiCard
          label={`Approved · ${month}`}
          value={p.approved}
          details={[
            { label: "Returned", value: p.returned },
            { label: "Approval rate", value: p.approval_rate == null ? "—" : `${p.approval_rate}%` },
          ]}
        />
        <KpiCard label={`Hours logged · ${month}`} value={p.hours} />
        <KpiCard label="Clients" value={p.active_clients} details={[{ label: "Tasks to review", value: p.to_review }]} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Panel title="Approved tasks" subtitle="Last 6 months.">
          <BarChart title="Approved tasks per month" bars={trend.map((t) => ({ key: t.month, label: shortMonth(t.month), value: t.approved }))} format={(v) => String(v)} />
        </Panel>
        <Panel title="Hours logged" subtitle="Last 6 months.">
          <BarChart title="Hours logged per month" bars={trend.map((t) => ({ key: t.month, label: shortMonth(t.month), value: t.hours }))} format={(v) => `${v} h`} />
        </Panel>
      </div>

      <Panel title="By client" subtitle={`Their own tasks on each client they're assigned to. "${month}" counts tasks for that period.`} className="mt-6">
        {clients.length === 0 ? (
          <EmptyState title="No active assignments" description="Assign them to a client from Assignments." />
        ) : (
          <div className="-mx-5 -my-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground text-left text-xs">
                <tr className="border-b">
                  <th className="px-5 py-3 font-medium">Client</th>
                  <th className="px-3 py-3 font-medium">Role</th>
                  <th className="px-3 py-3 text-right font-medium">{month}</th>
                  <th className="px-3 py-3 text-right font-medium">Open</th>
                  <th className="px-3 py-3 text-right font-medium">Overdue</th>
                  <th className="px-5 py-3 text-right font-medium">Awaiting review</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr key={c.client_id} className="border-b last:border-b-0">
                    <td className="px-5 py-3"><Link href={`/admin/clients/${c.client_id}`} className="font-medium hover:underline">{c.client_name}</Link></td>
                    <td className="text-muted-foreground px-3 py-3">{c.roles.map(humanize).join(", ")}</td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {c.period_total === 0 ? <span className="text-muted-foreground">—</span> : `${c.period_approved} / ${c.period_total} approved`}
                    </td>
                    <td className="px-3 py-3 text-right"><Num v={c.open_tasks} /></td>
                    <td className="px-3 py-3 text-right"><Num v={c.overdue} warn /></td>
                    <td className="px-5 py-3 text-right"><Num v={c.awaiting_review} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel title="Work in hand" subtitle={open_tasks.length >= 50 ? "First 50, overdue first." : "Overdue first, then by due date."}>
          {open_tasks.length === 0 ? (
            <EmptyState title="Nothing open" description="All their tasks are approved." />
          ) : (
            <ul className="-my-2 max-h-[32rem] divide-y overflow-y-auto pr-1">
              {open_tasks.map((t) => (
                <li key={t.id} className="flex items-start justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{t.title}</p>
                    <p className="text-muted-foreground truncate text-xs">{t.client_name} · {formatPeriod(t.period)}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <StatusBadge status={t.status} />
                    {t.due_date && (
                      <span className={cn("text-xs", t.overdue ? "text-destructive font-medium" : "text-muted-foreground")}>
                        {t.overdue ? "Overdue · " : "Due "}{formatDate(t.due_date)}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Recent reviews" subtitle="The latest decisions on their work.">
          {recent_reviews.length === 0 ? (
            <EmptyState title="No reviews yet" />
          ) : (
            <ul className="-my-2 divide-y">
              {recent_reviews.map((r) => (
                <li key={r.id} className="py-2.5">
                  <div className="flex items-start gap-2">
                    {r.decision === "approved" ? (
                      <CircleCheck className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-label="Approved" />
                    ) : (
                      <Undo2 className="text-warning mt-0.5 size-4 shrink-0" aria-label="Returned" />
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{r.task_title}</p>
                      <p className="text-muted-foreground text-xs">
                        {r.decision === "approved" ? "Approved" : "Returned"}
                        {r.reviewer_name && ` by ${r.reviewer_name}`} · {r.client_name} · {formatLocalDateTime(r.created_at)}
                      </p>
                      {r.comments && <p className="text-muted-foreground mt-1 line-clamp-2 text-xs italic">&ldquo;{r.comments}&rdquo;</p>}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
