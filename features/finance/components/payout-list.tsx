"use client";

import { RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { DataTable, type Column } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { applyApiError } from "@/lib/form-errors";
import { formatINR, formatPeriod } from "@/lib/format";
import { useApprovePayout, useGeneratePayoutRun, useMarkPayoutPaid, usePayouts } from "../hooks/use-finance";
import type { Payout } from "../types/finance.types";
import { MoneyStats } from "./money-stats";

/** The current month and the five before it. */
function recentPeriods(count = 6) {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
}

const hours = (minutes: number) => `${(minutes / 60).toFixed(1)} h`;

function PayoutAction({ payout }: { payout: Payout }) {
  const approve = useApprovePayout();
  const markPaid = useMarkPayoutPaid();
  const run = async (fn: () => Promise<unknown>, message: string) => {
    try {
      await fn();
      toast.success(message);
    } catch (err) {
      applyApiError(err);
    }
  };
  if (payout.status === "draft" && payout.verification_status !== "verified") {
    return <span className="text-warning text-xs font-medium" title="Verify this accountant before approving">Not verified</span>;
  }
  if (payout.status === "draft") {
    return (
      <SubmitButton type="button" size="sm" variant="outline" pending={approve.isPending} onClick={() => run(() => approve.mutateAsync(payout.id), `Approved ${payout.full_name}'s payout`)}>
        Approve
      </SubmitButton>
    );
  }
  if (payout.status === "approved") {
    return (
      <SubmitButton type="button" size="sm" variant="outline" pending={markPaid.isPending} onClick={() => run(() => markPaid.mutateAsync({ id: payout.id, reference: null }), `Marked ${payout.full_name}'s payout paid`)}>
        Mark paid
      </SubmitButton>
    );
  }
  return null;
}

const columns: Column<Payout>[] = [
  {
    key: "accountant",
    header: "Accountant",
    cell: (p) => (
      <div className="min-w-0">
        <p className="truncate font-medium">{p.full_name}</p>
        <p className="text-muted-foreground truncate text-xs">{p.email}</p>
      </div>
    ),
  },
  { key: "hours", header: "Hours", hideOnMobile: true, cell: (p) => <span className="tabular-nums">{hours(p.minutes)}</span> },
  { key: "rate", header: "Rate", hideOnMobile: true, cell: (p) => <span className="tabular-nums">{formatINR(p.hourly_rate)}/h</span> },
  { key: "payout", header: "Payout", className: "text-right", cell: (p) => <span className="font-medium tabular-nums">{formatINR(p.amount, true)}</span> },
  { key: "bank", header: "Bank", hideOnMobile: true, cell: (p) => (p.bank_account_last4 ? <span className="font-mono text-xs">•••• {p.bank_account_last4}</span> : "—") },
  { key: "status", header: "Status", cell: (p) => <StatusBadge status={p.status} /> },
  { key: "action", header: "", className: "text-right", cell: (p) => <PayoutAction payout={p} /> },
];

export function PayoutList() {
  const periods = useMemo(() => recentPeriods(), []);
  const [period, setPeriod] = useState(periods[0]!);
  const query = usePayouts(period);
  const generate = useGeneratePayoutRun();
  const s = query.data?.summary;

  const runPayouts = async () => {
    try {
      const r = await generate.mutateAsync(period);
      toast.success(`${formatPeriod(period)}: ${r.created} new, ${r.refreshed} refreshed, ${formatINR(r.payable, true)} payable`);
      if (r.skipped_unverified.length) {
        toast.warning(`Not paid until verified: ${r.skipped_unverified.join(", ")}. Verify them in Accountants, then run again.`, { duration: 8000 });
      }
    } catch (err) {
      applyApiError(err);
    }
  };

  return (
    <>
      <PageHeader
        title="Accountant Payouts"
        description="Payout runs use logged work hours and each accountant's hourly rate."
        actions={
          <>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-36" aria-label="Period"><SelectValue /></SelectTrigger>
              <SelectContent>{periods.map((p) => <SelectItem key={p} value={p}>{formatPeriod(p)}</SelectItem>)}</SelectContent>
            </Select>
            <SubmitButton type="button" pending={generate.isPending} onClick={runPayouts}>
              <RefreshCw className="size-4" /> Generate run
            </SubmitButton>
          </>
        }
      />
      <MoneyStats
        loading={!s}
        stats={[
          { label: "Payable", value: formatINR(s?.payable, true) },
          { label: "Paid", value: formatINR(s?.paid, true) },
          { label: "Logged hours", value: s ? hours(s.logged_minutes) : "—" },
        ]}
      />
      <div className="bg-card rounded-xl border shadow-xs">
        <DataTable
          columns={columns}
          rows={query.data?.items}
          rowKey={(p) => p.id}
          isLoading={query.isLoading}
          error={query.error}
          onRetry={() => void query.refetch()}
          empty={{
            title: `No payout run for ${formatPeriod(period)} yet`,
            description: "Generate a run to turn logged hours into payouts.",
            action: <Button size="sm" onClick={runPayouts} disabled={generate.isPending}>Generate run</Button>,
          }}
        />
      </div>
    </>
  );
}
