"use client";

import { closestCorners, DndContext, DragOverlay, PointerSensor, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronRight, MoreHorizontal, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { SearchInput } from "@/components/shared/search-input";
import { ErrorState } from "@/components/shared/states";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { applyApiError } from "@/lib/form-errors";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useCreateSprint, useDeleteSprint, useItems, useMoveItem, useSprints, useStartSprint, useUpdateItem } from "../hooks/use-projects";
import type { Item, Sprint } from "../types/project.types";
import { InlineSelect } from "./item-fields";
import { AssigneeFilter, PriorityIcon, TypeIcon, UserAvatar } from "./project-ui";
import { QuickCreate } from "./quick-create";
import { useSpaceCtx } from "./space-layout";
import { CompleteSprintDialog, SprintFormDialog } from "./sprint-dialogs";

const BACKLOG = "backlog";
const sectionId = (sprintId: number | null) => (sprintId == null ? BACKLOG : `sprint-${sprintId}`);
const sprintOf = (id: string) => (id === BACKLOG ? null : Number(id.replace("sprint-", "")));

function Row({ item, onOpen }: { item: Item; onOpen: () => void }) {
  const { space } = useSpaceCtx();
  const update = useUpdateItem(space.space_key);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.number });
  const done = item.status_category === "done";
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={cn("bg-card flex items-center gap-3 border-b px-3 py-2 text-sm last:border-b-0", isDragging && "opacity-40")} {...attributes} {...listeners}>
      <TypeIcon type={item.type} />
      <button type="button" onClick={onOpen} className={cn("text-muted-foreground shrink-0 font-mono text-xs hover:underline", done && "line-through")}>{item.key}</button>
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 truncate text-left hover:underline">{item.title}</button>
      {item.client_name && <span className="hidden rounded bg-amber-100 px-1.5 py-0.5 text-[11px] text-amber-900 md:inline dark:bg-amber-950 dark:text-amber-200">{item.client_name}</span>}
      <div className="w-36 shrink-0" onPointerDown={(e) => e.stopPropagation()}>
        <InlineSelect
          label="Status"
          value={item.status_id}
          options={space.statuses.map((s) => ({ value: s.id, label: s.name }))}
          onChange={(v) => v && void update.mutateAsync({ n: item.number, patch: { status_id: v } }).catch((e) => applyApiError(e))}
          className="h-7 text-xs"
        />
      </div>
      <span className="bg-muted w-8 shrink-0 rounded-full text-center text-xs" title="Story points">{item.story_points ?? "–"}</span>
      <PriorityIcon priority={item.priority} />
      <UserAvatar name={item.assignee_name} size="sm" />
    </li>
  );
}

