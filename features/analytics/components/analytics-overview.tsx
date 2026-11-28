"use client";

import Link from "next/link";
import { KpiCard } from "@/components/shared/kpi-card";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryState } from "@/features/progress/hooks/use-query-state";
import { formatINR, formatPeriod, humanize } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAnalytics } from "../hooks/use-analytics";
import { ANALYTICS_RANGES, type AnalyticsOverview as Overview, type AnalyticsRange, type Rate } from "../types/analytics.types";
import { BarChart } from "./bar-chart";

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

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-muted-foreground mt-8 mb-3 text-xs font-semibold tracking-[0.12em] uppercase">{children}</h2>;
}

const shortMonth = (p: string) => {
  const [m, y] = formatPeriod(p).split(" ");
  return `${m} ${y?.slice(2) ?? ""}`.trim();
};
const inrK = (n: number) => (n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : n >= 1000 ? `₹${Math.round(n / 1000)}k` : formatINR(n));
const pct = (r: Rate) => (r == null ? "—" : `${r}%`);
const dayText = (d: number | null) => (d == null ? "—" : `${d} ${d === 1 ? "day" : "days"}`);
const RANGE_LABEL: Record<AnalyticsRange, string> = { "3": "3 months", "6": "6 months", "12": "12 months" };

function RangePicker({ value, onChange }: { value: AnalyticsRange; onChange: (v: AnalyticsRange) => void }) {
  return (
    <div role="radiogroup" aria-label="Period" className="bg-muted inline-flex rounded-lg p-1">
      {ANALYTICS_RANGES.map((r) => (
        <button
          key={r}
          role="radio"
          aria-checked={value === r}
          onClick={() => onChange(r)}
          className={cn("rounded-md px-3 py-1 text-sm font-medium", value === r ? "bg-background shadow-xs" : "text-muted-foreground hover:text-foreground")}
        >
          {RANGE_LABEL[r]}
        </button>
      ))}
    </div>
  );
}

/** Admin → Insights → Analytics: money, delivery, team and clients over the last 3, 6 or 12 months. */
export function AnalyticsOverview() {
  const [range, setRange] = useQueryState<AnalyticsRange>("range", "6", ANALYTICS_RANGES);
  const { data, isLoading, error, refetch } = useAnalytics(range);

  const header = (
    <PageHeader
      title="Analytics"
      description={data ? `${formatPeriod(data.months[0]!)} – ${formatPeriod(data.months.at(-1)!)}. Outstanding and package fees are as of today.` : "Money, delivery, team and clients over time."}
      actions={<RangePicker value={range} onChange={setRange} />}
    />
  );
  if (error) return <>{header}<ErrorState error={error} onRetry={() => void refetch()} /></>;
  if (isLoading || !data) {
    return (
      <>
        {header}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
      </>
    );
  }
  return (
    <>
      {header}
      <Money data={data} />
      <Delivery data={data} />
      <Team data={data} />
      <Clients data={data} />
    </>
  );
}

function Money({ data }: { data: Overview }) {
  const s = data.summary;
  const collectedShare = s.billed ? Math.round((s.collected / s.billed) * 100) : null;
  return (
    <>
      <SectionTitle>Money</SectionTitle>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Billed" value={formatINR(s.billed)} details={[{ label: "Invoices raised in the period", value: "" }]} />
        <KpiCard label="Collected" value={formatINR(s.collected)} details={[{ label: "Of billed", value: pct(collectedShare) }]} />
        <Link href="/admin/invoices" className="rounded-xl focus-visible:ring-2 focus-visible:outline-none">
          <KpiCard
            className="hover:border-primary/40 h-full transition-colors"
            label="Outstanding today"
            value={formatINR(s.outstanding)}
            details={[
              { label: "Overdue", value: <span className={s.overdue ? "text-destructive" : undefined}>{formatINR(s.overdue)}</span> },
              { label: "Invoices", value: s.overdue_invoices },
            ]}
          />
        </Link>
        <KpiCard label="Monthly fees" value={formatINR(s.monthly_fees)} details={[{ label: "Active packages", value: data.packages.reduce((n, p) => n + p.clients, 0) }]} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="Billed per month" subtitle="Invoice totals by billing period.">
          <BarChart title="Billed per month" format={inrK} bars={data.monthly.map((m) => ({ key: m.month, label: shortMonth(m.month), value: m.billed }))} />
        </Panel>
        <Panel title="Collected per month" subtitle="Payments received, by payment date.">
          <BarChart title="Collected per month" format={inrK} bars={data.monthly.map((m) => ({ key: m.month, label: shortMonth(m.month), value: m.collected }))} />
        </Panel>
      </div>
    </>
  );
}

