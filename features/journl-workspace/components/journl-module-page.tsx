"use client";

import { ArrowLeft, Lock, PlugZap } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { ErrorState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { JournlOverviewPanel } from "@/features/integrations/components/journl-data-sheet";
import { formatDate, formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useJournlView, useJournlWorkspace } from "../hooks/use-journl-workspace";
import { journlWorkspaceService } from "../services/journl-workspace-service";
import { JOURNL_MODULE_META, type ColumnKind, type JournlViewResult, type JournlWorkspaceClient } from "../types/journl-workspace.types";

function Notice({ icon: Icon, title, children }: { icon: typeof Lock; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card flex flex-col items-center gap-2 rounded-xl border px-6 py-14 text-center">
      <Icon className="text-muted-foreground size-7" aria-hidden />
      <p className="font-medium">{title}</p>
      <p className="text-muted-foreground max-w-md text-sm">{children}</p>
    </div>
  );
}

function cell(value: string | number | null | undefined, kind?: ColumnKind) {
  if (value == null || value === "") return <span className="text-muted-foreground">—</span>;
  if (kind === "money") return <span className="tabular-nums">{formatINR(Number(value), true)}</span>;
  if (kind === "date") return <span className="whitespace-nowrap tabular-nums">{formatDate(String(value))}</span>;
  if (kind === "mono") return <span className="font-mono text-xs">{value}</span>;
  return <span className="block max-w-64 truncate">{value}</span>;
}

function ViewTable({ data, onDrill }: { data: JournlViewResult; onDrill: (row: Record<string, string | number | null>) => void }) {
  if (data.rows.length === 0) return <p className="text-muted-foreground px-5 py-12 text-center text-sm">Nothing in JournL for this {data.uses_period ? "period" : "client"}.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-muted-foreground border-b text-xs">
          <tr>
            {data.columns.map((c) => (
              <th key={c.key} className={cn("px-4 py-2.5 font-normal", c.kind === "money" ? "text-right" : "text-left")}>{c.label}</th>
            ))}
            {data.drill && <th className="w-24 px-4 py-2.5" />}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((r, i) => (
            <tr key={String(r.id ?? i)} className="border-b last:border-b-0">
              {data.columns.map((c) => (
                <td key={c.key} className={cn("px-4 py-2", c.kind === "money" && "text-right")}>{cell(r[c.key], c.kind)}</td>
              ))}
              {data.drill && (
                <td className="px-4 py-2 text-right">
                  <Button size="sm" variant="ghost" onClick={() => onDrill(r)}>{data.drill.label}</Button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** One JournL view: period/search filters, the table and paging; rows with a drill-down open the linked view. */
function ViewPanel({ client, view, ledger }: { client: JournlWorkspaceClient; view: string; ledger?: { id: number; name: string } }) {
  const [draft, setDraft] = useState<{ from?: string; to?: string }>({});
  const [period, setPeriod] = useState<{ from?: string; to?: string }>({});
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [drill, setDrill] = useState<{ view: string; id: number; name: string } | null>(null);
  const query = useJournlView(client.client_id, view, { ...period, page, search: search || undefined, ledger_id: ledger?.id });

  if (drill) {
    return (
      <div>
        <div className="flex items-center gap-2 border-b px-4 py-2.5">
          <Button size="sm" variant="ghost" onClick={() => setDrill(null)}><ArrowLeft className="size-4" aria-hidden /> Back</Button>
          <span className="text-sm font-medium">{drill.name}</span>
        </div>
        <ViewPanel client={client} view={drill.view} ledger={{ id: drill.id, name: drill.name }} />
      </div>
    );
  }

  const data = query.data;
  const pages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;
  const isVoucherList = data?.columns.some((c) => c.key === "number") && data?.uses_period && !ledger;

  return (
    <>
      {(data?.uses_period ?? true) || isVoucherList ? (
        <form
          className="flex flex-wrap items-end gap-3 border-b px-4 py-3"
          onSubmit={(e) => {
            e.preventDefault();
            setPeriod(draft);
            setPage(1);
          }}
        >
          {(data?.uses_period ?? true) && (
            <>
              <div className="grid gap-1">
                <Label htmlFor={`${view}-from`} className="text-xs">From</Label>
                <Input id={`${view}-from`} type="date" className="h-8 w-40" value={draft.from ?? data?.period.from ?? ""} onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))} />
              </div>
              <div className="grid gap-1">
                <Label htmlFor={`${view}-to`} className="text-xs">To</Label>
                <Input id={`${view}-to`} type="date" className="h-8 w-40" value={draft.to ?? data?.period.to ?? ""} onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))} />
              </div>
              <Button type="submit" size="sm" variant="outline" disabled={query.isFetching}>Apply</Button>
            </>
          )}
          {isVoucherList && (
            <div className="ml-auto w-full sm:w-64">
              <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search vouchers" />
            </div>
          )}
        </form>
      ) : null}

      {query.error ? (
        <ErrorState className="m-4" error={query.error} onRetry={() => void query.refetch()} />
      ) : query.isLoading || !data ? (
        <div className="grid gap-2 p-4">
          {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-8 w-full" />)}
        </div>
      ) : (
        <div className={cn(query.isFetching && "opacity-60 transition-opacity")}>
          <ViewTable
            data={data}
            onDrill={(r) => data.drill && setDrill({ view: data.drill.view, id: Number(r[data.drill.rowKey]), name: String(r.name ?? r.number ?? "Ledger") })}
          />
          {data.total > data.page_size && (
            <div className="flex items-center justify-between border-t px-4 py-2.5 text-sm">
              <span className="text-muted-foreground">
                {(data.page - 1) * data.page_size + 1}–{Math.min(data.page * data.page_size, data.total)} of {data.total}
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

/** "Accounting — JournL" page for one module: pick a client, then read its JournL records live (read-only). */
export function JournlModulePage({ moduleKey }: { moduleKey: string }) {
  const meta = JOURNL_MODULE_META[moduleKey]!;
  const router = useRouter();
  const params = useSearchParams();
  const ws = useJournlWorkspace();
  const [tab, setTab] = useState<string | null>(null);

  const header = <PageHeader title={meta.label} description={`${meta.description} Read-only: changes are made in JournL.`} />;
  if (ws.error) return <>{header}<ErrorState error={ws.error} onRetry={() => void ws.refetch()} /></>;
  if (ws.isLoading || !ws.data) return <>{header}<Skeleton className="h-64 w-full rounded-xl" /></>;

  const eligible = ws.data.clients.filter((c) => c.modules.includes(moduleKey));
  const wanted = Number(params.get("client"));
  const client = eligible.find((c) => c.client_id === wanted) ?? eligible[0] ?? null;
  const tabs = ws.data.modules.find((m) => m.key === moduleKey)?.tabs ?? [];
  const activeTab = tabs.find((t) => t.key === tab)?.key ?? tabs[0]?.key ?? null;

  const picker = eligible.length > 1 && client && (
    <Select value={String(client.client_id)} onValueChange={(v) => router.replace(`/team/journl/${moduleKey}?client=${v}`)}>
      <SelectTrigger className="w-full sm:w-72" aria-label="Client"><SelectValue /></SelectTrigger>
      <SelectContent>
        {eligible.map((c) => <SelectItem key={c.client_id} value={String(c.client_id)}>{c.client_name}</SelectItem>)}
      </SelectContent>
    </Select>
  );

  return (
    <>
      {header}
      {!client ? (
        <Notice icon={Lock} title={`No ${meta.label} access yet`}>
          None of your clients has granted you {meta.label} in JournL. An admin grants it under Assignments → JournL modules, and the client needs an active engagement.
        </Notice>
      ) : (
        <div className="grid gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="font-medium">{client.client_name}</p>
              <p className="text-muted-foreground text-xs">
                {client.org_name ? `JournL: ${client.org_name} · ID ${client.org_id}` : "JournL not connected"}
                {client.session_until && ` · readable until ${formatDate(client.session_until, true)}`}
              </p>
            </div>
            {picker}
          </div>

          {!client.connected ? (
            <Notice icon={PlugZap} title="JournL isn't connected">This client hasn&apos;t connected JournL yet. The owner does it from their portal (Accounting Software).</Notice>
          ) : !client.session_until ? (
            <Notice icon={PlugZap} title="JournL session expired">JournL sessions last 8 hours. Ask the client owner to refresh it from their portal (Accounting Software → Refresh JournL session).</Notice>
          ) : moduleKey === "financial_reports" ? (
            <div className="bg-card rounded-xl border shadow-xs">
              <JournlOverviewPanel
                key={client.client_id}
                source={{ key: ["team", "journl", "overview", client.client_id], load: (p) => journlWorkspaceService.overview(client.client_id, p) }}
              />
            </div>
          ) : (
            <div className="bg-card rounded-xl border shadow-xs">
              {tabs.length > 1 && (
                <div role="tablist" aria-label={`${meta.label} views`} className="flex gap-1 overflow-x-auto border-b px-3 pt-2">
                  {tabs.map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      role="tab"
                      aria-selected={t.key === activeTab}
                      onClick={() => setTab(t.key)}
                      className={cn(
                        "-mb-px border-b-2 px-3 py-2 text-sm whitespace-nowrap transition-colors",
                        t.key === activeTab ? "border-primary text-foreground font-medium" : "text-muted-foreground hover:text-foreground border-transparent",
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              )}
              {activeTab && <ViewPanel key={`${client.client_id}-${activeTab}`} client={client} view={activeTab} />}
            </div>
          )}
        </div>
      )}
    </>
  );
}
