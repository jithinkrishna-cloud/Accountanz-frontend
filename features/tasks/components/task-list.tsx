"use client";

import { Plus, Sparkles } from "lucide-react";
import { useState } from "react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { FilterSelect } from "@/components/shared/filter-select";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { useSession } from "@/features/auth/hooks/use-session";
import { formatDate, formatPeriod, humanize } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useTaskClients, useTasks } from "../hooks/use-tasks";
import type { TaskPortal } from "../services/task-service";
import { TASK_SOURCES, TASK_STATUSES, type TaskListItem, type TaskSource, type TaskStatus } from "../types/task.types";
import { GenerateTasksDialog } from "./generate-tasks-dialog";
import { TaskDetailSheet } from "./task-detail-sheet";
import { TaskFormDialog } from "./task-form-dialog";

const today = () => new Date().toISOString().slice(0, 10);
const MANAGER_ROLES = ["super_admin", "ops_admin", "finance_manager", "cfo"];

const SOURCE_LABEL: Record<TaskSource, string> = { template: "Template", manual: "One-off" };

const columns = (portal: TaskPortal, showClient = true): Column<TaskListItem>[] => [
  { key: "task", header: "Task", cell: (t) => <span className="font-medium">{t.title}</span> },
  ...(showClient ? [{ key: "client", header: "Client", cell: (t: TaskListItem) => t.client_name }] : []),
  { key: "period", header: "Period", hideOnMobile: true, cell: (t) => <span className="whitespace-nowrap">{formatPeriod(t.period)}</span> },
  ...(portal === "admin"
    ? [{ key: "assignee", header: "Assignee", hideOnMobile: true, cell: (t: TaskListItem) => <span className="text-muted-foreground">{t.assignee_email ?? "Unassigned"}</span> }]
    : []),
  {
    key: "due",
    header: "Due",
    hideOnMobile: true,
    cell: (t) => {
      const overdue = !!t.due_date && t.status !== "approved" && t.due_date < today();
      return <span className={cn("whitespace-nowrap tabular-nums", overdue && "text-destructive font-medium")}>{formatDate(t.due_date)}</span>;
    },
  },
  { key: "source", header: "Source", hideOnMobile: true, cell: (t) => <span className="bg-secondary rounded px-1.5 py-0.5 text-xs">{SOURCE_LABEL[t.source]}</span> },
  { key: "status", header: "Status", cell: (t) => <StatusBadge status={t.status} /> },
];

/** My Tasks client navigation: all clients, then each client with its open and overdue counts. */
function ClientNav({ scope, value, onChange }: { scope: "mine" | "clients"; value?: number; onChange: (id?: number) => void }) {
  const clients = useTaskClients(scope);
  const rows = clients.data ?? [];
  const open = rows.reduce((n, c) => n + c.open, 0);
  const overdue = rows.reduce((n, c) => n + c.overdue, 0);
  const item = (key: string, label: string, selected: boolean, onClick: () => void, counts: { open: number; overdue: number }) => (
    <li key={key} className="shrink-0">
      <button
        type="button"
        onClick={onClick}
        aria-current={selected ? "true" : undefined}
        className={cn(
          "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors",
          selected ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-foreground",
        )}
      >
        <span className="truncate">{label}</span>
        <span className="flex shrink-0 items-center gap-1.5 text-xs">
          {counts.overdue > 0 && <span className="rounded-full bg-red-50 px-1.5 py-0.5 font-medium text-red-700 ring-1 ring-red-200 ring-inset" title={`${counts.overdue} overdue`}>{counts.overdue} late</span>}
          <span className="text-muted-foreground tabular-nums" title={`${counts.open} open`}>{counts.open}</span>
        </span>
      </button>
    </li>
  );
  return (
    <nav aria-label="Clients" className="bg-card rounded-xl border p-2 shadow-xs lg:sticky lg:top-20 lg:self-start">
      <p className="text-muted-foreground hidden px-3 pt-1 pb-2 text-xs font-medium tracking-wide uppercase lg:block">Clients</p>
      <ul className="no-scrollbar flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
        {item("all", "All clients", value === undefined, () => onChange(undefined), { open, overdue })}
        {clients.isLoading
          ? <li className="text-muted-foreground px-3 py-2 text-xs">Loading…</li>
          : rows.map((c) => item(String(c.client_id), c.client_name, value === c.client_id, () => onChange(c.client_id), c))}
      </ul>
      <p className="text-muted-foreground hidden px-3 pt-2 text-[11px] lg:block">Number = open tasks</p>
    </nav>
  );
}

