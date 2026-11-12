"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { DataTable, type Column } from "@/components/shared/data-table";
import { FilterSelect } from "@/components/shared/filter-select";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { StatusBadge } from "@/components/shared/status-badge";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { applyApiError } from "@/lib/form-errors";
import { formatDate, humanize } from "@/lib/format";
import { useConnections, useHealthCheck } from "../hooks/use-integrations";
import { CONNECTION_STATUSES, PROVIDER_LABELS, PROVIDERS, type Connection, type ConnectionStatus, type Provider } from "../types/integration.types";
import { ConnectionFormDialog } from "./connection-form-dialog";

function HealthCheckButton({ connection }: { connection: Connection }) {
  const check = useHealthCheck();
  const run = async () => {
    try {
      const r = await check.mutateAsync(connection.id);
      if (r.status === "connected") toast.success(`${connection.client_name}: connected`);
      else toast.error(`${connection.client_name}: ${r.last_error ?? r.status}`);
    } catch (err) {
      applyApiError(err);
    }
  };
  return <SubmitButton type="button" size="sm" variant="outline" pending={check.isPending} onClick={run}>Run health check</SubmitButton>;
}

const columns: Column<Connection>[] = [
  { key: "client", header: "Client", cell: (c) => <span className="font-medium">{c.client_name}</span> },
  { key: "provider", header: "Provider", cell: (c) => PROVIDER_LABELS[c.provider] },
  {
    key: "org",
    header: "Organisation",
    hideOnMobile: true,
    cell: (c) => (
      <div className="min-w-0">
        <p className="truncate">{c.external_org_name ?? "—"}</p>
        {c.external_org_id && <p className="text-muted-foreground font-mono text-xs">{c.external_org_id}</p>}
      </div>
    ),
  },
  { key: "status", header: "Status", cell: (c) => <StatusBadge status={c.status} /> },
  { key: "check", header: "Last check", hideOnMobile: true, cell: (c) => <span className="whitespace-nowrap">{c.last_health_check ? formatDate(c.last_health_check, true) : "never"}</span> },
  { key: "error", header: "Last error", hideOnMobile: true, cell: (c) => <span className="text-destructive text-xs">{c.last_error ?? "—"}</span> },
  { key: "action", header: "", className: "text-right", cell: (c) => <HealthCheckButton connection={c} /> },
];

export function IntegrationList() {
  const [q, setQ] = useState("");
  const [provider, setProvider] = useState<Provider>();
  const [status, setStatus] = useState<ConnectionStatus>();
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const query = useConnections({ q, provider, status, page });

  return (
    <>
      <PageHeader
        title="Integrations"
        description="Where each client's books live. Accountanz never keeps the ledger itself."
        actions={<Button onClick={() => setAdding(true)}><Plus className="size-4" /> Add connection</Button>}
      />
      <p className="text-muted-foreground -mt-3 mb-4 text-xs">
        Health checks currently mark the connection as connected and record the time; the JournL / Zoho Books API call is not wired up yet.
      </p>
      <div className="bg-card rounded-xl border shadow-xs">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row">
          <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search organisation" />
          <FilterSelect allLabel="All providers" value={provider} onChange={(v) => { setProvider(v as Provider | undefined); setPage(1); }} options={PROVIDERS.map((p) => ({ value: p, label: PROVIDER_LABELS[p] }))} />
          <FilterSelect allLabel="All statuses" value={status} onChange={(v) => { setStatus(v as ConnectionStatus | undefined); setPage(1); }} options={CONNECTION_STATUSES.map((s) => ({ value: s, label: humanize(s) }))} />
        </div>
        <DataTable
          columns={columns}
          rows={query.data?.items}
          rowKey={(c) => c.id}
          isLoading={query.isLoading}
          error={query.error}
          onRetry={() => void query.refetch()}
          empty={{ title: q || provider || status ? "No connections match" : "No connections yet" }}
          pagination={query.data && { ...query.data, onPageChange: setPage }}
        />
      </div>
      <ConnectionFormDialog open={adding} onOpenChange={setAdding} />
    </>
  );
}