function Section({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return <ul ref={setNodeRef} className={cn("min-h-12 overflow-hidden rounded-lg border", isOver && "ring-primary/40 ring-2")}>{children}</ul>;
}

function SprintHeader({ sprint, items, collapsed, onToggle, onEdit, onStart, onComplete, canStart }: {
  sprint: Sprint | null; items: Item[]; collapsed: boolean; onToggle: () => void; onEdit: () => void; onStart: () => void; onComplete: () => void; canStart: boolean;
}) {
  const { space, isAdmin } = useSpaceCtx();
  const remove = useDeleteSprint(space.space_key);
  const points = items.reduce((a, i) => a + (i.story_points ?? 0), 0);
  const counts = { todo: 0, in_progress: 0, done: 0 };
  for (const i of items) counts[i.status_category] += 1;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
      <button type="button" onClick={onToggle} className="flex items-center gap-1 font-semibold" aria-expanded={!collapsed}>
        {collapsed ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
        {sprint ? sprint.name : "Backlog"}
      </button>
      {sprint?.start_date && <span className="text-muted-foreground text-sm">{formatDate(sprint.start_date)} – {formatDate(sprint.end_date)}</span>}
      <span className="text-muted-foreground text-sm">({items.length} work item{items.length === 1 ? "" : "s"})</span>
      <span className="ml-auto flex items-center gap-1 text-xs" title="To do · In progress · Done">
        <span className="bg-muted rounded px-1.5">{counts.todo}</span>
        <span className="rounded bg-sky-100 px-1.5 text-sky-800 dark:bg-sky-950 dark:text-sky-200">{counts.in_progress}</span>
        <span className="rounded bg-emerald-100 px-1.5 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">{counts.done}</span>
        <span className="text-muted-foreground ml-1">{points} pts</span>
      </span>
      {sprint && isAdmin && (
        <>
          {sprint.status === "active" ? (
            <Button size="sm" variant="outline" onClick={onComplete}>Complete sprint</Button>
          ) : (
            <Button size="sm" variant="outline" onClick={onStart} disabled={!canStart} title={canStart ? undefined : "Complete the active sprint first"}>Start sprint</Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="size-8" aria-label={`More actions for ${sprint.name}`}><MoreHorizontal className="size-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>Edit sprint</DropdownMenuItem>
              {sprint.status === "planned" && (
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => {
                    if (!window.confirm(`Delete ${sprint.name}? Its work items return to the backlog.`)) return;
                    void remove.mutateAsync(sprint.id).then(() => toast.success("Sprint deleted")).catch((e) => applyApiError(e));
                  }}
                >
                  Delete sprint
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}
    </div>
  );
}

export function BacklogView() {
  const { space, members, isAdmin, openItem } = useSpaceCtx();
  const [q, setQ] = useState("");
  const [assignees, setAssignees] = useState<string[]>([]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<{ sprint: Sprint; startAfter: boolean } | null>(null);
  const [completing, setCompleting] = useState<Sprint | null>(null);
  const [dragging, setDragging] = useState<Item | null>(null);
  const [pending, setPending] = useState<{ number: number; sprint_id: number | null; rank: number } | null>(null);
  const sprints = useSprints(space.space_key);
  const items = useItems(space.space_key, { q: q || undefined, assignee_id: assignees.join(",") || undefined, pageSize: 500 });
  const createSprint = useCreateSprint(space.space_key);
  const startSprint = useStartSprint(space.space_key);
  const move = useMoveItem(space.space_key);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const openSprints = useMemo(() => sprints.data ?? [], [sprints.data]);
  const hasActive = openSprints.some((s) => s.status === "active");
  const sections = useMemo(() => {
    const open = new Set(openSprints.map((s) => s.id));
    const map = new Map<string, Item[]>([...openSprints.map((s) => [sectionId(s.id), []] as [string, Item[]]), [BACKLOG, []]]);
    for (const raw of items.data?.items ?? []) {
      const i = pending && raw.number === pending.number ? { ...raw, sprint_id: pending.sprint_id, rank: pending.rank } : raw;
      if (i.type === "subtask") continue; // subtasks follow their parent
      if (i.sprint_id != null && !open.has(i.sprint_id)) continue; // finished in a completed sprint
      map.get(sectionId(i.sprint_id))?.push(i);
    }
    for (const arr of map.values()) arr.sort((a, b) => a.rank - b.rank || a.number - b.number);
    return map;
  }, [items.data, openSprints, pending]);

  const start = (s: Sprint) => {
    if (!s.start_date || !s.end_date) return setEditing({ sprint: s, startAfter: true });
    void startSprint.mutateAsync(s.id).then(() => toast.success(`${s.name} started`)).catch((e) => applyApiError(e));
  };

  const onDragEnd = async (e: DragEndEvent) => {
    setDragging(null);
    const all = items.data?.items ?? [];
    const item = all.find((i) => i.number === e.active.id);
    if (!item || !e.over) return;
    const overId = String(e.over.id);
    const targetSection = overId === BACKLOG || overId.startsWith("sprint-") ? overId : sectionId(all.find((i) => i.number === e.over!.id)?.sprint_id ?? null);
    const original = sections.get(targetSection) ?? [];
    const list = original.filter((i) => i.number !== item.number);
    let index = targetSection === overId ? list.length : list.findIndex((i) => i.number === e.over!.id);
    if (index < 0) index = list.length;
    const from = original.findIndex((i) => i.number === item.number);
    if (targetSection !== overId && from >= 0 && from < original.findIndex((i) => i.number === e.over!.id)) index += 1;
    const prev = list[index - 1] ?? null;
    const next = list[index] ?? null;
    if (from >= 0 && original[from - 1]?.number === prev?.number && original[from + 1]?.number === next?.number) return;
    const sprintId = sprintOf(targetSection);
    const rank = prev && next ? (prev.rank + next.rank) / 2 : prev ? prev.rank + 1024 : next ? next.rank - 1024 : item.rank;
    setPending({ number: item.number, sprint_id: sprintId, rank });
    try {
      await move.mutateAsync({ n: item.number, sprint_id: sprintId, prev_number: prev?.number ?? null, next_number: next?.number ?? null });
    } catch (err) {
      applyApiError(err);
    } finally {
      setPending(null);
    }
  };

  if (items.error || sprints.error) return <ErrorState error={items.error ?? sprints.error} onRetry={() => (void items.refetch(), void sprints.refetch())} />;
  if (!items.data || !sprints.data) return <Skeleton className="h-96 w-full" />;

  const renderSection = (sprint: Sprint | null) => {
    const id = sectionId(sprint?.id ?? null);
    const list = sections.get(id) ?? [];
    return (
      <div key={id} className="bg-muted/40 rounded-xl px-3 pb-3">
        <SprintHeader
          sprint={sprint}
          items={list}
          collapsed={!!collapsed[id]}
          onToggle={() => setCollapsed((c) => ({ ...c, [id]: !c[id] }))}
          onEdit={() => sprint && setEditing({ sprint, startAfter: false })}
          onStart={() => sprint && start(sprint)}
          onComplete={() => sprint && setCompleting(sprint)}
          canStart={!hasActive}
        />
        {!collapsed[id] && (
          <>
            <SortableContext id={id} items={list.map((i) => i.number)} strategy={verticalListSortingStrategy}>
              <Section id={id}>
                {list.map((i) => <Row key={i.number} item={i} onOpen={() => openItem(i.number)} />)}
                {list.length === 0 && <li className="text-muted-foreground px-3 py-4 text-center text-sm">{sprint ? "Drag work items here to plan this sprint." : "Your backlog is empty."}</li>}
              </Section>
            </SortableContext>
            <QuickCreate spaceKey={space.space_key} defaults={{ sprint_id: sprint?.id ?? null }} className="text-muted-foreground mt-1 w-full justify-start" />
          </>
        )}
      </div>
    );
  };

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={q} onChange={setQ} placeholder="Search backlog" className="sm:w-56" />
        <AssigneeFilter members={members} value={assignees} onChange={setAssignees} />
        {isAdmin && (
          <SubmitButton variant="outline" size="sm" className="ml-auto" pending={createSprint.isPending} onClick={() => void createSprint.mutateAsync({}).catch((e) => applyApiError(e))}>
            <Plus className="size-4" /> Create sprint
          </SubmitButton>
        )}
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={(e) => setDragging(items.data?.items.find((i) => i.number === e.active.id) ?? null)}
        onDragEnd={(e) => void onDragEnd(e)}
        onDragCancel={() => setDragging(null)}
      >
        {openSprints.map((s) => renderSection(s))}
        {renderSection(null)}
        <DragOverlay>
          {dragging && (
            <div className="bg-card flex items-center gap-3 rounded-lg border px-3 py-2 text-sm shadow-lg">
              <TypeIcon type={dragging.type} />
              <span className="text-muted-foreground font-mono text-xs">{dragging.key}</span>
              <span className="truncate">{dragging.title}</span>
            </div>
          )}
        </DragOverlay>
      </DndContext>
      <SprintFormDialog
        spaceKey={space.space_key}
        sprint={editing?.sprint ?? null}
        onClose={() => setEditing(null)}
        onSaved={(s) => editing?.startAfter && !hasActive && void startSprint.mutateAsync(s.id).then(() => toast.success(`${s.name} started`)).catch((e) => applyApiError(e))}
      />
      <CompleteSprintDialog spaceKey={space.space_key} sprint={completing} onClose={() => setCompleting(null)} />
    </div>
  );
}
