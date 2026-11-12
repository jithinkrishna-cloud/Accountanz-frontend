"use client";

import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ACCOUNTING_SOFTWARE_LABELS } from "@/lib/constants";
import { humanize, initials } from "@/lib/format";
import { usePortalBusiness, usePortalTeam } from "../hooks/use-client-portal";
import { CompanyGate } from "./company-gate";
import { JournlConnection } from "./journl-connection";
import { Card, ListBody } from "./portal-ui";

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="mt-0.5 text-sm break-words">{value || "—"}</dd>
    </div>
  );
}

function BusinessBody() {
  const { data: b, isLoading, error, refetch } = usePortalBusiness();
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (isLoading || !b) return <Skeleton className="h-48 w-full rounded-xl" />;
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <Card title="Company details" subtitle="Ask your accountant if anything here is out of date.">
          <dl className="grid gap-4 p-5 sm:grid-cols-2">
            <Fact label="Legal name" value={b.legal_name} />
            <Fact label="Trade name" value={b.trade_name} />
            <Fact label="GSTIN" value={b.gstin && <span className="font-mono">{b.gstin}</span>} />
            <Fact label="PAN" value={b.pan && <span className="font-mono">{b.pan}</span>} />
            <Fact label="State" value={b.state} />
            <Fact label="Accounting software" value={ACCOUNTING_SOFTWARE_LABELS[b.accounting_software] ?? b.accounting_software} />
            <Fact label="Address" value={b.address} />
            <Fact label="Status" value={<StatusBadge status={b.status} />} />
          </dl>
        </Card>
      </div>
      <Card title="Branches">
        {b.branches.length === 0 ? (
          <p className="text-muted-foreground p-5 text-sm">No branches recorded.</p>
        ) : (
          <ul className="divide-y">
            {b.branches.map((br) => (
              <li key={br.id} className="px-5 py-3 text-sm">
                <p className="font-medium">{br.name}</p>
                <p className="text-muted-foreground font-mono text-xs">{br.gstin ?? "No GSTIN"}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

export function ClientBusiness() {
  return (
    <CompanyGate>
      {() => (
        <>
          <PageHeader title="My Business" description="The details we hold for your company." />
          <BusinessBody />
        </>
      )}
    </CompanyGate>
  );
}

function TeamBody() {
  const q = usePortalTeam();
  return (
    <Card title="Your accounting team" subtitle="The people working on your books this month.">
      <ListBody query={q} empty={{ title: "No team assigned yet", description: "Your team appears here once Accountanz assigns accountants to your company." }}>
        {(rows) => (
          <ul className="divide-y">
            {rows.map((m) => (
              <li key={`${m.email}-${m.team_role}`} className="flex items-center gap-3 px-5 py-3">
                <Avatar className="size-9"><AvatarFallback className="bg-accent text-xs">{initials(m.full_name)}</AvatarFallback></Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{m.full_name}</p>
                  <a href={`mailto:${m.email}`} className="text-muted-foreground truncate text-xs hover:underline">{m.email}</a>
                </div>
                <span className="text-muted-foreground text-sm">{humanize(m.team_role)}</span>
              </li>
            ))}
          </ul>
        )}
      </ListBody>
    </Card>
  );
}

export function ClientTeam() {
  return (
    <CompanyGate>
      {() => (
        <>
          <PageHeader title="My Accounting Team" description="Who looks after your accounts at Accountanz." />
          <TeamBody />
        </>
      )}
    </CompanyGate>
  );
}

export function ClientSoftware() {
  return (
    <CompanyGate>
      {(company) => (
        <>
          <PageHeader title="Accounting Software" description="Where your books live." />
          <JournlConnection company={company} />
        </>
      )}
    </CompanyGate>
  );
}
