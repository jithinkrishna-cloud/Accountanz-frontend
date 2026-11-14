"use client";

import { closestCorners, DndContext, DragOverlay, PointerSensor, useDroppable, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronRight, ListTree } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { FilterSelect } from "@/components/shared/filter-select";
import { SearchInput } from "@/components/shared/search-input";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { applyApiError } from "@/lib/form-errors";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useItems, useMoveItem, useSprints } from "../hooks/use-projects";
import { ITEM_TYPE_LABELS, ITEM_TYPES, PRIORITIES, PRIORITY_LABELS, type Item, type ItemType, type Priority, type Sprint } from "../types/project.types";
import { AssigneeFilter, PriorityIcon, StatusPill, TypeIcon, UserAvatar } from "./project-ui";
import { QuickCreate } from "./quick-create";
import { useSpaceCtx } from "./space-layout";
import { CompleteSprintDialog } from "./sprint-dialogs";

const colId = (statusId: number) => `col-${statusId}`;

/** Stops a click inside a card from opening the card or starting a drag (dnd-kit listens for pointer down). */
const keepInside = { onClick: (e: React.MouseEvent) => e.stopPropagation(), onPointerDown: (e: React.PointerEvent) => e.stopPropagation() };

function SubtaskRow({ subtasks, total, onOpenItem }: { subtasks: Item[]; total: number; onOpenItem?: (n: number) => void }) {
  const [open, setOpen] = useState(false);
  const done = subtasks.filter((s) => s.status_category === "done").length;
  return (
    <div className="-mx-3 mt-3 -mb-3 border-t" {...keepInside}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="text-muted-foreground hover:bg-muted/60 flex w-full items-center gap-2 rounded-b-lg px-3 py-2 text-xs"
      >
        <ListTree className="size-3.5" aria-hidden />
        <span>Subtasks</span>
        <span className="bg-muted text-foreground rounded px-1.5 py-px font-medium tabular-nums">{done}/{total}</span>
        {open ? <ChevronDown className="ml-auto size-3.5" aria-hidden /> : <ChevronRight className="ml-auto size-3.5" aria-hidden />}
      </button>
      {open && (
        <ul className="divide-y border-t">
          {subtasks.length === 0 ? (
            <li className="text-muted-foreground px-3 py-2 text-xs">Open the work item to see its subtasks.</li>
          ) : (
            subtasks.map((s) => (
              <li key={s.number}>
                <button type="button" onClick={() => onOpenItem?.(s.number)} className="hover:bg-muted/60 flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs">
                  <TypeIcon type={s.type} />
                  <span className={cn("text-muted-foreground shrink-0 font-mono", s.status_category === "done" && "line-through")}>{s.key}</span>
                  <span className="min-w-0 flex-1 truncate">{s.title}</span>
                  <StatusPill name={s.status_name} category={s.status_category} />
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

function Card({ item, subtasks = [], onOpen, onOpenItem, overlay }: { item: Item; subtasks?: Item[]; onOpen?: () => void; onOpenItem?: (n: number) => void; overlay?: boolean }) {
  const done = item.status_category === "done";
  return (
    <div
      onClick={onOpen}
      className={cn("bg-card hover:bg-muted/40 cursor-pointer rounded-lg border p-3 text-sm shadow-xs transition-colors", overlay && "rotate-2 shadow-lg")}
    >
      <p className="line-clamp-3 font-medium">{item.title}</p>
      {(item.client_name || item.labels.length > 0) && (
        <div className="mt-2 flex flex-wrap gap-1">
          {item.client_name && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] text-amber-900 dark:bg-amber-950 dark:text-amber-200">{item.client_name}</span>}
          {item.labels.slice(0, 3).map((l) => <span key={l} className="bg-muted rounded px-1.5 py-0.5 text-[11px]">{l}</span>)}
        </div>
      )}
      <div className="mt-3 flex items-center gap-2">
        <TypeIcon type={item.type} />
        <span className={cn("text-muted-foreground font-mono text-xs", done && "line-through")}>{item.key}</span>
        {item.due_date && !done && <span className="text-muted-foreground text-xs">· {formatDate(item.due_date)}</span>}
        <span className="ml-auto flex items-center gap-2">
          {item.story_points != null && <span className="bg-muted rounded-full px-1.5 text-[11px]">{item.story_points}</span>}
          <PriorityIcon priority={item.priority} />
          <UserAvatar name={item.assignee_name} size="sm" />
        </span>
      </div>
      {item.subtask_count > 0 && !overlay && <SubtaskRow subtasks={subtasks} total={Math.max(item.subtask_count, subtasks.length)} onOpenItem={onOpenItem} />}
    </div>
  );
}

function SortableCard({ item, subtasks, onOpen, onOpenItem }: { item: Item; subtasks: Item[]; onOpen: () => void; onOpenItem: (n: number) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.number });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={cn(isDragging && "opacity-40")} {...attributes} {...listeners}>
      <Card item={item} subtasks={subtasks} onOpen={onOpen} onOpenItem={onOpenItem} />
    </div>
  );
}

function Column({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return <div ref={setNodeRef} className={cn("flex min-h-24 flex-1 flex-col gap-2 rounded-lg p-1 transition-colors", isOver && "bg-primary/5")}>{children}</div>;
}

function SprintBar({ sprint, onComplete, isAdmin }: { sprint: Sprint; onComplete: () => void; isAdmin: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
      <span className="font-semibold">{sprint.name}</span>
      {sprint.start_date && <span className="text-muted-foreground">{formatDate(sprint.start_date)} – {formatDate(sprint.end_date)}</span>}
      {sprint.goal && <span className="text-muted-foreground truncate">· {sprint.goal}</span>}
      {isAdmin && <Button size="sm" variant="outline" className="ml-auto" onClick={onComplete}>Complete sprint</Button>}
    </div>
  );
}

export function BoardView() {
  const { space, members, isAdmin, openItem } = useSpaceCtx();
  const scrum = space.template === "scrum";
  const [q, setQ] = useState("");
  const [assignees, setAssignees] = useState<string[]>([]);
  const [type, setType] = useState<string>();
  const [priority, setPriority] = useState<string>();
  const [completing, setCompleting] = useState<Sprint | null>(null);
  const sprints = useSprints(space.space_key, scrum);
  const active = sprints.data?.find((s) => s.status === "active") ?? null;
  const filters = {
    q: q || undefined,
    assignee_id: assignees.join(",") || undefined,
    type: type as ItemType | undefined,
    priority: priority as Priority | undefined,
    sprint: scrum ? "active" : undefined,
    done_within_days: scrum ? undefined : 14,
    pageSize: 500,
  };
  const items = useItems(space.space_key, filters, !scrum || !!active);
  const move = useMoveItem(space.space_key);
  const [dragging, setDragging] = useState<Item | null>(null);
  /** Optimistic placement while the move request is in flight. */
  const [pending, setPending] = useState<{ number: number; status_id: number; rank: number } | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  /** Subtasks show inside their parent's card, unless you ask for the Subtask type. */
  const showSubtaskCards = type === "subtask";
  const subtasksOf = useMemo(() => {
    const map = new Map<number, Item[]>();
    for (const i of items.data?.items ?? []) if (i.type === "subtask" && i.parent_number != null) map.set(i.parent_number, [...(map.get(i.parent_number) ?? []), i]);
    for (const arr of map.values()) arr.sort((a, b) => a.number - b.number);
    return map;
  }, [items.data]);

  const byStatus = useMemo(() => {
    const list = (items.data?.items ?? [])
      .filter((i) => showSubtaskCards || i.type !== "subtask")
      .map((i) => (pending && i.number === pending.number ? { ...i, status_id: pending.status_id, rank: pending.rank } : i));
    const map = new Map<number, Item[]>(space.statuses.map((s) => [s.id, []]));
    for (const i of list) map.get(i.status_id)?.push(i);
    for (const arr of map.values()) arr.sort((a, b) => a.rank - b.rank || a.number - b.number);
    return map;
  }, [items.data, pending, space.statuses, showSubtaskCards]);

  const onDragStart = (e: DragStartEvent) => setDragging(items.data?.items.find((i) => i.number === e.active.id) ?? null);

  const onDragEnd = async (e: DragEndEvent) => {
    setDragging(null);
    const item = items.data?.items.find((i) => i.number === e.active.id);
    if (!item || !e.over) return;
    const overId = String(e.over.id);
    const statusId = overId.startsWith("col-") ? Number(overId.slice(4)) : (items.data?.items.find((i) => i.number === e.over!.id)?.status_id ?? item.status_id);
    const original = byStatus.get(statusId) ?? [];
    const column = original.filter((i) => i.number !== item.number);
    let index = overId.startsWith("col-") ? column.length : column.findIndex((i) => i.number === e.over!.id);
    if (index < 0) index = column.length;
    const from = original.findIndex((i) => i.number === item.number);
    // In the same column, dragging downward onto an item lands after it.
    if (!overId.startsWith("col-") && from >= 0 && from < original.findIndex((i) => i.number === e.over!.id)) index += 1;
    const prev = column[index - 1] ?? null;
    const next = column[index] ?? null;
    if (from >= 0 && original[from - 1]?.number === prev?.number && original[from + 1]?.number === next?.number) return; // not moved
    const rank = prev && next ? (prev.rank + next.rank) / 2 : prev ? prev.rank + 1024 : next ? next.rank - 1024 : item.rank;
    setPending({ number: item.number, status_id: statusId, rank });
    try {
      await move.mutateAsync({ n: item.number, status_id: statusId, prev_number: prev?.number ?? null, next_number: next?.number ?? null });
    } catch (err) {
      applyApiError(err);
    } finally {
      setPending(null);
    }
  };

  if (scrum && sprints.isSuccess && !active) {
    return (
      <EmptyState
        title="No active sprint"
        description="Plan work in the backlog, then start a sprint to see it on the board."
        action={<Button asChild size="sm"><Link href={`/projects/${space.space_key}/backlog`}>Go to backlog</Link></Button>}
      />
    );
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={q} onChange={setQ} placeholder="Search board" className="sm:w-56" />
        <AssigneeFilter members={members} value={assignees} onChange={setAssignees} />
        <FilterSelect allLabel="All types" value={type} onChange={setType} options={ITEM_TYPES.map((t) => ({ value: t, label: ITEM_TYPE_LABELS[t] }))} />
        <FilterSelect allLabel="All priorities" value={priority} onChange={setPriority} options={PRIORITIES.map((p) => ({ value: p, label: PRIORITY_LABELS[p] }))} />
      </div>
      {active && <SprintBar sprint={active} isAdmin={isAdmin} onComplete={() => setCompleting(active)} />}
      {items.error ? (
        <ErrorState error={items.error} onRetry={() => void items.refetch()} />
      ) : !items.data ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={(e) => void onDragEnd(e)} onDragCancel={() => setDragging(null)}>
          <div className="flex gap-3 overflow-x-auto pb-4">
            {space.statuses.map((s) => {
              const list = byStatus.get(s.id) ?? [];
              return (
                <section key={s.id} className="bg-muted/50 flex w-72 shrink-0 flex-col rounded-xl p-2" aria-label={s.name}>
                  <h3 className="text-muted-foreground flex items-center gap-2 px-2 py-1.5 text-xs font-semibold tracking-wide uppercase">
                    {s.name} <span className="bg-background rounded-full px-1.5 text-[11px]">{list.length}</span>
                  </h3>
                  <SortableContext id={colId(s.id)} items={list.map((i) => i.number)} strategy={verticalListSortingStrategy}>
                    <Column id={colId(s.id)}>
                      {list.map((i) => (
                        <SortableCard key={i.number} item={i} subtasks={subtasksOf.get(i.number) ?? []} onOpen={() => openItem(i.number)} onOpenItem={openItem} />
                      ))}
                    </Column>
                  </SortableContext>
                  <QuickCreate spaceKey={space.space_key} defaults={{ status_id: s.id, sprint_id: active?.id ?? null }} />
                </section>
              );
            })}
          </div>
          <DragOverlay>{dragging && <Card item={dragging} overlay />}</DragOverlay>
        </DndContext>
      )}
      <CompleteSprintDialog spaceKey={space.space_key} sprint={completing} onClose={() => setCompleting(null)} />
    </div>
  );
}
