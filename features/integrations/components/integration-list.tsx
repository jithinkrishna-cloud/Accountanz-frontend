"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
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
import { integrationService } from "../services/integration-service";
import { CONNECTION_STATUSES, type Connection, type ConnectionStatus } from "../types/integration.types";
import { ConnectionFormDialog } from "./connection-form-dialog";
import { JournlDataSheet, ViewJournlDataButton } from "./journl-data-sheet";
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

/** How the connection was confirmed, and whether Accountanz can read the books right now (JournL session). */
function Verification({ c }: { c: Connection }) {
  if (c.status === "disconnected") return <span className="text-muted-foreground text-xs">Disconnected {c.disconnected_at ? formatDate(c.disconnected_at, true) : ""}</span>;
  const signedIn = c.verification_note?.startsWith("Confirmed by JournL sign-in") ?? false;
  return (
    <div className="min-w-0 text-xs" title={c.verification_note ?? undefined}>
      {!c.verified_at ? (
        <p className="text-muted-foreground">Not verified</p>
      ) : (
        <p className="whitespace-nowrap">
          {signedIn ? "JournL sign-in" : "Checked by hand"} · {formatDate(c.verified_at, true)}
        </p>
      )}
      {c.status === "connected" &&
        (c.journl_session_until ? (
          <p className="text-emerald-700 dark:text-emerald-400">Readable until {formatDate(c.journl_session_until, true)}</p>
        ) : signedIn ? (
          <p className="text-amber-700 dark:text-amber-400">Session expired: owner must refresh</p>
        ) : (
          <p className="text-muted-foreground">No JournL session: owner signs in to enable data</p>
        ))}
    </div>
  );
}

export function IntegrationList() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<ConnectionStatus>();
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const [verifying, setVerifying] = useState<Connection | null>(null);
  const [viewing, setViewing] = useState<Connection | null>(null);
  const query = useConnections({ q, status, page });
  // "Check with JournL" only appears once JournL's partner API exists; until then it could only fail.
  const apiAvailable = query.data?.journlApiAvailable ?? false;

  const columns = useMemo<Column<Connection>[]>(
    () => [
      { key: "client", header: "Client", cell: (c) => <span className="font-medium">{c.client_name}</span> },
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
      {
        key: "status",
        header: "Status",
        cell: (c) => (
          <div>
            <StatusBadge status={c.status} />
            {c.last_error && <p className="text-destructive mt-1 max-w-48 truncate text-xs" title={c.last_error}>{c.last_error}</p>}
          </div>
        ),
      },
      { key: "verified", header: "Verified · data access", hideOnMobile: true, cell: (c) => <Verification c={c} /> },
      {
        key: "action",
        header: "",
        className: "text-right",
        cell: (c) =>
          c.status === "disconnected" ? null : (
            <div className="flex justify-end gap-2 whitespace-nowrap">
              {(c.status === "pending" || c.status === "error" || (c.status === "connected" && !c.verified_at)) && (
                <Button size="sm" variant="outline" onClick={() => setVerifying(c)}>Mark verified</Button>
              )}
              {c.status === "connected" && c.journl_session_until && <ViewJournlDataButton onClick={() => setViewing(c)} />}
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
      <p className="text-muted-foreground -mt-3 mb-4 max-w-4xl text-xs">
        Clients connect from their portal with <span className="text-foreground font-medium">Sign in with JournL</span>: JournL confirms the company, the connection shows here as
        Connected, and Accountanz can read the books for 8 hours per sign-in (the owner refreshes it from their portal). Connections added by organisation ID show as Pending or
        &ldquo;Not verified&rdquo;: check them in JournL and use Mark verified. Which accountant can read which module is managed under{" "}
        <Link href="/admin/journl-access" className="text-primary hover:underline">JournL Access</Link>.
      </p>
      <div className="bg-card min-w-0 overflow-hidden rounded-xl border shadow-xs">
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
      <JournlDataSheet
        source={
          viewing && {
            key: ["admin", "integrations", "journl-data", viewing.id],
            title: viewing.client_name,
            orgId: viewing.external_org_id,
            sessionUntil: viewing.journl_session_until,
            load: (period) => integrationService.journlData(viewing.id, period),
          }
        }
        onClose={() => setViewing(null)}
      />
    </>
  );
}