function Delivery({ data }: { data: Overview }) {
  const s = data.summary;
  return (
    <>
      <SectionTitle>Delivery</SectionTitle>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Tasks approved" value={s.tasks_approved} details={[{ label: "Hours logged", value: s.hours }]} />
        <KpiCard label="First-time approval" value={pct(s.first_time_approval)} details={[{ label: "Approved on first review", value: "" }]} />
        <KpiCard label="On time" value={pct(s.on_time)} details={[{ label: "Approved tasks submitted by due date", value: "" }]} />
        <KpiCard label="Review time" value={dayText(s.avg_review_days)} details={[{ label: "Submission to decision, average", value: "" }]} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="Tasks approved per month">
          <BarChart title="Tasks approved per month" format={String} bars={data.monthly.map((m) => ({ key: m.month, label: shortMonth(m.month), value: m.approved }))} />
        </Panel>
        <Panel title="Hours logged per month">
          <BarChart title="Hours logged per month" format={(v) => `${v} h`} bars={data.monthly.map((m) => ({ key: m.month, label: shortMonth(m.month), value: m.hours }))} />
        </Panel>
      </div>
      <Panel title="Month by month" subtitle="Rates are shares of that month's reviews; — means nothing to measure." className="mt-4">
        <div className="-m-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground text-xs">
              <tr className="border-b text-right">
                <th scope="col" className="px-5 py-3 text-left font-medium">Month</th>
                <th scope="col" className="px-3 py-3 font-medium">Approved</th>
                <th scope="col" className="px-3 py-3 font-medium">First-time</th>
                <th scope="col" className="px-3 py-3 font-medium">On time</th>
                <th scope="col" className="px-3 py-3 font-medium">Review time</th>
                <th scope="col" className="px-3 py-3 font-medium">Hours</th>
                <th scope="col" className="px-3 py-3 font-medium">Billed</th>
                <th scope="col" className="px-3 py-3 font-medium">Collected</th>
                <th scope="col" className="px-5 py-3 font-medium">Months closed</th>
              </tr>
            </thead>
            <tbody>
              {[...data.monthly].reverse().map((m) => (
                <tr key={m.month} className="border-b text-right tabular-nums last:border-b-0">
                  <th scope="row" className="px-5 py-2.5 text-left font-medium">{formatPeriod(m.month)}</th>
                  <td className={cn("px-3 py-2.5", !m.approved && "text-muted-foreground")}>{m.approved}</td>
                  <td className={cn("px-3 py-2.5", m.first_time_approval == null && "text-muted-foreground")}>{pct(m.first_time_approval)}</td>
                  <td className={cn("px-3 py-2.5", m.on_time == null && "text-muted-foreground")}>{pct(m.on_time)}</td>
                  <td className={cn("px-3 py-2.5", m.avg_review_days == null && "text-muted-foreground")}>{dayText(m.avg_review_days)}</td>
                  <td className={cn("px-3 py-2.5", !m.hours && "text-muted-foreground")}>{m.hours}</td>
                  <td className={cn("px-3 py-2.5", !m.billed && "text-muted-foreground")}>{formatINR(m.billed)}</td>
                  <td className={cn("px-3 py-2.5", !m.collected && "text-muted-foreground")}>{formatINR(m.collected)}</td>
                  <td className={cn("px-5 py-2.5", !m.closed_clients && "text-muted-foreground")}>{m.closed_clients}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}

function Team({ data }: { data: Overview }) {
  return (
    <>
      <SectionTitle>Team</SectionTitle>
      <Panel title="Approved tasks per person" subtitle="By month the task was approved, with quality and time for the whole period. Click a name for their progress.">
        {data.people.length === 0 ? (
          <EmptyState title="No approvals in this period" className="py-8" />
        ) : (
          <div className="-m-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground text-xs">
                <tr className="border-b text-right">
                  <th scope="col" className="px-5 py-3 text-left font-medium">Person</th>
                  {data.months.map((m) => <th key={m} scope="col" className="px-2 py-3 font-medium whitespace-nowrap">{shortMonth(m)}</th>)}
                  <th scope="col" className="px-3 py-3 font-medium">Total</th>
                  <th scope="col" className="px-3 py-3 font-medium">First-time</th>
                  <th scope="col" className="px-3 py-3 font-medium">On time</th>
                  <th scope="col" className="px-5 py-3 font-medium">Hours</th>
                </tr>
              </thead>
              <tbody>
                {data.people.map((p) => (
                  <tr key={p.user_id} className="border-b text-right tabular-nums last:border-b-0">
                    <th scope="row" className="px-5 py-2.5 text-left font-medium whitespace-nowrap">
                      <Link href={`/admin/progress/${p.user_id}`} className="hover:text-primary hover:underline">{p.full_name}</Link>
                    </th>
                    {p.approved.map((n, i) => <td key={data.months[i]} className={cn("px-2 py-2.5", !n && "text-muted-foreground")}>{n}</td>)}
                    <td className="px-3 py-2.5 font-semibold">{p.total}</td>
                    <td className="px-3 py-2.5">{pct(p.first_time_approval)}</td>
                    <td className="px-3 py-2.5">{pct(p.on_time)}</td>
                    <td className="px-5 py-2.5">{p.hours}</td>
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

function Clients({ data }: { data: Overview }) {
  return (
    <>
      <SectionTitle>Clients</SectionTitle>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Top clients by billing" subtitle="Invoice totals in the period.">
          {data.top_clients.length === 0 ? (
            <EmptyState title="Nothing billed in this period" className="py-8" />
          ) : (
            <BarChart orientation="horizontal" title="Top clients by billing" format={inrK} bars={data.top_clients.map((c) => ({ key: String(c.client_id), label: c.client_name, value: c.total }))} />
          )}
        </Panel>
        <Panel title="Packages" subtitle="Monthly fees of active engagements, per package.">
          {data.packages.length === 0 ? (
            <EmptyState title="No active packages" className="py-8" />
          ) : (
            <BarChart
              orientation="horizontal"
              title="Monthly fees per package"
              format={inrK}
              bars={data.packages.map((p) => ({ key: String(p.package_id), label: `${p.name} (${p.clients})`, value: p.monthly_fees }))}
            />
          )}
        </Panel>
        <Panel title="Clients by status" subtitle="Today.">
          {data.clients_by_status.length === 0 ? (
            <EmptyState title="No clients yet" className="py-8" />
          ) : (
            <BarChart orientation="horizontal" title="Clients by status" format={String} bars={data.clients_by_status.map((c) => ({ key: c.status, label: humanize(c.status), value: c.count }))} />
          )}
        </Panel>
        <Panel title="New clients per month" subtitle="By date added.">
          <BarChart title="New clients per month" format={String} bars={data.monthly.map((m) => ({ key: m.month, label: shortMonth(m.month), value: m.new_clients }))} />
        </Panel>
      </div>
    </>
  );
}
