"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { formatDate, humanize } from "@/lib/format";
import { auditService } from "../services/audit-service";
import type { AuditLog } from "../types/audit.types";

const columns: Column<AuditLog>[] = [
  { key: "when", header: "When", cell: (r) => <span className="whitespace-nowrap">{formatDate(r.created_at, true)}</span> },
  { key: "action", header: "Action", cell: (r) => <span className="font-medium">{r.action}</span> },
  {
    key: "actor",
    header: "Actor",
    cell: (r) => (
      <div>
        <p>{r.actor_email ?? "System"}</p>
        {r.actor_role && <p className="text-muted-foreground text-xs">{humanize(r.actor_role)}</p>}
      </div>
    ),
  },
  { key: "entity", header: "Entity", hideOnMobile: true, cell: (r) => <span className="text-muted-foreground">{r.entity_type}{r.client_name ? ` · ${r.client_name}` : ""}</span> },
  { key: "details", header: "Details", hideOnMobile: true, cell: (r) => <span className="text-muted-foreground">{r.details ?? "—"}</span> },
];

export function AuditLogList() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const query = useQuery({ queryKey: ["admin", "audit", q, page], queryFn: () => auditService.list({ q, page }), placeholderData: keepPreviousData });

  return (
    <>
      <PageHeader title="Audit Logs" description="Assignments, reviews, closing, reports, approvals and engagement changes." />
      <div className="bg-card rounded-xl border shadow-xs">
        <div className="border-b p-4">
          <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search action, actor or detail" />
        </div>
        <DataTable
          columns={columns}
          rows={query.data?.items}
          rowKey={(r) => r.id}
          isLoading={query.isLoading}
          error={query.error}
          onRetry={() => void query.refetch()}
          empty={{ title: q ? "No matching activity" : "No activity yet" }}
          pagination={query.data && { ...query.data, onPageChange: setPage }}
        />
      </div>
    </>
  );
}
