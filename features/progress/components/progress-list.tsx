"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { ROLE_LABELS } from "@/lib/constants";
import { formatPeriod } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PortalRole } from "@/types/auth";
import { useProgressList } from "../hooks/use-progress";
import type { ProgressSummary } from "../types/progress.types";
import { PeriodSelect } from "./period-select";

const n = (v: number, warn = false) => <span className={cn("tabular-nums", v === 0 ? "text-muted-foreground" : warn && "text-destructive font-medium")}>{v}</span>;

/** Admin → Individual Progress: everyone's workload and output for a month. Click a person for their page. */
export function ProgressListView() {
  const router = useRouter();
  const [period, setPeriod] = useState<string>();
  const [q, setQ] = useState("");
  const { data, isLoading, error, refetch } = useProgressList(period);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return data?.items.filter((p) => !term || p.full_name.toLowerCase().includes(term) || p.email.toLowerCase().includes(term));
  }, [data, q]);

  const month = data ? formatPeriod(data.period) : "this month";
  const columns: Column<ProgressSummary>[] = [
    {
      key: "person",
      header: "Person",
      cell: (p) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{p.full_name}</p>
          <p className="text-muted-foreground truncate text-xs">{ROLE_LABELS[p.portal_role as PortalRole] ?? p.portal_role}</p>
        </div>
      ),
    },
    { key: "clients", header: "Clients", hideOnMobile: true, cell: (p) => n(p.active_clients) },
    { key: "open", header: "Open", cell: (p) => n(p.open_tasks) },
    { key: "overdue", header: "Overdue", cell: (p) => n(p.overdue, true) },
    { key: "awaiting", header: "Awaiting review", hideOnMobile: true, cell: (p) => n(p.awaiting_review) },
    { key: "to_review", header: "To review", hideOnMobile: true, cell: (p) => n(p.to_review) },
    { key: "approved", header: `Approved (${month})`, cell: (p) => n(p.approved) },
    {
      key: "rate",
      header: "Approval rate",
      hideOnMobile: true,
      cell: (p) => (p.approval_rate == null ? <span className="text-muted-foreground">—</span> : <span className="tabular-nums">{p.approval_rate}%</span>),
    },
    { key: "hours", header: "Hours", hideOnMobile: true, cell: (p) => <span className={cn("tabular-nums", p.hours === 0 && "text-muted-foreground")}>{p.hours}</span> },
  ];

  return (
    <>
      <PageHeader
        title="Individual Progress"
        description="Each person's open work today, and what they got approved and logged in the month. Select a person for details."
        actions={data && <PeriodSelect value={data.period} periods={data.periods} onChange={setPeriod} />}
      />
      <div className="mb-4">
        <SearchInput value={q} onChange={setQ} placeholder="Search by name or email" />
      </div>
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(p) => p.user_id}
        isLoading={isLoading}
        error={error}
        onRetry={() => void refetch()}
        onRowClick={(p) => router.push(`/admin/progress/${p.user_id}`)}
        empty={{ title: q ? "Nobody matches" : "No active team members yet" }}
      />
    </>
  );
}
