"use client";

import { useState } from "react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { FilterSelect } from "@/components/shared/filter-select";
import { SearchInput } from "@/components/shared/search-input";
import { StatusBadge } from "@/components/shared/status-badge";
import { TaskDetailSheet } from "@/features/tasks/components/task-detail-sheet";
import { formatDate, formatPeriod } from "@/lib/format";
import { cn } from "@/lib/utils";
import { usePersonTasks } from "../hooks/use-progress";
import { TASK_VIEWS, type PersonTask, type PersonTaskView } from "../types/progress.types";

const VIEW_LABELS: Record<PersonTaskView, string> = {
  open: "Open",
  overdue: "Overdue",
  review: "Waiting for review",
  returned: "Returned",
  approved: "Approved",
  all: "All",
};

/** Every task assigned to one person, by view; a row opens the task in the side panel. */
export function PersonTasks({ userId, clients, initialView = "open" }: { userId: number; clients: { value: string; label: string }[]; initialView?: PersonTaskView }) {
  const [view, setView] = useState<PersonTaskView>(initialView);
  const [q, setQ] = useState("");
  const [clientId, setClientId] = useState<string>();
  const [page, setPage] = useState(1);
  const [openTask, setOpenTask] = useState<number | null>(null);
  const { data, isLoading, error, refetch } = usePersonTasks(userId, { view, q: q.trim() || undefined, client_id: clientId ? Number(clientId) : undefined, page });

  const reset = <T,>(fn: (v: T) => void) => (v: T) => { fn(v); setPage(1); };

  const columns: Column<PersonTask>[] = [
    {
      key: "task",
      header: "Task",
      cell: (t) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{t.title}</p>
          <p className="text-muted-foreground truncate text-xs">{t.client_name} · {formatPeriod(t.period)}</p>
        </div>
      ),
    },
    { key: "status", header: "Status", cell: (t) => <StatusBadge status={t.status} /> },
    {
      key: "due",
      header: "Due",
      cell: (t) =>
        t.due_date ? (
          <span className={cn("text-xs whitespace-nowrap", t.overdue ? "text-destructive font-medium" : "text-muted-foreground")}>
            {t.overdue && "Overdue · "}{formatDate(t.due_date)}
          </span>
        ) : <span className="text-muted-foreground text-xs">—</span>,
    },
    { key: "reviewer", header: "Reviewer", hideOnMobile: true, cell: (t) => <span className="text-muted-foreground text-xs">{t.reviewer_name ?? "—"}</span> },
    { key: "hours", header: "Hours", hideOnMobile: true, className: "text-right", cell: (t) => <span className={cn("tabular-nums", t.hours === 0 && "text-muted-foreground")}>{t.hours}</span> },
  ];

  return (
    <>
      <div role="tablist" aria-label="Task view" className="mb-4 flex flex-wrap gap-2">
        {TASK_VIEWS.map((v) => {
          const active = v === view;
          const n = data?.counts[v];
          return (
            <button
              key={v}
              role="tab"
              aria-selected={active}
              onClick={() => reset(setView)(v)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors",
                active ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground",
              )}
            >
              {VIEW_LABELS[v]}
              {n !== undefined && <span className={cn("tabular-nums text-xs", !active && v === "overdue" && n > 0 && "text-destructive font-medium")}>{n}</span>}
            </button>
          );
        })}
      </div>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <SearchInput value={q} onChange={reset(setQ)} placeholder="Search task or client" />
        <FilterSelect value={clientId} onChange={reset(setClientId)} options={clients} allLabel="All clients" className="sm:w-56" />
      </div>
      <DataTable
        columns={columns}
        rows={data?.items}
        rowKey={(t) => t.id}
        isLoading={isLoading}
        error={error}
        onRetry={() => void refetch()}
        onRowClick={(t) => setOpenTask(t.id)}
        empty={{ title: `No ${VIEW_LABELS[view].toLowerCase()} tasks`, description: q || clientId ? "Try a different search or client." : undefined }}
        pagination={data ? { page: data.page, pageSize: data.pageSize, total: data.total, onPageChange: setPage } : undefined}
      />
      <TaskDetailSheet portal="admin" taskId={openTask} onClose={() => { setOpenTask(null); void refetch(); }} />
    </>
  );
}
