"use client";

import {
  closestCenter,
  DndContext,
  DragOverlay,
  getFirstCollision,
  pointerWithin,
  PointerSensor,
  rectIntersection,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronRight, ListTree, Plus } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { FilterSelect } from "@/components/shared/filter-select";
import { SearchInput } from "@/components/shared/search-input";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { applyApiError } from "@/lib/form-errors";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  useCreateStatus,
  useItems,
  useMoveItem,
  useSprints,
} from "../hooks/use-projects";
import {
  CATEGORY_LABELS,
  ITEM_TYPE_LABELS,
  ITEM_TYPES,
  PRIORITIES,
  PRIORITY_LABELS,
  type Item,
  type ItemType,
  type Priority,
  type Sprint,
  type StatusCategory,
} from "../types/project.types";
import {
  AssigneeFilter,
  PriorityIcon,
  StatusPill,
  TypeIcon,
  UserAvatar,
} from "./project-ui";
import { InvitePeopleButton } from "./invite-people";
import { QuickCreate } from "./quick-create";
import { useSpaceCtx } from "./space-layout";
import { CompleteSprintDialog } from "./sprint-dialogs";

const colId = (statusId: number) => `col-${statusId}`;

/** Stops a click inside a card from opening the card or starting a drag (dnd-kit listens for pointer down). */
const keepInside = {
  onClick: (e: React.MouseEvent) => e.stopPropagation(),
  onPointerDown: (e: React.PointerEvent) => e.stopPropagation(),
};

