"use client";

import { AlertTriangle, ArrowRight, Clock } from "lucide-react";
import Link from "next/link";
import { KpiCard } from "@/components/shared/kpi-card";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/states";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatINR, formatPeriod } from "@/lib/format";
import { useAdminDashboard } from "../hooks/use-admin-dashboard";

function Panel({ title, icon, aside, children }: { title: string; icon: React.ReactNode; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="bg-card h-full rounded-xl border shadow-xs">
      <header className="flex items-center justify-between gap-3 border-b px-5 py-4">
        <h2 className="flex items-center gap-2 font-medium">
          {icon}
          {title}
        </h2>
        {aside}
      </header>
      {children}
    </section>
  );
}

export function AdminDashboardView() {
  const { data, isLoading, error, refetch } = useAdminDashboard();

  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;
  const loading = isLoading || !data;
  const period = data ? formatPeriod(data.period) : "—";

  return (
    <>
      <PageHeader
        title="Operations dashboard"
        description="Clients, engagements and the month-end workload at a glance."
        actions={<span className="bg-card rounded-full border px-3 py-1 text-xs font-medium">Period {period}</span>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-12">
        <KpiCard className="xl:col-span-3" loading={loading} label="Active clients" value={data?.clients.active}
          details={[{ label: "Onboarding", value: data?.clients.onboarding }, { label: "Paused", value: data?.clients.paused }]} />
        <KpiCard className="xl:col-span-3" loading={loading} label="Clients in onboarding" value={data?.clients.onboarding} details={[{ label: "Active", value: data?.clients.active }]} />
        <KpiCard className="xl:col-span-3" loading={loading} label="Active engagements" value={data?.engagements.active}
          details={[{ label: "Draft", value: data?.engagements.draft }, { label: "Sent", value: data?.engagements.sent }]} />
        <KpiCard className="xl:col-span-3" loading={loading} label="Overdue tasks" value={data?.tasks.overdue}
          details={[{ label: "Approved", value: data ? `${data.tasks.approved}/${data.tasks.total}` : "—" }]} />
        <KpiCard className="xl:col-span-4" loading={loading} label="Reviews waiting" value={data?.reviews.waiting} details={[{ label: "Over 2 days", value: data?.reviews.overTwoDays }]} />
        <KpiCard className="xl:col-span-4" loading={loading} label="Service revenue" value={formatINR(data?.revenue.billed)} details={[{ label: "Period", value: period }]} />
        <KpiCard className="sm:col-span-2 xl:col-span-4" loading={loading} label="Outstanding" value={formatINR(data?.revenue.outstanding)} details={[{ label: "Open invoices", value: data?.revenue.openInvoices }]} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <Panel
            title="Clients behind on closing"
            icon={<AlertTriangle className="text-warning size-4" aria-hidden />}
            aside={<span className="text-muted-foreground text-xs">Under 50% approved after day 20</span>}
          >
            {loading ? (
              <div className="p-5"><Skeleton className="h-4 w-2/3" /></div>
            ) : !data.closingCheckActive ? (
              <p className="text-muted-foreground p-5 text-sm">This check starts after day 20 of the period.</p>
            ) : data.behindOnClosing.length === 0 ? (
              <p className="text-muted-foreground p-5 text-sm">No client is behind — every current period is at least half approved.</p>
            ) : (
              <ul className="divide-y">
                {data.behindOnClosing.map((c) => (
                  <li key={c.client_id} className="flex items-center justify-between px-5 py-3 text-sm">
                    <Link href={`/admin/clients/${c.client_id}`} className="font-medium hover:underline">{c.client_name}</Link>
                    <span className="text-muted-foreground tabular-nums">{c.approved}/{c.total} approved</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="lg:col-span-2">
          <Panel
            title="Latest audit activity"
            icon={<Clock className="text-primary size-4" aria-hidden />}
            aside={
              <Link href="/admin/audit" className="text-primary flex items-center gap-1 text-xs font-medium hover:underline">
                All logs <ArrowRight className="size-3" />
              </Link>
            }
          >
            {loading ? (
              <div className="space-y-3 p-5">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : data.latestAudit.length === 0 ? (
              <p className="text-muted-foreground p-5 text-sm">No activity recorded yet.</p>
            ) : (
              <ul className="divide-y">
                {data.latestAudit.map((a) => (
                  <li key={a.id} className="px-5 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-medium">{a.action}</p>
                      <time className="text-muted-foreground shrink-0 text-xs">{formatDate(a.created_at, true)}</time>
                    </div>
                    {a.details && <p className="text-muted-foreground mt-0.5 text-sm">{a.details}</p>}
                    {a.actor_email && <p className="text-muted-foreground mt-0.5 text-xs">{a.actor_email}</p>}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
