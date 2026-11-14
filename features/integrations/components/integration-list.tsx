"use client";

import { KeyRound } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { FilterSelect } from "@/components/shared/filter-select";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useConnections } from "../hooks/use-integrations";
import { integrationService } from "../services/integration-service";
import type { Connection, ConnectionStatus } from "../types/integration.types";
import { JournlDataSheet, ViewJournlDataButton } from "./journl-data-sheet";

/** Only a JournL sign-in proves the company is the client's; anything else is shown as not confirmed. */
const signedIn = (c: Connection) => c.verification_note?.startsWith("Confirmed by JournL sign-in") ?? false;

type State = "connected" | "unconfirmed" | "disconnected";
const stateOf = (c: Connection): State => (c.status === "disconnected" ? "disconnected" : c.status === "connected" && signedIn(c) ? "connected" : "unconfirmed");

const STATE_LABEL: Record<State, { label: string; tone: string }> = {
  connected: { label: "Connected", tone: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900" },
  unconfirmed: { label: "Not confirmed", tone: "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900" },
  disconnected: { label: "Disconnected", tone: "bg-muted text-muted-foreground ring-border" },
};

function StateBadge({ c }: { c: Connection }) {
  const s = STATE_LABEL[stateOf(c)];
  return <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1", s.tone)}>{s.label}</span>;
}

/** Whether Accountanz can read the books now, or what has to happen first. */
function DataAccess({ c }: { c: Connection }) {
  const state = stateOf(c);
  if (state === "disconnected") return <span className="text-muted-foreground text-xs">Disconnected by the owner{c.disconnected_at ? ` · ${formatDate(c.disconnected_at, true)}` : ""}</span>;
  if (state === "unconfirmed") return <span className="text-xs text-amber-700 dark:text-amber-400">Ask the owner to sign in with JournL from their portal</span>;
  if (c.journl_session_until) return <span className="text-xs text-emerald-700 dark:text-emerald-400">Readable until {formatDate(c.journl_session_until, true)}</span>;
  return <span className="text-xs text-amber-700 dark:text-amber-400">Session expired · ask the owner to refresh it</span>;
}

const FILTERS: { value: ConnectionStatus; label: string }[] = [
  { value: "connected", label: "Connected" },
  { value: "pending", label: "Pending" },
  { value: "disconnected", label: "Disconnected" },
];

/** Admin → Integrations: each client's JournL connection and whether its books can be read right now. Read-only. */
export function IntegrationList() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<ConnectionStatus>();
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState<Connection | null>(null);
  const query = useConnections({ q, status, page });

  const columns = useMemo<Column<Connection>[]>(
    () => [
      { key: "client", header: "Client", cell: (c) => <span className="font-medium">{c.client_name}</span> },
      {
        key: "org",
        header: "JournL company",
        hideOnMobile: true,
        cell: (c) => (
          <div className="min-w-0">
            <p className="truncate">{c.external_org_name ?? "—"}</p>
            {c.external_org_id && <p className="text-muted-foreground font-mono text-xs">ID {c.external_org_id}</p>}
          </div>
        ),
      },
      {
        key: "status",
        header: "Status",
        cell: (c) => (
          <div>
            <StateBadge c={c} />
            {signedIn(c) && c.authorized_by_name && c.authorized_at && (
              <p className="text-muted-foreground mt-1 text-xs whitespace-nowrap">Signed in by {c.authorized_by_name} · {formatDate(c.authorized_at)}</p>
            )}
          </div>
        ),
      },
      { key: "access", header: "Data access", hideOnMobile: true, cell: (c) => <DataAccess c={c} /> },
      {
        key: "action",
        header: "",
        className: "text-right",
        cell: (c) => (stateOf(c) === "connected" && c.journl_session_until ? <ViewJournlDataButton onClick={() => setViewing(c)} /> : null),
      },
    ],
    [],
  );

  return (
    <>
      <PageHeader
        title="Integrations"
        description="Each client's JournL connection and whether Accountanz can read their books right now."
        actions={
          <Button asChild variant="outline">
            <Link href="/admin/journl-access"><KeyRound className="size-4" aria-hidden /> JournL Access</Link>
          </Button>
        }
      />
      <p className="text-muted-foreground -mt-3 mb-4 max-w-3xl text-xs">
        Clients connect from their portal with <span className="text-foreground font-medium">Sign in with JournL</span>: JournL confirms the company is theirs, and Accountanz can
        read the books for 8 hours per sign-in. The owner refreshes it from the same page. Which accountant can read which module is set under JournL Access.
      </p>
      <div className="bg-card min-w-0 overflow-hidden rounded-xl border shadow-xs">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row">
          <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search client or company" />
          <FilterSelect allLabel="All statuses" value={status} onChange={(v) => { setStatus(v as ConnectionStatus | undefined); setPage(1); }} options={FILTERS} />
        </div>
        <DataTable
          columns={columns}
          rows={query.data?.items}
          rowKey={(c) => c.id}
          isLoading={query.isLoading}
          error={query.error}
          onRetry={() => void query.refetch()}
          empty={{ title: q || status ? "No connections match" : "No client has connected JournL yet", description: q || status ? undefined : "Owners connect from their portal: Accounting Software → Sign in with JournL." }}
          pagination={query.data && { ...query.data, onPageChange: setPage }}
        />
      </div>
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
