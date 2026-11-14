"use client";

import { ArrowDown, ArrowUp, Columns3 } from "lucide-react";
import { Fragment, useState } from "react";
import { FilterSelect } from "@/components/shared/filter-select";
import { SearchInput } from "@/components/shared/search-input";
import { ErrorState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { applyApiError } from "@/lib/form-errors";
import { formatDate, formatLocalDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useClientOptions, useItems, useSprints, useUpdateItem } from "../hooks/use-projects";
import { ITEM_TYPE_LABELS, ITEM_TYPES, PRIORITIES, PRIORITY_LABELS, type Item, type ItemType, type Priority } from "../types/project.types";
import { InlineSelect } from "./item-fields";
import { AssigneeFilter, PriorityIcon, TypeIcon, UserAvatar } from "./project-ui";
import { QuickCreate } from "./quick-create";
import { useSpaceCtx } from "./space-layout";

type ColKey = "assignee" | "reporter" | "priority" | "status" | "client" | "sprint" | "story_points" | "due_date" | "created_at" | "updated_at";
const COLUMNS: { key: ColKey; label: string; sort?: string }[] = [
  { key: "assignee", label: "Assignee", sort: "assignee" },
  { key: "reporter", label: "Reporter", sort: "reporter" },
  { key: "priority", label: "Priority", sort: "priority" },
  { key: "status", label: "Status", sort: "status" },
  { key: "client", label: "Client" },
  { key: "sprint", label: "Sprint" },
  { key: "story_points", label: "Story points", sort: "story_points" },
  { key: "due_date", label: "Due date", sort: "due_date" },
  { key: "created_at", label: "Created", sort: "created_at" },
  { key: "updated_at", label: "Updated", sort: "updated_at" },
];
const DEFAULT_COLS: ColKey[] = ["assignee", "reporter", "priority", "status", "client", "due_date", "created_at", "updated_at"];
const STORAGE_KEY = "projects.list.columns";

/** Per-viewer column choice (browser storage; falls back to the defaults when unavailable). */
function readSavedColumns(): ColKey[] {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as ColKey[] | null;
    if (Array.isArray(saved)) return saved.filter((c) => COLUMNS.some((x) => x.key === c));
  } catch {
    /* per-viewer convenience only */
  }
  return DEFAULT_COLS;
}

