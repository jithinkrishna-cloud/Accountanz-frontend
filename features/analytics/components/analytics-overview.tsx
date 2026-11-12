"use client";

import { KpiCard } from "@/components/shared/kpi-card";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { Skeleton } from "@/components/ui/skeleton";
import { formatINR, formatPeriod, humanize } from "@/lib/format";
import { useAnalytics } from "../hooks/use-analytics";
import { BarChart } from "./bar-chart";

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="bg-card rounded-xl border shadow-xs">
      <header className="border-b px-5 py-4">
        <h2 className="font-medium">{title}</h2>
        {subtitle && <p className="text-muted-foreground text-xs">{subtitle}</p>}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

const shortMonth = (p: string) => formatPeriod(p).split(" ")[0]!;
const inrK = (n: number) => (n >= 1000 ? `₹${Math.round(n / 1000)}k` : formatINR(n));

export function AnalyticsOverview() {
  const { data, isLoading, error, refetch } = useAnalytics();
  const header = <PageHeader title="Reports & Analytics" description="Throughput, turnaround, revenue and portfolio mix." />;
  if (error) return <>{header}<ErrorState error={error} onRetry={() => void refetch()} /></>;
  const loading = isLoading || !data;

  return (
    <>
      {header}
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard loading={loading} label="Avg review turnaround" value={data ? `${data.avg_review_turnaround_days} days` : "—"} />
        <KpiCard loading={loading} label="Tasks approved" value={data?.tasks_approved} details={data ? [{ label: "Window", value: `${formatPeriod(data.months[0]!)} – ${formatPeriod(data.months.at(-1)!)}` }] : undefined} />
        <KpiCard loading={loading} label="Revenue booked" value={formatINR(data?.revenue_booked)} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Tasks completed per accountant" subtitle="Approved tasks by month.">
          {loading ? (
            <Skeleton className="h-40 w-full" />
          ) : data.tasks_by_accountant.length === 0 ? (
            <EmptyState title="No approvals in this window" className="py-8" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground text-xs uppercase">
                    <th scope="col" className="pb-2 text-left font-medium">Accountant</th>
                    {data.months.map((m) => <th key={m} scope="col" className="pb-2 text-right font-medium">{shortMonth(m)}</th>)}
                    <th scope="col" className="pb-2 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.tasks_by_accountant.map((a) => (
                    <tr key={a.user_id}>
                      <th scope="row" className="py-2 text-left font-medium">{a.full_name}</th>
                      {a.counts.map((n, i) => (
                        <td key={data.months[i]} className={n ? "py-2 text-right tabular-nums" : "text-muted-foreground py-2 text-right tabular-nums"}>{n}</td>
                      ))}
                      <td className="py-2 text-right font-semibold tabular-nums">{a.counts.reduce((s, n) => s + n, 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel title="Revenue by month" subtitle="Service invoices raised.">
          {loading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <BarChart
              title="Revenue by month"
              format={inrK}
              bars={data.months.map((m, i) => ({ key: m, label: shortMonth(m), value: data.revenue_by_month[i] ?? 0 }))}
            />
          )}
        </Panel>

        <Panel title="Clients by status">
          {loading ? (
            <Skeleton className="h-32 w-full" />
          ) : data.clients_by_status.length === 0 ? (
            <EmptyState title="No clients yet" className="py-8" />
          ) : (
            <BarChart
              orientation="horizontal"
              title="Clients by status"
              format={(n) => String(n)}
              bars={data.clients_by_status.map((c) => ({ key: c.status, label: humanize(c.status), value: c.count }))}
            />
          )}
        </Panel>
      </div>
    </>
  );
}
