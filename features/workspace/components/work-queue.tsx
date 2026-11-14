"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FilterSelect } from "@/components/shared/filter-select";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/states";
import { Skeleton } from "@/components/ui/skeleton";
import { TaskDetailSheet } from "@/features/tasks/components/task-detail-sheet";
import { useMoveTask, useTasks } from "@/features/tasks/hooks/use-tasks";
import type { TaskListItem, TaskStatus } from "@/features/tasks/types/task.types";
import { applyApiError } from "@/lib/form-errors";
import { formatDate, formatPeriod } from "@/lib/format";
import { cn } from "@/lib/utils";

const COLUMNS: { status: TaskStatus; title: string; hint: string; dropHint?: string }[] = [
  { status: "todo", title: "To do", hint: "Not started" },
  { status: "in_progress", title: "In progress", hint: "Being worked on", dropHint: "Drop to start working on it" },
  { status: "returned", title: "Returned", hint: "Needs correction" },
  { status: "submitted", title: "Submitted", hint: "Waiting for review", dropHint: "Drop to submit for review" },
];

/**
 * Moves the assignee can make by dragging. Everything else is a reviewer's decision (returned, approved)
 * or not a real step (back to "to do"), so those columns don't accept drops.
 */
const MOVES: Partial<Record<TaskStatus, TaskStatus[]>> = {
  todo: ["in_progress", "submitted"],
  in_progress: ["submitted"],
  returned: ["in_progress", "submitted"],
};
const canMove = (from: TaskStatus, to: TaskStatus) => MOVES[from]?.includes(to) ?? false;

const today = () => new Date().toISOString().slice(0, 10);
const isOverdue = (t: TaskListItem) => !!t.due_date && t.due_date < today() && t.status !== "submitted" && t.status !== "approved";

function TaskCard({ task, moving, onOpen, onDragStart, onDragEnd }: { task: TaskListItem; moving: boolean; onOpen: () => void; onDragStart: () => void; onDragEnd: () => void }) {
  const overdue = isOverdue(task);
  const draggable = !!MOVES[task.status] && !moving;
  return (
    <div
      role="button"
      tabIndex={0}
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", String(task.id));
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      aria-label={`${task.title}, ${task.client_name}. Open task`}
      className={cn(
        "bg-card hover:border-primary/40 focus-visible:ring-ring w-full rounded-lg border p-3 text-left shadow-xs outline-none focus-visible:ring-2",
        draggable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
        overdue && "border-destructive/50",
        moving && "opacity-60",
      )}
    >
      <p className="text-sm font-medium">{task.title}</p>
      <p className="text-muted-foreground mt-0.5 truncate text-xs">{task.client_name} · {formatPeriod(task.period)}</p>
      <p className={cn("mt-2 text-xs", overdue ? "text-destructive font-medium" : "text-muted-foreground")}>
        {moving ? "Moving…" : task.due_date ? `${overdue ? "Overdue · " : "Due "}${formatDate(task.due_date)}` : "No due date"}
      </p>
    </div>
  );
}

/** My assigned tasks as a board; same task API and detail sheet as My Tasks. Drag a card to start or submit it. */
export function WorkQueue() {
  const [period, setPeriod] = useState<string>();
  const [openTask, setOpenTask] = useState<number | null>(null);
  const [dragging, setDragging] = useState<TaskListItem | null>(null);
  const [over, setOver] = useState<TaskStatus | null>(null);
  /** Optimistic column while a move is being saved. */
  const [pending, setPending] = useState<Record<number, TaskStatus>>({});
  const move = useMoveTask();
  const { data, isLoading, error, refetch } = useTasks({ scope: "mine", period, pageSize: 100 }, "team");
  const tasks = (data?.items ?? []).filter((t) => t.status !== "approved").map((t) => (pending[t.id] ? { ...t, status: pending[t.id]! } : t));
  const overdue = tasks.filter(isOverdue).length;
  const periods = [...new Set((data?.items ?? []).map((t) => t.period))].sort().reverse();

  const endDrag = () => {
    setDragging(null);
    setOver(null);
  };

  const drop = async (to: TaskStatus) => {
    const task = dragging;
    endDrag();
    if (!task || task.status === to || !canMove(task.status, to)) return;
    setPending((p) => ({ ...p, [task.id]: to }));
    try {
      await move.mutateAsync({ id: task.id, to: to as "in_progress" | "submitted" });
      toast.success(to === "submitted" ? `${task.title} submitted for review` : `${task.title} moved to in progress`);
    } catch (err) {
      applyApiError(err);
      // Submitting needs every checklist point ticked: open the task so they can finish it.
      if (to === "submitted") setOpenTask(task.id);
    } finally {
      await refetch();
      setPending((p) => Object.fromEntries(Object.entries(p).filter(([id]) => Number(id) !== task.id)));
    }
  };

  return (
    <>
      <PageHeader
        title="Work Queue"
        description={data ? `${tasks.length} open task${tasks.length === 1 ? "" : "s"}${overdue ? ` · ${overdue} overdue` : ""} · drag a card to start or submit it` : "Your open tasks by stage."}
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
            const accepts = !!dragging && canMove(dragging.status, col.status);
            const blocked = !!dragging && !accepts && dragging.status !== col.status;
            return (
              <section
                key={col.status}
                aria-labelledby={`col-${col.status}`}
                onDragOver={(e) => {
                  if (!accepts) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  if (over !== col.status) setOver(col.status);
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver((o) => (o === col.status ? null : o));
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  void drop(col.status);
                }}
                className={cn(
                  "bg-muted/40 flex min-w-0 flex-col rounded-xl border transition-colors",
                  accepts && "border-primary/50 border-dashed",
                  accepts && over === col.status && "bg-primary/5 border-primary",
                  blocked && "opacity-50",
                )}
              >
                <header className="flex items-baseline justify-between px-4 py-3">
                  <h2 id={`col-${col.status}`} className="text-sm font-medium">{col.title}</h2>
                  <span className="text-muted-foreground text-xs">{isLoading ? "" : items.length} · {col.hint}</span>
                </header>
                <div className="flex-1 space-y-2 px-3 pb-3">
                  {accepts && <p className="text-primary rounded-lg border border-dashed border-current px-3 py-2 text-center text-xs">{col.dropHint}</p>}
                  {isLoading ? (
                    <Skeleton className="h-20 w-full" />
                  ) : items.length === 0 ? (
                    !accepts && <p className="text-muted-foreground px-1 py-4 text-center text-xs">Nothing here</p>
                  ) : (
                    items.map((t) => (
                      <TaskCard
                        key={t.id}
                        task={t}
                        moving={t.id in pending}
                        onOpen={() => setOpenTask(t.id)}
                        onDragStart={() => setDragging(t)}
                        onDragEnd={endDrag}
                      />
                    ))
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