function SubtaskRow({
  subtasks,
  total,
  onOpenItem,
}: {
  subtasks: Item[];
  total: number;
  onOpenItem?: (n: number) => void;
}) {
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
        <span className="bg-muted text-foreground rounded px-1.5 py-px font-medium tabular-nums">
          {done}/{total}
        </span>
        {open ? (
          <ChevronDown className="ml-auto size-3.5" aria-hidden />
        ) : (
          <ChevronRight className="ml-auto size-3.5" aria-hidden />
        )}
      </button>
      {open && (
        <ul className="divide-y border-t">
          {subtasks.length === 0 ? (
            <li className="text-muted-foreground px-3 py-2 text-xs">
              Open the work item to see its subtasks.
            </li>
          ) : (
            subtasks.map((s) => (
              <li key={s.number}>
                <button
                  type="button"
                  onClick={() => onOpenItem?.(s.number)}
                  className="hover:bg-muted/60 flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs"
                >
                  <TypeIcon type={s.type} />
                  <span
                    className={cn(
                      "text-muted-foreground shrink-0 font-mono",
                      s.status_category === "done" && "line-through",
                    )}
                  >
                    {s.key}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{s.title}</span>
                  <StatusPill
                    name={s.status_name}
                    category={s.status_category}
                  />
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

function Card({
  item,
  subtasks = [],
  onOpen,
  onOpenItem,
  overlay,
}: {
  item: Item;
  subtasks?: Item[];
  onOpen?: () => void;
  onOpenItem?: (n: number) => void;
  overlay?: boolean;
}) {
  const done = item.status_category === "done";
  return (
    <div
      onClick={onOpen}
      className={cn(
        "bg-card hover:bg-muted/40 cursor-pointer rounded-lg border p-3 text-sm shadow-xs transition-colors",
        overlay && "rotate-2 shadow-lg",
      )}
    >
      <p className="line-clamp-3 font-medium">{item.title}</p>
      {(item.client_name || item.labels.length > 0) && (
        <div className="mt-2 flex flex-wrap gap-1">
          {item.client_name && (
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] text-amber-900 dark:bg-amber-950 dark:text-amber-200">
              {item.client_name}
            </span>
          )}
          {item.labels.slice(0, 3).map((l) => (
            <span
              key={l}
              className="bg-muted rounded px-1.5 py-0.5 text-[11px]"
            >
              {l}
            </span>
          ))}
        </div>
      )}
      <div className="mt-3 flex items-center gap-2">
        <TypeIcon type={item.type} />
        <span
          className={cn(
            "text-muted-foreground font-mono text-xs",
            done && "line-through",
          )}
        >
          {item.key}
        </span>
        {item.due_date && !done && (
          <span className="text-muted-foreground text-xs">
            · {formatDate(item.due_date)}
          </span>
        )}
        <span className="ml-auto flex items-center gap-2">
          {item.story_points != null && (
            <span className="bg-muted rounded-full px-1.5 text-[11px]">
              {item.story_points}
            </span>
          )}
          <PriorityIcon priority={item.priority} />
          <UserAvatar name={item.assignee_name} size="sm" />
        </span>
      </div>
      {item.subtask_count > 0 && !overlay && (
        <SubtaskRow
          subtasks={subtasks}
          total={Math.max(item.subtask_count, subtasks.length)}
          onOpenItem={onOpenItem}
        />
      )}
    </div>
  );
}

function SortableCard({
  item,
  subtasks,
  onOpen,
  onOpenItem,
}: {
  item: Item;
  subtasks: Item[];
  onOpen: () => void;
  onOpenItem: (n: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.number });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(isDragging && "opacity-40")}
      {...attributes}
      {...listeners}
    >
      <Card
        item={item}
        subtasks={subtasks}
        onOpen={onOpen}
        onOpenItem={onOpenItem}
      />
    </div>
  );
}

/** A board column. It's only as tall as its cards; a long column scrolls inside. The whole column is the drop target. */
function Column({
  id,
  label,
  count,
  footer,
  children,
}: {
  id: string;
  label: string;
  count: number;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <section
      ref={setNodeRef}
      aria-label={label}
      className={cn(
        "bg-muted flex max-h-full w-72 shrink-0 flex-col self-start rounded-xl p-2 transition-colors",
        isOver && "ring-primary/40 ring-2",
      )}
    >
      <h3 className="text-muted-foreground flex items-center gap-2 px-2 pt-1 pb-2 text-xs font-medium">
        <span className="text-foreground/80 truncate">{label}</span>
        <span className="tabular-nums">{count}</span>
      </h3>
      <div className="-mx-1 flex min-h-0 flex-col gap-2 overflow-y-auto px-1">
        {children}
      </div>
      <div className={cn(count > 0 && "mt-2")}>{footer}</div>
    </section>
  );
}

const STATUS_CATEGORIES: StatusCategory[] = ["todo", "in_progress", "done"];

/**
 * Small overview in the bottom-right corner of the board: one bar per column and a frame for the part you can see.
 * Click or drag on it to scroll the board sideways. Hidden when every column already fits.
 */
function BoardMinimap({
  scrollRef,
}: {
  scrollRef: React.RefObject<HTMLDivElement | null>;
}) {
  const WIDTH = 104;
  const [view, setView] = useState<{
    left: number;
    width: number;
    cols: { left: number; width: number }[];
  } | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => {
      if (el.scrollWidth <= el.clientWidth + 1) return setView(null);
      const scale = WIDTH / el.scrollWidth;
      const cols = Array.from(el.children as HTMLCollectionOf<HTMLElement>)
        .filter((c) => c.tagName === "SECTION")
        .map((c) => ({
          left: c.offsetLeft * scale,
          width: Math.max(2, c.offsetWidth * scale),
        }));
      setView({
        left: el.scrollLeft * scale,
        width: el.clientWidth * scale,
        cols,
      });
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    const watchChildren = () => {
      for (const c of Array.from(el.children)) ro.observe(c);
      update();
    };
    watchChildren();
    // Columns added or removed (e.g. a new status) change the overview too.
    const mo = new MutationObserver(watchChildren);
    mo.observe(el, { childList: true });
    return () => (
      el.removeEventListener("scroll", update),
      ro.disconnect(),
      mo.disconnect()
    );
  }, [scrollRef]);

  if (!view) return null;

  const scrollTo = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!el) return;
    const x = e.clientX - e.currentTarget.getBoundingClientRect().left;
    el.scrollLeft = (x / WIDTH) * el.scrollWidth - el.clientWidth / 2;
  };

  return (
    <div
      role="presentation"
      title="Board overview: click or drag to scroll"
      className="bg-background/90 absolute right-3 bottom-6 z-20 cursor-pointer touch-none rounded-lg border p-1.5 shadow-md backdrop-blur"
      onPointerDown={(e) => (
        e.currentTarget.setPointerCapture(e.pointerId),
        scrollTo(e)
      )}
      onPointerMove={(e) => e.buttons === 1 && scrollTo(e)}
    >
      <div className="relative h-8" style={{ width: WIDTH }}>
        {view.cols.map((c, i) => (
          <span
            key={i}
            className="bg-muted-foreground/25 absolute inset-y-0 rounded-sm"
            style={{ left: c.left, width: c.width }}
          />
        ))}
        <span
          className="border-primary bg-primary/10 absolute -inset-y-0.5 rounded-md border-2"
          style={{ left: view.left, width: view.width }}
        />
      </div>
    </div>
  );
}

/** Admin-only last column: adds a new status (board column) without leaving the board. */
function AddStatusColumn({ spaceKey }: { spaceKey: string }) {
  const create = useCreateStatus(spaceKey);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<StatusCategory>("in_progress");
  const close = () => {
    setOpen(false);
    setName("");
    setCategory("in_progress");
  };
  const submit = () => {
    if (!name.trim()) return;
    void create
      .mutateAsync({ name: name.trim(), category })
      .then(() => (toast.success("Status added"), close()))
      .catch((e) => applyApiError(e));
  };
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Add status"
        title="Add status"
        className="text-muted-foreground hover:bg-muted hover:text-foreground flex size-10 shrink-0 items-center justify-center rounded-xl border border-dashed transition-colors"
      >
        <Plus className="size-4" aria-hidden />
      </button>
    );
  }
  return (
    <form
      className="bg-muted grid w-64 shrink-0 content-start gap-2 self-start rounded-xl border p-3"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <label htmlFor="board-new-status" className="text-xs font-semibold">
        New status
      </label>
      <Input
        id="board-new-status"
        autoFocus
        value={name}
        maxLength={40}
        placeholder="e.g. On hold"
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && close()}
        className="bg-background"
      />
      <Select
        value={category}
        onValueChange={(v) => setCategory(v as StatusCategory)}
      >
        <SelectTrigger
          className="bg-background w-full"
          aria-label="Type of new status"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS_CATEGORIES.map((c) => (
            <SelectItem key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={close}>
          Cancel
        </Button>
        <SubmitButton
          size="sm"
          pending={create.isPending}
          disabled={!name.trim()}
        >
          <Plus className="size-4" /> Add status
        </SubmitButton>
      </div>
    </form>
  );
}

