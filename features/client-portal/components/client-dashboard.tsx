"use client";

import { CalendarClock, CheckCircle2, Hourglass } from "lucide-react";
import Link from "next/link";
import { KpiCard } from "@/components/shared/kpi-card";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/states";
import { formatDate, formatINR, formatPeriod } from "@/lib/format";
import { usePortalDashboard, usePortalProposal } from "../hooks/use-client-portal";
import type { PortalCompany } from "../types/client-portal.types";
import { ProposalCard } from "./client-proposal";
import { CompanyGate } from "./company-gate";

function Body() {
  const { data: d, isLoading, error, refetch } = usePortalDashboard();
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;
  const loading = isLoading || !d;
  const period = d ? formatPeriod(d.period) : "";
  const complete = !!d && d.tasks_total > 0 && d.tasks_done === d.tasks_total;

  return (
    <>
      <PageHeader title="Dashboard" description={d ? `An overview of ${d.company}'s accounting.` : "An overview of your accounting."} actions={d && <span className="bg-card rounded-full border px-3 py-1 text-xs font-medium uppercase">{period}</span>} />
      {d && (
        <div className="bg-card mb-6 flex items-start gap-3 rounded-xl border p-5 shadow-xs">
          <CheckCircle2 className={complete ? "mt-0.5 size-5 text-emerald-600" : "text-muted-foreground mt-0.5 size-5"} aria-hidden />
          <div>
            <p className="font-medium">{period} accounting: {complete ? "complete" : d.tasks_total === 0 ? "not started yet" : "in progress"}</p>
            <p className="text-muted-foreground text-sm">
              {complete
                ? "Everything for this month is finished. Your reports are ready in the Reports section."
                : `${d.tasks_done} of ${d.tasks_total} tasks done${d.open_requests ? `, and your team is waiting on ${d.open_requests} document(s) from you.` : "."}`}
            </p>
          </div>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard loading={loading} label="Tasks completed" value={d ? `${d.tasks_done} of ${d.tasks_total}` : "—"} details={[{ label: "Visible work for", value: period || "—" }]} />
        <KpiCard loading={loading} label="Documents we need from you" value={d?.open_requests} details={[{ label: "See", value: <Link className="text-primary hover:underline" href="/app/requests">Document requests</Link> }]} />
        <KpiCard loading={loading} label="Approvals waiting" value={d?.pending_approvals} details={[{ label: "See", value: <Link className="text-primary hover:underline" href="/app/approvals">Approvals</Link> }]} />
        <KpiCard loading={loading} label="Outstanding" value={formatINR(d?.outstanding, true)} details={[{ label: "See", value: <Link className="text-primary hover:underline" href="/app/billing">Billing</Link> }]} />
      </div>
      {d?.next_meeting_title && (
        <div className="bg-card mt-6 flex items-center gap-3 rounded-xl border p-5 text-sm shadow-xs">
          <CalendarClock className="text-primary size-5" aria-hidden />
          <span>Next meeting: <span className="font-medium">{d.next_meeting_title}</span> · {formatDate(d.next_meeting_at, true)}</span>
          <Link href="/app/meetings" className="text-primary ml-auto text-sm font-medium hover:underline">All meetings</Link>
        </div>
      )}
      {d && <p className="text-muted-foreground mt-4 text-xs">Reports published so far: {d.reports}.</p>}
    </>
  );
}

/** Dashboard for a company: its proposal (if any), the "reviewing your application" note for new leads, then the overview. */
function DashboardForCompany({ company }: { company: PortalCompany }) {
  const proposal = usePortalProposal().data;
  return (
    <>
      <ProposalCard className="mb-6" />
      {company.status === "lead" && !proposal && (
        <div role="status" className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          <Hourglass className="mt-0.5 size-5 shrink-0" aria-hidden />
          <div>
            <p className="font-medium">Thanks for registering {company.name}</p>
            <p className="mt-1 text-sm opacity-90">
              Our team is reviewing your application. We&apos;ll contact you to understand your business and propose a package. Once you accept, your accounting team is assigned and your work starts here.
            </p>
          </div>
        </div>
      )}
      <Body />
    </>
  );
}

export function ClientDashboard() {
  return <CompanyGate>{(company) => <DashboardForCompany company={company} />}</CompanyGate>;
}
