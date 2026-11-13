"use client";

import { Send } from "lucide-react";
import { useState } from "react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { FilterSelect } from "@/components/shared/filter-select";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { useStaffClientOptions } from "@/features/workspace/hooks/use-workspace";
import { formatDate, humanize } from "@/lib/format";
import type { StaffPortal } from "@/types/auth";
import { useClientApprovals } from "../hooks/use-client-approvals";
import { APPROVAL_STATUSES, type ApprovalStatus, type ClientApproval } from "../types/client-approval.types";
import { RequestApprovalDialog } from "./request-approval-dialog";

const columns: Column<ClientApproval>[] = [
  {
    key: "subject",
    header: "Request",
    cell: (a) => (
      <div className="min-w-0">
        <p className="font-medium">{a.subject}</p>
        {a.description && <p className="text-muted-foreground line-clamp-2 max-w-md text-xs">{a.description}</p>}
      </div>
    ),
  },
  { key: "client", header: "Client", cell: (a) => a.client_name },
  { key: "asked", header: "Asked", hideOnMobile: true, cell: (a) => <span className="text-muted-foreground">{a.requested_by_name ?? "—"} · {formatDate(a.created_at)}</span> },
  {
    key: "status",
    header: "Decision",
    cell: (a) => (
      <div className="max-w-xs">
        <StatusBadge status={a.status} />
        {a.status !== "pending" && (
          <p className="text-muted-foreground mt-1 text-xs">
            {a.decided_by_name ?? "Client"} · {formatDate(a.decided_at)}
            {a.comment && <span className="block italic">&ldquo;{a.comment}&rdquo;</span>}
          </p>
        )}
      </div>
    ),
  },
];

export function ClientApprovalsList({ portal }: { portal: StaffPortal }) {
  const clients = useStaffClientOptions(portal);
  const [q, setQ] = useState("");
  const [clientId, setClientId] = useState<string>();
  const [status, setStatus] = useState<ApprovalStatus>();
  const [page, setPage] = useState(1);
  const [requesting, setRequesting] = useState(false);
  const approvals = useClientApprovals(portal, { q, client_id: clientId, status, page });

  return (
    <>
      <PageHeader
        title="Client Approvals"
        description="Sign-offs you've asked clients for, and their decisions."
        actions={<Button onClick={() => setRequesting(true)}><Send className="size-4" /> Request approval</Button>}
      />
      <section className="bg-card rounded-xl border shadow-xs">
        <div className="flex flex-col flex-wrap gap-3 border-b p-4 sm:flex-row">
          <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search approvals" />
          <FilterSelect allLabel="All clients" value={clientId} onChange={(v) => { setClientId(v); setPage(1); }} options={clients.data ?? []} />
          <FilterSelect allLabel="All decisions" value={status} onChange={(v) => { setStatus(v as ApprovalStatus | undefined); setPage(1); }} options={APPROVAL_STATUSES.map((s) => ({ value: s, label: humanize(s) }))} />
        </div>
        <DataTable
          columns={columns}
          rows={approvals.data?.items}
          rowKey={(a) => a.id}
          isLoading={approvals.isLoading}
          error={approvals.error}
          onRetry={() => void approvals.refetch()}
          empty={{ title: "No approval requests", description: "Ask a client to sign off on provisions, adjustments or filings." }}
          pagination={approvals.data && { ...approvals.data, onPageChange: setPage }}
        />
      </section>
      <RequestApprovalDialog portal={portal} open={requesting} onOpenChange={setRequesting} />
    </>
  );
}
