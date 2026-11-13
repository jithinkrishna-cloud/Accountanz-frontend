"use client";

import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
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
import { CONNECTION_STATUSES, PROVIDER_LABELS, type Connection, type ConnectionStatus } from "../types/integration.types";
import { ConnectionFormDialog } from "./connection-form-dialog";
import { VerifyConnectionDialog } from "./verify-connection-dialog";

/** Asks JournL for Accountanz's grant. Until JournL ships its partner API the server answers with that reason. */
function CheckWithJournlButton({ connection }: { connection: Connection }) {
  const check = useHealthCheck();
  const run = async () => {
    try {
      const r = await check.mutateAsync(connection.id);
      if (r.status === "connected") toast.success(`${connection.client_name}: JournL confirmed access`);
      else toast.error(`${connection.client_name}: ${r.last_error ?? r.status}`);
    } catch (err) {
      applyApiError(err);
    }
  };
  return <SubmitButton type="button" size="sm" variant="ghost" pending={check.isPending} onClick={run}>Check with JournL</SubmitButton>;
}

function Verification({ c }: { c: Connection }) {
  if (c.status === "disconnected") return <span className="text-muted-foreground text-xs">Disconnected {c.disconnected_at ? formatDate(c.disconnected_at, true) : ""}</span>;
  if (!c.verified_at) return <span className="text-muted-foreground text-xs">not verified</span>;
  return (
    <div className="min-w-0 text-xs" title={c.verification_note ?? undefined}>
      <p className="whitespace-nowrap">{formatDate(c.verified_at, true)}{c.verified_by_name ? ` · ${c.verified_by_name}` : ""}</p>
      {c.verification_note && <p className="text-muted-foreground max-w-56 truncate">{c.verification_note}</p>}
    </div>
  );
}

export function IntegrationList() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<ConnectionStatus>();
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const [verifying, setVerifying] = useState<Connection | null>(null);
  const query = useConnections({ q, status, page });
  // "Check with JournL" only appears once JournL's partner API exists; until then it could only fail.
  const apiAvailable = query.data?.journlApiAvailable ?? false;

  const columns = useMemo<Column<Connection>[]>(
    () => [
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
            {c.authorized_at && (
              <p className="text-muted-foreground text-xs">
                Authorized {formatDate(c.authorized_at, true)}{c.authorized_by_name ? ` by ${c.authorized_by_name}` : ""}
              </p>
            )}
          </div>
        ),
      },
      { key: "status", header: "Status", cell: (c) => <StatusBadge status={c.status} /> },
      { key: "verified", header: "Verified", hideOnMobile: true, cell: (c) => <Verification c={c} /> },
      { key: "error", header: "Last error", hideOnMobile: true, cell: (c) => <span className="text-destructive text-xs">{c.last_error ?? "—"}</span> },
      {
        key: "action",
        header: "",
        className: "text-right",
        cell: (c) =>
          c.status === "disconnected" ? null : (
            <div className="flex justify-end gap-2">
              {(c.status === "pending" || c.status === "error" || (c.status === "connected" && !c.verified_at)) && (
                <Button size="sm" variant="outline" onClick={() => setVerifying(c)}>Mark verified</Button>
              )}
              {apiAvailable && <CheckWithJournlButton connection={c} />}
            </div>
          ),
      },
    ],
    [apiAvailable],
  );

  return (
    <>
      <PageHeader
        title="Integrations"
        description="Where each client's books live. Accountanz never keeps the ledger itself."
        actions={<Button onClick={() => setAdding(true)}><Plus className="size-4" /> Add connection</Button>}
      />
      <p className="text-muted-foreground -mt-3 mb-4 text-xs">
        Clients request a connection from their portal and it shows here as Pending. Check the organisation in JournL, then use Mark verified with a note on how you checked it. Connections marked &ldquo;not verified&rdquo; were approved before checks were recorded; verify them the same way. That is a manual check, not JournL API access{apiAvailable ? "; use Check with JournL to confirm access through the API." : ": JournL has no partner API yet, so access can't be checked automatically."}
      </p>
      <div className="bg-card rounded-xl border shadow-xs">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row">
          <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search organisation" />
          <FilterSelect allLabel="All statuses" value={status} onChange={(v) => { setStatus(v as ConnectionStatus | undefined); setPage(1); }} options={CONNECTION_STATUSES.map((s) => ({ value: s, label: humanize(s) }))} />
        </div>
        <DataTable
          columns={columns}
          rows={query.data?.items}
          rowKey={(c) => c.id}
          isLoading={query.isLoading}
          error={query.error}
          onRetry={() => void query.refetch()}
          empty={{ title: q || status ? "No connections match" : "No connections yet" }}
          pagination={query.data && { ...query.data, onPageChange: setPage }}
        />
      </div>
      <ConnectionFormDialog open={adding} onOpenChange={setAdding} />
      <VerifyConnectionDialog connection={verifying} onClose={() => setVerifying(null)} />
    </>
  );
}