export function TaskList({ portal = "admin" }: { portal?: TaskPortal }) {
  const { data: user } = useSession();
  const isManager = !!user && MANAGER_ROLES.includes(user.role);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<TaskStatus>();
  const [source, setSource] = useState<TaskSource>();
  const [scope, setScope] = useState<"mine" | "clients">("mine");
  const [clientId, setClientId] = useState<number>();
  const [page, setPage] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [creating, setCreating] = useState(false);
  const [openTaskId, setOpenTaskId] = useState<number | null>(null);
  const query = useTasks({ q, status, source, page, scope: portal === "team" ? scope : undefined, client_id: portal === "team" ? clientId : undefined }, portal);
  const filtered = !!(q || status || source);

  const header =
    portal === "admin" ? (
      <PageHeader
        title="Task Management"
        description="Every task across every client, and the bulk generation for a period."
        actions={
          <>
            <Button variant="outline" onClick={() => setCreating(true)}><Plus className="size-4" /> New task</Button>
            <Button onClick={() => setGenerating(true)}><Sparkles className="size-4" /> Generate tasks</Button>
          </>
        }
      />
    ) : (
      <PageHeader
        title="My Tasks"
        description={scope === "mine" ? "Every task assigned to you. Open one to work through its checklist, log time and submit." : "Every task on the clients you're assigned to."}
        actions={isManager && <Button onClick={() => setCreating(true)}><Plus className="size-4" /> New task</Button>}
      />
    );

  return (
    <>
      {header}
      {portal === "team" && isManager && (
        <div role="tablist" aria-label="Which tasks" className="bg-muted mb-4 inline-flex rounded-lg p-1">
          {(["mine", "clients"] as const).map((s) => (
            <button
              key={s}
              role="tab"
              aria-selected={scope === s}
              onClick={() => { setScope(s); setClientId(undefined); setPage(1); }}
              className={cn("rounded-md px-3 py-1.5 text-sm font-medium", scope === s ? "bg-card shadow-xs" : "text-muted-foreground hover:text-foreground")}
            >
              {s === "mine" ? "Assigned to me" : "All my clients"}
            </button>
          ))}
        </div>
      )}
      <div className={cn(portal === "team" && "grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]")}>
      {portal === "team" && <ClientNav scope={scope} value={clientId} onChange={(id) => { setClientId(id); setPage(1); }} />}
      <div className="bg-card min-w-0 rounded-xl border shadow-xs">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row">
          <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search tasks" />
          <FilterSelect allLabel="All statuses" value={status} onChange={(v) => { setStatus(v as TaskStatus | undefined); setPage(1); }} options={TASK_STATUSES.map((s) => ({ value: s, label: humanize(s) }))} />
          <FilterSelect allLabel="All sources" value={source} onChange={(v) => { setSource(v as TaskSource | undefined); setPage(1); }} options={TASK_SOURCES.map((s) => ({ value: s, label: SOURCE_LABEL[s] }))} />
        </div>
        <DataTable
          columns={columns(portal, !clientId)}
          rows={query.data?.items}
          rowKey={(t) => t.id}
          isLoading={query.isLoading}
          error={query.error}
          onRetry={() => void query.refetch()}
          onRowClick={(t) => setOpenTaskId(t.id)}
          empty={
            filtered
              ? { title: "No tasks match", description: "Try a different search or filter." }
              : portal === "admin"
                ? { title: "No tasks yet", description: "Generate a period's tasks from your templates.", action: <Button size="sm" onClick={() => setGenerating(true)}>Generate tasks</Button> }
                : { title: "Nothing assigned to you", description: "Tasks assigned to you appear here as soon as they're created." }
          }
          pagination={query.data && { ...query.data, onPageChange: setPage }}
        />
      </div>
      </div>
      {portal === "admin" && <GenerateTasksDialog open={generating} onOpenChange={setGenerating} />}
      <TaskFormDialog portal={portal} open={creating} onOpenChange={setCreating} onSaved={(t) => setOpenTaskId(t.id)} />
      <TaskDetailSheet portal={portal} taskId={openTaskId} onClose={() => setOpenTaskId(null)} />
    </>
  );
}