function SprintBar({
  sprint,
  onComplete,
  isAdmin,
}: {
  sprint: Sprint;
  onComplete: () => void;
  isAdmin: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
      <span className="font-semibold">{sprint.name}</span>
      {sprint.start_date && (
        <span className="text-muted-foreground">
          {formatDate(sprint.start_date)} – {formatDate(sprint.end_date)}
        </span>
      )}
      {sprint.goal && (
        <span className="text-muted-foreground truncate">· {sprint.goal}</span>
      )}
      {isAdmin && (
        <Button
          size="sm"
          variant="outline"
          className="ml-auto"
          onClick={onComplete}
        >
          Complete sprint
        </Button>
      )}
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
  const [pending, setPending] = useState<{
    number: number;
    status_id: number;
    rank: number;
  } | null>(null);
  /** While dragging across columns, the card moves into the column under the pointer so that column makes room. */
  const [preview, setPreview] = useState<{
    number: number;
    status_id: number;
    rank: number;
  } | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  /** The board fills the window down to the bottom, so its sideways scrollbar sits at the bottom of the screen. */
  const boardRef = useRef<HTMLDivElement>(null);
  const [boardHeight, setBoardHeight] = useState<number>();
  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const fit = () =>
      setBoardHeight(
        Math.max(
          320,
          window.innerHeight - el.getBoundingClientRect().top - window.scrollY,
        ),
      );
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(document.body);
    window.addEventListener("resize", fit);
    return () => (ro.disconnect(), window.removeEventListener("resize", fit));
  }, [items.data]);

  /** Subtasks show inside their parent's card, unless you ask for the Subtask type. */
  const showSubtaskCards = type === "subtask";
  const subtasksOf = useMemo(() => {
    const map = new Map<number, Item[]>();
    for (const i of items.data?.items ?? [])
      if (i.type === "subtask" && i.parent_number != null)
        map.set(i.parent_number, [...(map.get(i.parent_number) ?? []), i]);
    for (const arr of map.values()) arr.sort((a, b) => a.number - b.number);
    return map;
  }, [items.data]);

  const byStatus = useMemo(() => {
    const placed = pending ?? preview;
    const list = (items.data?.items ?? [])
      .filter((i) => showSubtaskCards || i.type !== "subtask")
      .map((i) =>
        placed && i.number === placed.number
          ? { ...i, status_id: placed.status_id, rank: placed.rank }
          : i,
      );
    const map = new Map<number, Item[]>(space.statuses.map((s) => [s.id, []]));
    for (const i of list) map.get(i.status_id)?.push(i);
    for (const arr of map.values())
      arr.sort((a, b) => a.rank - b.rank || a.number - b.number);
    return map;
  }, [items.data, pending, preview, space.statuses, showSubtaskCards]);

  /**
   * Which column/card the pointer is over. Moving a card into another column changes both columns' sizes, and plain
   * corner/rect detection then briefly picks the old column again, so the card bounced between the two (flicker).
   * Here the pointer decides the column, and right after a column change the target is held until layout settles.
   * (Pattern from dnd-kit's multiple-containers example.)
   */
  const lastOverId = useRef<UniqueIdentifier | null>(null);
  const movedColumn = useRef(false);
  const collisionDetection: CollisionDetection = useCallback(
    (args) => {
      const pointerHits = pointerWithin(args);
      let overId = getFirstCollision(
        pointerHits.length > 0 ? pointerHits : rectIntersection(args),
        "id",
      );
      if (overId != null) {
        const overCol = String(overId).startsWith("col-")
          ? Number(String(overId).slice(4))
          : null;
        // Over a column: pick the nearest card in it, so the drop position follows the pointer.
        const cards =
          overCol != null
            ? new Set(
                (byStatus.get(overCol) ?? []).map(
                  (i) => i.number as UniqueIdentifier,
                ),
              )
            : null;
        if (cards && cards.size > 0) {
          overId =
            closestCenter({
              ...args,
              droppableContainers: args.droppableContainers.filter((c) =>
                cards.has(c.id),
              ),
            })[0]?.id ?? overId;
        }
        lastOverId.current = overId;
        return [{ id: overId }];
      }
      // Nothing under the pointer (e.g. mid-way while columns re-layout): keep the last target instead of jumping.
      if (movedColumn.current) lastOverId.current = args.active.id;
      return lastOverId.current != null ? [{ id: lastOverId.current }] : [];
    },
    [byStatus],
  );
  // The column change has been rendered: collisions can follow the pointer again.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      movedColumn.current = false;
    });
    return () => cancelAnimationFrame(frame);
  }, [byStatus]);

  /** The column a card is shown in right now (including where it's being dragged). */
  const shownStatusOf = (n: number) => {
    for (const [statusId, list] of byStatus)
      if (list.some((i) => i.number === n)) return statusId;
    return null;
  };

  const onDragStart = (e: DragStartEvent) =>
    setDragging(
      items.data?.items.find((i) => i.number === e.active.id) ?? null,
    );

  const onDragOver = ({ active, over }: DragOverEvent) => {
    if (!over || active.id === over.id) return;
    const overId = String(over.id);
    const target = overId.startsWith("col-")
      ? Number(overId.slice(4))
      : shownStatusOf(Number(over.id));
    const current = shownStatusOf(Number(active.id));
    // Reordering within a column is animated by the sortable list itself; only a column change needs a re-render.
    if (target == null || target === current) return;
    const column = byStatus.get(target) ?? [];
    const overItem = column.find((i) => i.number === over.id);
    const rank = overItem
      ? overItem.rank - 0.5
      : (column.at(-1)?.rank ?? 0) + 1024;
    movedColumn.current = true;
    setPreview({ number: Number(active.id), status_id: target, rank });
  };

  const onDragCancel = () => {
    setDragging(null);
    setPreview(null);
  };

  const onDragEnd = async (e: DragEndEvent) => {
    setDragging(null);
    const item = items.data?.items.find((i) => i.number === e.active.id);
    if (!item || !e.over) {
      setPreview(null);
      return;
    }
    const overId = String(e.over.id);
    const statusId =
      (overId.startsWith("col-")
        ? Number(overId.slice(4))
        : shownStatusOf(Number(e.over.id))) ?? item.status_id;
    const original = byStatus.get(statusId) ?? [];
    const column = original.filter((i) => i.number !== item.number);
    let index = overId.startsWith("col-")
      ? column.length
      : column.findIndex((i) => i.number === e.over!.id);
    if (index < 0) index = column.length;
    const from = original.findIndex((i) => i.number === item.number);
    // In the same column, dragging downward onto an item lands after it.
    if (
      !overId.startsWith("col-") &&
      from >= 0 &&
      from < original.findIndex((i) => i.number === e.over!.id)
    )
      index += 1;
    const prev = column[index - 1] ?? null;
    const next = column[index] ?? null;
    // Not moved: same column as saved, same neighbours. (A preview into another column always counts as a move.)
    if (
      statusId === item.status_id &&
      from >= 0 &&
      original[from - 1]?.number === prev?.number &&
      original[from + 1]?.number === next?.number
    ) {
      setPreview(null);
      return;
    }
    const rank =
      prev && next
        ? (prev.rank + next.rank) / 2
        : prev
          ? prev.rank + 1024
          : next
            ? next.rank - 1024
            : item.rank;
    // Hand the preview over to the pending placement in the same render, so the card never shows in its old column.
    setPending({ number: item.number, status_id: statusId, rank });
    setPreview(null);
    try {
      await move.mutateAsync({
        n: item.number,
        status_id: statusId,
        prev_number: prev?.number ?? null,
        next_number: next?.number ?? null,
      });
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
        action={
          <Button asChild size="sm">
            <Link href={`/projects/${space.space_key}/backlog`}>
              Go to backlog
            </Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder="Search board"
          className="sm:w-56"
        />
        <div className="flex items-center gap-2">
          <AssigneeFilter
            members={members}
            value={assignees}
            onChange={setAssignees}
          />
          <InvitePeopleButton />
        </div>
        <FilterSelect
          allLabel="All types"
          value={type}
          onChange={setType}
          options={ITEM_TYPES.map((t) => ({
            value: t,
            label: ITEM_TYPE_LABELS[t],
          }))}
        />
        <FilterSelect
          allLabel="All priorities"
          value={priority}
          onChange={setPriority}
          options={PRIORITIES.map((p) => ({
            value: p,
            label: PRIORITY_LABELS[p],
          }))}
        />
      </div>
      {active && (
        <SprintBar
          sprint={active}
          isAdmin={isAdmin}
          onComplete={() => setCompleting(active)}
        />
      )}
      {items.error ? (
        <ErrorState error={items.error} onRetry={() => void items.refetch()} />
      ) : !items.data ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetection}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={(e) => void onDragEnd(e)}
          onDragCancel={onDragCancel}
        >
          <div className="relative -mb-6 min-w-0 overflow-hidden" style={{ height: boardHeight }}>
            <div
              ref={boardRef}
              className="flex h-full items-start gap-3 overflow-x-scroll overflow-y-hidden pb-3"
            >
              {space.statuses.map((s) => {
                const list = byStatus.get(s.id) ?? [];
                return (
                  <SortableContext
                    key={s.id}
                    id={colId(s.id)}
                    items={list.map((i) => i.number)}
                    strategy={verticalListSortingStrategy}
                  >
                    <Column
                      id={colId(s.id)}
                      label={s.name}
                      count={list.length}
                      footer={
                        <QuickCreate
                          compact
                          spaceKey={space.space_key}
                          defaults={{
                            status_id: s.id,
                            sprint_id: active?.id ?? null,
                          }}
                          className="text-muted-foreground hover:text-foreground h-8 w-full border border-dashed"
                        />
                      }
                    >
                      {list.map((i) => (
                        <SortableCard
                          key={i.number}
                          item={i}
                          subtasks={subtasksOf.get(i.number) ?? []}
                          onOpen={() => openItem(i.number)}
                          onOpenItem={openItem}
                        />
                      ))}
                    </Column>
                  </SortableContext>
                );
              })}
              {isAdmin && <AddStatusColumn spaceKey={space.space_key} />}
            </div>
            <BoardMinimap scrollRef={boardRef} />
          </div>
          <DragOverlay>
            {dragging && <Card item={dragging} overlay />}
          </DragOverlay>
        </DndContext>
      )}
      <CompleteSprintDialog
        spaceKey={space.space_key}
        sprint={completing}
        onClose={() => setCompleting(null)}
      />
    </div>
  );
}