function useVisibleColumns() {
  // The Workspace renders only after the client-side session check, so storage is available here.
  const [cols, setCols] = useState<ColKey[]>(readSavedColumns);
  const toggle = (c: ColKey) =>
    setCols((cur) => {
      const next = cur.includes(c) ? cur.filter((x) => x !== c) : COLUMNS.map((x) => x.key).filter((k) => k === c || cur.includes(k));
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  return [cols, toggle] as const;
}

export function ListView() {
  const { space, members, openItem } = useSpaceCtx();
  const scrum = space.template === "scrum";
  const [cols, toggleCol] = useVisibleColumns();
  const [q, setQ] = useState("");
  const [assignees, setAssignees] = useState<string[]>([]);
  const [type, setType] = useState<string>();
  const [statusId, setStatusId] = useState<string>();
  const [priority, setPriority] = useState<string>();
  const [clientId, setClientId] = useState<string>();
  const [sprint, setSprint] = useState<string>();
  const [sort, setSort] = useState("key");
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const clients = useClientOptions();
  const sprints = useSprints(space.space_key, scrum);
  const update = useUpdateItem(space.space_key);
  const query = useItems(space.space_key, {
    q: q || undefined,
    assignee_id: assignees.join(",") || undefined,
    type: type as ItemType | undefined,
    status_id: statusId ? Number(statusId) : undefined,
    priority: priority as Priority | undefined,
    client_id: clientId ? Number(clientId) : undefined,
    sprint,
    sort,
    dir,
    page,
    pageSize: 50,
  });
  const reset = <T,>(set: (v: T) => void) => (v: T) => (set(v), setPage(1));
  const sortBy = (s: string) => {
    if (sort === s) {
      setDir(dir === "asc" ? "desc" : "asc");
    } else {
      setSort(s);
      setDir("asc");
    }
    setPage(1);
  };
  const header = (label: string, s?: string) => (
    <th className="text-muted-foreground px-3 py-2 text-left text-xs font-semibold whitespace-nowrap">
      {s ? (
        <button type="button" onClick={() => sortBy(s)} className="hover:text-foreground inline-flex items-center gap-1">
          {label}
          {sort === s && (dir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
        </button>
      ) : (
        label
      )}
    </th>
  );
  const cell = (i: Item, c: ColKey) => {
    switch (c) {
      case "assignee":
        return <span className="flex items-center gap-2 whitespace-nowrap"><UserAvatar name={i.assignee_name} size="sm" />{i.assignee_name ?? <span className="text-muted-foreground">Unassigned</span>}</span>;
      case "reporter":
        return <span className="flex items-center gap-2 whitespace-nowrap"><UserAvatar name={i.reporter_name} size="sm" />{i.reporter_name ?? "—"}</span>;
      case "priority":
        return <PriorityIcon priority={i.priority} withLabel />;
      case "status":
        return (
          <div className="w-36">
            <InlineSelect label="Status" value={i.status_id} options={space.statuses.map((s) => ({ value: s.id, label: s.name }))} onChange={(v) => v && void update.mutateAsync({ n: i.number, patch: { status_id: v } }).catch((e) => applyApiError(e))} className="h-7 text-xs" />
          </div>
        );
      case "client":
        return i.client_name ?? <span className="text-muted-foreground">—</span>;
      case "sprint":
        return i.sprint_name ?? <span className="text-muted-foreground">—</span>;
      case "story_points":
        return i.story_points ?? "—";
      case "due_date":
        return <span className="whitespace-nowrap">{formatDate(i.due_date)}</span>;
      case "created_at":
        return <span className="whitespace-nowrap">{formatLocalDateTime(i.created_at)}</span>;
      case "updated_at":
        return <span className="whitespace-nowrap">{formatLocalDateTime(i.updated_at)}</span>;
    }
  };
  const shown = COLUMNS.filter((c) => cols.includes(c.key) && (c.key !== "sprint" || scrum));
  const data = query.data;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={q} onChange={reset(setQ)} placeholder="Search work" className="sm:w-56" />
        <AssigneeFilter members={members} value={assignees} onChange={reset(setAssignees)} />
        <FilterSelect allLabel="All types" value={type} onChange={reset(setType)} options={ITEM_TYPES.map((t) => ({ value: t, label: ITEM_TYPE_LABELS[t] }))} />
        <FilterSelect allLabel="All statuses" value={statusId} onChange={reset(setStatusId)} options={space.statuses.map((s) => ({ value: String(s.id), label: s.name }))} />
        <FilterSelect allLabel="All priorities" value={priority} onChange={reset(setPriority)} options={PRIORITIES.map((p) => ({ value: p, label: PRIORITY_LABELS[p] }))} />
        <FilterSelect allLabel="All clients" value={clientId} onChange={reset(setClientId)} options={(clients.data ?? []).map((c) => ({ value: String(c.id), label: c.name }))} />
        {scrum && (
          <FilterSelect allLabel="All sprints" value={sprint} onChange={reset(setSprint)} options={[{ value: "none", label: "Backlog" }, ...(sprints.data ?? []).map((s) => ({ value: String(s.id), label: s.name }))]} />
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="ml-auto"><Columns3 className="size-4" /> Columns</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {COLUMNS.filter((c) => c.key !== "sprint" || scrum).map((c) => (
              <DropdownMenuCheckboxItem key={c.key} checked={cols.includes(c.key)} onCheckedChange={() => toggleCol(c.key)} onSelect={(e) => e.preventDefault()}>
                {c.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {query.error ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : !data ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <div className="bg-card rounded-xl border shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr>
                  {header("Work", "key")}
                  {shown.map((c) => <Fragment key={c.key}>{header(c.label, c.sort)}</Fragment>)}
                </tr>
              </thead>
              <tbody>
                {data.items.map((i) => (
                  <tr key={i.id} className="hover:bg-muted/40 border-b last:border-b-0">
                    <td className="px-3 py-2">
                      <button type="button" onClick={() => openItem(i.number)} className="flex max-w-md items-center gap-2 text-left">
                        <TypeIcon type={i.type} />
                        <span className={cn("text-primary shrink-0 font-mono text-xs", i.status_category === "done" && "line-through")}>{i.key}</span>
                        <span className="truncate hover:underline">{i.title}</span>
                      </button>
                    </td>
                    {shown.map((c) => <td key={c.key} className="px-3 py-2">{cell(i, c.key)}</td>)}
                  </tr>
                ))}
                {data.items.length === 0 && (
                  <tr>
                    <td colSpan={shown.length + 1} className="text-muted-foreground px-3 py-10 text-center">No work items match.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center gap-3 border-t p-2">
            <QuickCreate spaceKey={space.space_key} className="text-muted-foreground justify-start" />
            <div className="text-muted-foreground ml-auto flex items-center gap-2 text-sm">
              <span>
                {data.total === 0 ? 0 : (data.page - 1) * data.pageSize + 1}–{Math.min(data.page * data.pageSize, data.total)} of {data.total}
              </span>
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
              <Button size="sm" variant="outline" disabled={page * data.pageSize >= data.total} onClick={() => setPage(page + 1)}>Next</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
