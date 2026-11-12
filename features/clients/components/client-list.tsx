"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ACCOUNTING_SOFTWARE_LABELS } from "@/lib/constants";
import { formatDate, humanize } from "@/lib/format";
import { useClients } from "../hooks/use-clients";
import { CLIENT_STATUSES, type Client, type ClientStatus } from "../types/client.types";
import { ClientFormDialog } from "./client-form-dialog";

const columns: Column<Client>[] = [
  {
    key: "client",
    header: "Client",
    cell: (c) => (
      <div className="min-w-0">
        <p className="truncate font-medium">{c.trade_name ?? c.legal_name}</p>
        {c.trade_name && <p className="text-muted-foreground truncate text-xs">{c.legal_name}</p>}
      </div>
    ),
  },
  { key: "gstin", header: "GSTIN", hideOnMobile: true, cell: (c) => <span className="font-mono text-xs">{c.gstin ?? "—"}</span> },
  { key: "state", header: "State", hideOnMobile: true, cell: (c) => c.state ?? "—" },
  { key: "software", header: "Software", hideOnMobile: true, cell: (c) => ACCOUNTING_SOFTWARE_LABELS[c.accounting_software] },
  { key: "status", header: "Status", cell: (c) => <StatusBadge status={c.status} /> },
  { key: "added", header: "Added", hideOnMobile: true, cell: (c) => formatDate(c.created_at) },
];

const ALL = "all";

export function ClientList() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<ClientStatus | typeof ALL>(ALL);
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const query = useClients({ q, status: status === ALL ? undefined : status, page });

  return (
    <>
      <PageHeader
        title="Clients"
        description="Every business Accountanz manages, from first lead to exit."
        actions={<Button onClick={() => setCreating(true)}><Plus className="size-4" /> New client</Button>}
      />
      <div className="bg-card rounded-xl border shadow-xs">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row">
          <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search by name, GSTIN or state" />
          <Select value={status} onValueChange={(v) => { setStatus(v as ClientStatus | typeof ALL); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-44" aria-label="Filter by status"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              {CLIENT_STATUSES.map((s) => <SelectItem key={s} value={s}>{humanize(s)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <DataTable
          columns={columns}
          rows={query.data?.items}
          rowKey={(c) => c.id}
          isLoading={query.isLoading}
          error={query.error}
          onRetry={() => void query.refetch()}
          onRowClick={(c) => router.push(`/admin/clients/${c.id}`)}
          empty={
            q || status !== ALL
              ? { title: "No clients match", description: "Try a different search or status." }
              : { title: "No clients yet", description: "Add the first business you manage.", action: <Button size="sm" onClick={() => setCreating(true)}>New client</Button> }
          }
          pagination={query.data && { ...query.data, onPageChange: setPage }}
        />
      </div>
      <ClientFormDialog open={creating} onOpenChange={setCreating} onSaved={(c) => router.push(`/admin/clients/${c.id}`)} />
    </>
  );
}
