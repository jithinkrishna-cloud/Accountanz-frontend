"use client";

import { ArrowRight, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { KpiCard } from "@/components/shared/kpi-card";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPeriod, humanize } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useFirmProgress } from "../hooks/use-progress";
import { useQueryState } from "../hooks/use-query-state";
import type { FirmClient } from "../types/progress.types";
import { PeriodSelect } from "./period-select";

const ROLE_SHORT: Record<string, string> = { cfo: "CFO", finance_manager: "FM", reviewer: "Reviewer", bookkeeper: "Bookkeeper" };

function Panel({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="bg-card min-w-0 rounded-xl border shadow-xs">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b px-5 py-4">
        <div>
          <h2 className="font-medium">{title}</h2>
          {subtitle && <p className="text-muted-foreground text-xs">{subtitle}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

const Num = ({ v, warn }: { v: number; warn?: boolean }) => (
  <span className={cn("tabular-nums", v === 0 ? "text-muted-foreground" : warn && "text-destructive font-medium")}>{v}</span>
);

/** "3 / 18 approved" with a thin bar. */
function MonthBar({ done, total }: { done: number; total: number }) {
  if (total === 0) return <span className="text-muted-foreground text-xs">No tasks</span>;
  const pct = Math.round((done / total) * 100);
  return (
    <div className="min-w-28">
      <div className="bg-muted h-1.5 overflow-hidden rounded-full" role="img" aria-label={`${pct}% approved`}>
        <div className="bg-primary h-full rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-muted-foreground mt-1 text-xs tabular-nums">{done} / {total} approved</p>
    </div>
  );
}

function PersonLink({ id, name }: { id: number; name: string }) {
  return <Link href={`/admin/progress/${id}`} className="hover:text-primary hover:underline">{name}</Link>;
}

/** Admin → Insights → Firm Progress: how every client's work is going this month, and each staff group's load. */
export function FirmProgressView() {
  const [monthParam, setMonth] = useQueryState("month", "");
  const [q, setQ] = useQueryState("q", "");
  const [attentionParam, setAttentionParam] = useQueryState("attention", "");
  const attention = attentionParam === "1";
  const setAttention = (on: boolean) => setAttentionParam(on ? "1" : "");
  const { data, isLoading, error, refetch } = useFirmProgress(monthParam || undefined);

  const clients = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (data?.clients ?? []).filter(
      (c: FirmClient) =>
        (!term || c.client_name.toLowerCase().includes(term) || c.team.some((m) => m.full_name.toLowerCase().includes(term))) &&
        (!attention || c.overdue > 0 || c.awaiting_review > 0),
    );
  }, [data, q, attention]);

  const header = (
    <PageHeader
      title="Firm Progress"
      description="How every client's work is going this month, and who is on it. Click a person to open their Individual Progress."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {data && <PeriodSelect value={data.period} periods={data.periods} onChange={setMonth} />}
          <Button variant="outline" asChild>
            <Link href="/admin/progress"><TrendingUp className="size-4" aria-hidden /> Individual Progress</Link>
          </Button>
        </div>
      }
    />
  );
  if (error) return <>{header}<ErrorState error={error} onRetry={() => void refetch()} /></>;
  if (isLoading || !data) {
    return (
      <>
        {header}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
        <Skeleton className="mt-6 h-96 rounded-xl" />
      </>
    );
  }

  const { totals } = data;
  const month = formatPeriod(data.period);
  const pct = totals.period_total ? Math.round((totals.period_approved / totals.period_total) * 100) : 0;

  return (
    <>
      {header}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label={`Approved · ${month}`}
          value={`${totals.period_approved} / ${totals.period_total}`}
          details={[{ label: "Done", value: `${pct}%` }]}
        />
        <Link href="/admin/tasks" className="rounded-xl focus-visible:ring-2 focus-visible:outline-none">
          <KpiCard
            className="hover:border-primary/40 h-full transition-colors"
            label="Open tasks"
            value={totals.open_tasks}
            details={[{ label: "Overdue", value: <span className={totals.overdue ? "text-destructive" : undefined}>{totals.overdue}</span> }]}
          />
        </Link>
        <Link href="/admin/reviews" className="rounded-xl focus-visible:ring-2 focus-visible:outline-none">
          <KpiCard
            className="hover:border-primary/40 h-full transition-colors"
            label="Waiting for review"
            value={totals.awaiting_review}
            details={[{ label: "Over 2 days", value: <span className={totals.awaiting_over_two_days ? "text-destructive" : undefined}>{totals.awaiting_over_two_days}</span> }]}
          />
        </Link>
        <Link href="/admin/closing" className="rounded-xl focus-visible:ring-2 focus-visible:outline-none">
          <KpiCard
            className="hover:border-primary/40 h-full transition-colors"
            label={`Month-end ready · ${month}`}
            value={`${totals.closing_done} / ${totals.active_clients}`}
            details={[{ label: "Active clients", value: totals.active_clients }]}
          />
        </Link>
      </div>

      <div className="mt-6" />
      <Panel
        title="Clients"
        subtitle={`Tasks for ${month}, open work today, and who is assigned.`}
        action={
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Checkbox id="attention" checked={attention} onCheckedChange={(v) => setAttention(v === true)} />
              <Label htmlFor="attention" className="text-sm font-normal">Needs attention only</Label>
            </div>
            <SearchInput value={q} onChange={setQ} placeholder="Search client or person" className="sm:w-56" />
          </div>
        }
      >
        {clients.length === 0 ? (
          <EmptyState title={q || attention ? "No clients match" : "No clients yet"} description={attention ? "Nothing is overdue or waiting for review." : undefined} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground text-left text-xs">
                <tr className="border-b">
                  <th className="px-5 py-3 font-medium">Client</th>
                  <th className="px-3 py-3 font-medium">Team</th>
                  <th className="px-3 py-3 font-medium">{month}</th>
                  <th className="px-3 py-3 text-right font-medium">Open</th>
                  <th className="px-3 py-3 text-right font-medium">Overdue</th>
                  <th className="px-3 py-3 text-right font-medium">Awaiting review</th>
                  <th className="px-5 py-3 font-medium">Month-end</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr key={c.client_id} className="border-b align-top last:border-b-0">
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link href={`/admin/clients/${c.client_id}`} className="font-medium hover:underline">{c.client_name}</Link>
                        {c.status !== "active" && <StatusBadge status={c.status} />}
                      </div>
                      <p className="text-muted-foreground text-xs">{c.package_name ?? "No active package"}</p>
                    </td>
                    <td className="px-3 py-3">
                      {c.team.length === 0 ? (
                        <Link href="/admin/assignments" className="text-warning text-xs font-medium hover:underline">Nobody assigned</Link>
                      ) : (
                        <ul className="space-y-0.5 text-xs">
                          {c.team.map((m) => (
                            <li key={`${m.user_id}-${m.team_role}`} className="whitespace-nowrap">
                              <PersonLink id={m.user_id} name={m.full_name} />
                              <span className="text-muted-foreground"> · {ROLE_SHORT[m.team_role] ?? humanize(m.team_role)}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td className="px-3 py-3"><MonthBar done={c.period_approved} total={c.period_total} /></td>
                    <td className="px-3 py-3 text-right"><Num v={c.open_tasks} /></td>
                    <td className="px-3 py-3 text-right"><Num v={c.overdue} warn /></td>
                    <td className="px-3 py-3 text-right"><Num v={c.awaiting_review} /></td>
                    <td className="px-5 py-3"><StatusBadge status={c.closing_status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <div className="mt-6" />
      <Panel
        title="Staff groups"
        subtitle={`Each group's combined work: open and overdue today, approved in ${month}.`}
        action={
          <Link href="/admin/groups" className="text-primary inline-flex items-center gap-1 text-sm font-medium hover:underline">
            Manage groups <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        }
      >
        {data.groups.length === 0 ? (
          <EmptyState title="No staff groups" description="Create groups under People → Groups to compare teams." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground text-left text-xs">
                <tr className="border-b">
                  <th className="px-5 py-3 font-medium">Group</th>
                  <th className="px-3 py-3 font-medium">Members</th>
                  <th className="px-3 py-3 text-right font-medium">Open</th>
                  <th className="px-3 py-3 text-right font-medium">Overdue</th>
                  <th className="px-3 py-3 text-right font-medium">Awaiting review</th>
                  <th className="px-5 py-3 text-right font-medium">Approved ({month})</th>
                </tr>
              </thead>
              <tbody>
                {data.groups.map((g) => (
                  <tr key={g.group_id ?? "none"} className="border-b align-top last:border-b-0">
                    <td className={cn("px-5 py-3 font-medium", g.group_id == null && "text-muted-foreground")}>{g.name}</td>
                    <td className="px-3 py-3 text-xs">
                      {g.members.map((m, i) => (
                        <span key={m.user_id}>{i > 0 && ", "}<PersonLink id={m.user_id} name={m.full_name} /></span>
                      ))}
                    </td>
                    <td className="px-3 py-3 text-right"><Num v={g.open_tasks} /></td>
                    <td className="px-3 py-3 text-right"><Num v={g.overdue} warn /></td>
                    <td className="px-3 py-3 text-right"><Num v={g.awaiting_review} /></td>
                    <td className="px-5 py-3 text-right"><Num v={g.approved} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}
