"use client";

import { Check, CircleDashed, KeyRound, Minus, PlugZap } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { ErrorState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TEAM_ROLE_LABELS, type TeamRole } from "@/features/assignments/types/assignment.types";
import { formatDate, humanize } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useJournlAccessOverview } from "../hooks/use-journl-permissions";
import type { JournlAccessOverview } from "../types/journl-permission.types";
import { ModulePermissionsDialog } from "./module-permissions-dialog";

type Client = JournlAccessOverview["clients"][number];

function Chip({ tone, children }: { tone: "good" | "warn" | "muted"; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        tone === "good" && "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
        tone === "warn" && "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200",
        tone === "muted" && "bg-muted text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}

/** One client's JournL state: connection, session (can the team read right now?) and engagement. */
function ClientStatus({ c }: { c: Client }) {
  const conn = c.connection;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {!conn ? (
        <Chip tone="muted">JournL not connected</Chip>
      ) : conn.status === "connected" ? (
        <Chip tone="good">Connected{conn.org_id ? ` · ${conn.org_id}` : ""}</Chip>
      ) : (
        <Chip tone="warn">JournL {humanize(conn.status).toLowerCase()}</Chip>
      )}
      {conn?.status === "connected" &&
        (conn.session_until ? <Chip tone="good">Readable until {formatDate(conn.session_until, true)}</Chip> : <Chip tone="warn">Session expired · owner must refresh</Chip>)}
      {c.engagement_active ? <Chip tone="good">Engagement active</Chip> : <Chip tone="warn">No active engagement</Chip>}
    </div>
  );
}

function ModuleCell({ m }: { m?: { granted: boolean; effective: boolean; reason: string | null } }) {
  if (!m?.granted) return <Minus className="text-muted-foreground/50 mx-auto size-4" aria-label="Not granted" />;
  if (m.effective) return <Check className="mx-auto size-4 text-emerald-600" aria-label="Can read" />;
  return (
    <span title={m.reason ?? "Granted, not in effect"} className="flex justify-center">
      <CircleDashed className="size-4 text-amber-600" aria-label={`Granted, not in effect: ${m.reason ?? ""}`} />
    </span>
  );
}

function ClientCard({ c, modules, onEdit }: { c: Client; modules: JournlAccessOverview["modules"]; onEdit: (p: { id: number; full_name: string; client_name: string }) => void }) {
  return (
    <section className="bg-card min-w-0 rounded-xl border shadow-xs">
      <div className="flex flex-col gap-2 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="truncate font-medium">{c.client_name}</h2>
          {c.connection?.org_name && <p className="text-muted-foreground truncate text-xs">JournL: {c.connection.org_name}</p>}
        </div>
        <ClientStatus c={c} />
      </div>
      {c.people.length === 0 ? (
        <p className="text-muted-foreground px-5 py-4 text-sm">
          No one is assigned today. <Link href={`/admin/assignments?clientId=${c.client_id}`} className="text-primary hover:underline">Assign an accountant</Link>
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground text-xs">
              <tr className="border-b">
                <th className="px-5 py-2 text-left font-normal">Accountant</th>
                <th className="px-2 py-2 text-center font-normal">JournL access</th>
                {modules.map((m) => (
                  <th key={m.key} className="px-2 py-2 text-center font-normal whitespace-nowrap" title={`JournL features ${m.journl_features ?? "—"}`}>{m.label}</th>
                ))}
                <th className="px-5 py-2" />
              </tr>
            </thead>
            <tbody>
              {c.people.map((p) => (
                <tr key={p.assignment_id} className="border-b last:border-b-0">
                  <td className="px-5 py-2.5">
                    <p className="font-medium whitespace-nowrap">{p.full_name}</p>
                    <p className="text-muted-foreground text-xs">{TEAM_ROLE_LABELS[p.team_role as TeamRole] ?? humanize(p.team_role)}</p>
                  </td>
                  <td className="px-2 py-2.5 text-center">{p.journl_access ? <Chip tone="good">On</Chip> : <Chip tone="muted">Off</Chip>}</td>
                  {modules.map((m) => (
                    <td key={m.key} className="px-2 py-2.5"><ModuleCell m={p.modules[m.key]} /></td>
                  ))}
                  <td className="px-5 py-2.5 text-right">
                    <Button size="sm" variant="ghost" onClick={() => onEdit({ id: p.assignment_id, full_name: p.full_name, client_name: c.client_name })}>
                      <KeyRound className="size-4" aria-hidden /> Modules
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/** Admin → JournL Access: who can read what in each client's JournL today, and whether the client's session is live. */
export function JournlAccessOverviewView() {
  const { data, isLoading, error, refetch } = useJournlAccessOverview();
  const [q, setQ] = useState("");
  const [onlyConnected, setOnlyConnected] = useState(false);
  const [editing, setEditing] = useState<{ id: number; full_name: string; client_name: string } | null>(null);

  const header = (
    <PageHeader
      title="JournL Access"
      description="Each client's JournL connection and session, and which JournL modules each assigned accountant can read today."
      actions={<Button asChild variant="outline"><Link href="/admin/integrations"><PlugZap className="size-4" aria-hidden /> Integrations</Link></Button>}
    />
  );
  if (error) return <>{header}<ErrorState error={error} onRetry={() => void refetch()} /></>;
  if (isLoading || !data) return <>{header}<div className="grid gap-4"><Skeleton className="h-40 rounded-xl" /><Skeleton className="h-40 rounded-xl" /></div></>;

  const clients = data.clients.filter(
    (c) => (!q || c.client_name.toLowerCase().includes(q.toLowerCase())) && (!onlyConnected || c.connection?.status === "connected"),
  );
  const live = data.clients.filter((c) => c.connection?.status === "connected" && c.connection.session_until).length;
  const connected = data.clients.filter((c) => c.connection?.status === "connected").length;

  return (
    <>
      {header}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput value={q} onChange={setQ} placeholder="Search clients" />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="accent-primary size-4" checked={onlyConnected} onChange={(e) => setOnlyConnected(e.target.checked)} />
          Connected to JournL only
        </label>
        <p className="text-muted-foreground text-sm sm:ml-auto">
          {connected} connected · {live} with a live session
        </p>
      </div>
      <div className="text-muted-foreground mb-4 flex flex-wrap items-center gap-4 text-xs">
        <span className="flex items-center gap-1.5"><Check className="size-4 text-emerald-600" aria-hidden /> Can read</span>
        <span className="flex items-center gap-1.5"><CircleDashed className="size-4 text-amber-600" aria-hidden /> Granted, not in effect (hover for why)</span>
        <span className="flex items-center gap-1.5"><Minus className="size-4" aria-hidden /> Not granted</span>
        <span>Read-only for now. The client&apos;s JournL plan also applies.</span>
      </div>
      {clients.length === 0 ? (
        <p className="text-muted-foreground bg-card rounded-xl border px-6 py-12 text-center text-sm">No clients match.</p>
      ) : (
        <div className="grid gap-4">
          {clients.map((c) => <ClientCard key={c.client_id} c={c} modules={data.modules} onEdit={setEditing} />)}
        </div>
      )}
      <ModulePermissionsDialog assignment={editing} onClose={() => setEditing(null)} />
    </>
  );
}
