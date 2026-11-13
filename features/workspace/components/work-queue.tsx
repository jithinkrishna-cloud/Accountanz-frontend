"use client";

import { useState } from "react";
import { FilterSelect } from "@/components/shared/filter-select";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/states";
import { Skeleton } from "@/components/ui/skeleton";
import { TaskDetailSheet } from "@/features/tasks/components/task-detail-sheet";
import { useTasks } from "@/features/tasks/hooks/use-tasks";
import type { TaskListItem, TaskStatus } from "@/features/tasks/types/task.types";
import { formatDate, formatPeriod } from "@/lib/format";
import { cn } from "@/lib/utils";

const COLUMNS: { status: TaskStatus; title: string; hint: string }[] = [
  { status: "todo", title: "To do", hint: "Not started" },
  { status: "in_progress", title: "In progress", hint: "Being worked on" },
  { status: "returned", title: "Returned", hint: "Needs correction" },
  { status: "submitted", title: "Submitted", hint: "Waiting for review" },
];

const today = () => new Date().toISOString().slice(0, 10);
const isOverdue = (t: TaskListItem) => !!t.due_date && t.due_date < today() && t.status !== "submitted" && t.status !== "approved";

function TaskCard({ task, onOpen }: { task: TaskListItem; onOpen: () => void }) {
  const overdue = isOverdue(task);
  return (
    <button type="button" onClick={onOpen} className={cn("bg-card hover:border-primary/40 w-full rounded-lg border p-3 text-left shadow-xs", overdue && "border-destructive/50")}>
      <p className="text-sm font-medium">{task.title}</p>
      <p className="text-muted-foreground mt-0.5 truncate text-xs">{task.client_name} · {formatPeriod(task.period)}</p>
      <p className={cn("mt-2 text-xs", overdue ? "text-destructive font-medium" : "text-muted-foreground")}>
        {task.due_date ? `${overdue ? "Overdue · " : "Due "}${formatDate(task.due_date)}` : "No due date"}
      </p>
    </button>
  );
}

/** My assigned tasks as a board; same task API and detail sheet as My Tasks. */
export function WorkQueue() {
  const [period, setPeriod] = useState<string>();
  const [openTask, setOpenTask] = useState<number | null>(null);
  const { data, isLoading, error, refetch } = useTasks({ scope: "mine", period, pageSize: 100 }, "team");
  const tasks = (data?.items ?? []).filter((t) => t.status !== "approved");
  const overdue = tasks.filter(isOverdue).length;
  const periods = [...new Set((data?.items ?? []).map((t) => t.period))].sort().reverse();

  return (
    <>
      <PageHeader
        title="Work Queue"
        description={data ? `${tasks.length} open task${tasks.length === 1 ? "" : "s"}${overdue ? ` · ${overdue} overdue` : ""}` : "Your open tasks by stage."}
        actions={<FilterSelect allLabel="All months" value={period} onChange={setPeriod} options={(period ? [period, ...periods.filter((p) => p !== period)] : periods).map((p) => ({ value: p, label: formatPeriod(p) }))} />}
      />
      {error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {COLUMNS.map((col) => {
            const items = tasks
              .filter((t) => t.status === col.status)
              .sort((a, b) => Number(isOverdue(b)) - Number(isOverdue(a)) || (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"));
            return (
              <section key={col.status} className="bg-muted/40 flex min-w-0 flex-col rounded-xl border" aria-labelledby={`col-${col.status}`}>
                <header className="flex items-baseline justify-between px-4 py-3">
                  <h2 id={`col-${col.status}`} className="text-sm font-medium">{col.title}</h2>
                  <span className="text-muted-foreground text-xs">{isLoading ? "" : items.length} · {col.hint}</span>
                </header>
                <div className="space-y-2 px-3 pb-3">
                  {isLoading ? (
                    <Skeleton className="h-20 w-full" />
                  ) : items.length === 0 ? (
                    <p className="text-muted-foreground px-1 py-4 text-center text-xs">Nothing here</p>
                  ) : (
                    items.map((t) => <TaskCard key={t.id} task={t} onOpen={() => setOpenTask(t.id)} />)
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
      <TaskDetailSheet portal="team" taskId={openTask} onClose={() => setOpenTask(null)} />
    </>
  );
}
