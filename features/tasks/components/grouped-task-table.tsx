"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import type { Column } from "@/components/shared/data-table";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { TaskListItem } from "../types/task.types";

interface Props {
  columns: Column<TaskListItem>[];
  rows?: TaskListItem[];
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
  onRowClick: (t: TaskListItem) => void;
  isLate: (t: TaskListItem) => boolean;
  empty: { title: string; description: string; action?: React.ReactNode };
  pagination?: { page: number; pageSize: number; total: number; onPageChange: (p: number) => void };
}

/** Tasks in one collapsible section per client (rows arrive sorted by client from the API). */
export function GroupedTaskTable({ columns, rows, isLoading, error, onRetry, onRowClick, isLate, empty, pagination }: Props) {
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  if (error) return <ErrorState error={error} onRetry={onRetry} />;
  if (isLoading || !rows) return <div className="space-y-2 p-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>;
  if (rows.length === 0) return <EmptyState {...empty} />;

  const groups: { id: number; name: string; tasks: TaskListItem[] }[] = [];
  for (const t of rows) {
    const last = groups.at(-1);
    if (last && last.id === t.client_id) last.tasks.push(t);
    else groups.push({ id: t.client_id, name: t.client_name, tasks: [t] });
  }
  const toggle = (id: number) => setCollapsed((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const allCollapsed = groups.every((g) => collapsed.has(g.id));
  const colClass = (c: Column<TaskListItem>) => cn(c.className, c.hideOnMobile && "hidden md:table-cell");
  const pages = pagination ? Math.max(1, Math.ceil(pagination.total / pagination.pageSize)) : 1;

  return (
    <div>
      <div className="flex items-center justify-between border-b px-4 py-2 text-sm">
        <span className="text-muted-foreground">{groups.length} client{groups.length === 1 ? "" : "s"} · {rows.length} task{rows.length === 1 ? "" : "s"}{pagination && pages > 1 ? " on this page" : ""}</span>
        <Button variant="ghost" size="sm" onClick={() => setCollapsed(allCollapsed ? new Set() : new Set(groups.map((g) => g.id)))}>
          {allCollapsed ? "Expand all" : "Collapse all"}
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b">
            <tr className="text-muted-foreground text-left text-xs uppercase">
              {columns.map((c) => <th key={c.key} className={cn("px-4 py-2 font-medium", colClass(c))}>{c.header}</th>)}
            </tr>
          </thead>
          {groups.map((g) => {
            const open = !collapsed.has(g.id);
            const late = g.tasks.filter(isLate).length;
            return (
              <tbody key={g.id} className="border-b last:border-b-0">
                <tr className="bg-muted/40 hover:bg-muted/70 cursor-pointer" onClick={() => toggle(g.id)}>
                  <td colSpan={columns.length} className="px-4 py-2">
                    <span className="flex items-center gap-2 font-semibold">
                      {open ? <ChevronDown className="size-4" aria-hidden /> : <ChevronRight className="size-4" aria-hidden />}
                      {g.name}
                      <span className="text-muted-foreground text-xs font-normal">{g.tasks.length} task{g.tasks.length === 1 ? "" : "s"}</span>
                      {late > 0 && <span className="rounded-full bg-red-50 px-1.5 py-0.5 text-xs font-medium text-red-700 ring-1 ring-red-200 ring-inset dark:bg-red-950 dark:text-red-300 dark:ring-red-900">{late} late</span>}
                    </span>
                  </td>
                </tr>
                {open && g.tasks.map((t) => (
                  <tr key={t.id} className="hover:bg-muted/40 cursor-pointer border-t" onClick={() => onRowClick(t)}>
                    {columns.map((c) => <td key={c.key} className={cn("px-4 py-2.5 first:pl-10", colClass(c))}>{c.cell(t)}</td>)}
                  </tr>
                ))}
              </tbody>
            );
          })}
        </table>
      </div>
      {pagination && pages > 1 && (
        <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
          <span className="text-muted-foreground">Page {pagination.page} of {pages} · {pagination.total} tasks</span>
          <span className="flex gap-2">
            <Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => pagination.onPageChange(pagination.page - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={pagination.page >= pages} onClick={() => pagination.onPageChange(pagination.page + 1)}>Next</Button>
          </span>
        </div>
      )}
    </div>
  );
}
