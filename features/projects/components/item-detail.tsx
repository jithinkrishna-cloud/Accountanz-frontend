"use client";

import { Download, Link2, MoreHorizontal, Paperclip, Plus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { ErrorState } from "@/components/shared/states";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/features/auth/hooks/use-session";
import { applyApiError } from "@/lib/form-errors";
import { formatDate, formatLocalDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  useActivity,
  useAddComment,
  useClientOptions,
  useComments,
  useCreateItem,
  useDeleteAttachment,
  useDeleteComment,
  useDeleteItem,
  useEditComment,
  useItem,
  useSprints,
  useUpdateItem,
  useUploadAttachment,
} from "../hooks/use-projects";
import { projectService } from "../services/project-service";
import { ITEM_TYPE_LABELS, ITEM_TYPES, PRIORITIES, type ItemDetail, type ItemPatch } from "../types/project.types";
import { DURATION_HINT, formatMinutes, parseDuration } from "../duration";
import { DetailRow, InlineInput, InlineSelect } from "./item-fields";
import { LogTimeDialog, TimeTrackingBar, WorklogList } from "./time-tracking";
import { formatBytes, PriorityIcon, StatusPill, TypeIcon, UserAvatar } from "./project-ui";
import { useSpaceCtx } from "./space-layout";

const MAX_ATTACHMENTS = 10;

function Title({ item, save }: { item: ItemDetail; save: (p: ItemPatch) => Promise<unknown> }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.title);
  if (!editing) {
    return (
      <h2 className="hover:bg-muted -mx-2 cursor-text rounded-md px-2 py-1 text-xl font-semibold" onClick={() => (setDraft(item.title), setEditing(true))}>
        {item.title}
      </h2>
    );
  }
  const commit = async () => {
    const t = draft.trim();
    if (t && t !== item.title) await save({ title: t });
    setEditing(false);
  };
  return (
    <Input
      autoFocus
      value={draft}
      aria-label="Summary"
      maxLength={255}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => void commit()}
      onKeyDown={(e) => {
        if (e.key === "Enter") void commit();
        if (e.key === "Escape") setEditing(false);
      }}
      className="text-lg font-semibold"
    />
  );
}

function Description({ item, save }: { item: ItemDetail; save: (p: ItemPatch) => Promise<unknown> }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.description ?? "");
  const [pending, setPending] = useState(false);
  if (!editing) {
    return (
      <div onClick={() => (setDraft(item.description ?? ""), setEditing(true))} className="hover:bg-muted -mx-2 min-h-12 cursor-text rounded-md px-2 py-1.5 text-sm whitespace-pre-wrap">
        {item.description || <span className="text-muted-foreground">Add a description…</span>}
      </div>
    );
  }
  return (
    <div className="grid gap-2">
      <Textarea autoFocus rows={6} value={draft} onChange={(e) => setDraft(e.target.value)} aria-label="Description" />
      <div className="flex gap-2">
        <SubmitButton
          size="sm"
          pending={pending}
          onClick={async () => {
            setPending(true);
            try {
              await save({ description: draft.trim() || null });
              setEditing(false);
            } finally {
              setPending(false);
            }
          }}
        >
          Save
        </SubmitButton>
        <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
      </div>
    </div>
  );
}

/**
 * One subtask in its parent's list: the key and title open it; priority, assignee and status change in place,
 * so the parent's checklist can be worked through without opening each subtask.
 */
function SubtaskRow({ subtask: s, onOpen }: { subtask: ItemDetail["subtasks"][number]; onOpen: () => void }) {
  const { space, members } = useSpaceCtx();
  const update = useUpdateItem(space.space_key);
  const save = (patch: ItemPatch) => void update.mutateAsync({ n: s.number, patch }).catch((err) => applyApiError(err));
  // Keep the current assignee selectable even if they've left the space.
  const people = members.map((m) => ({ value: m.user_id, label: <span className="flex items-center gap-2"><UserAvatar name={m.full_name} size="xs" />{m.full_name}</span> }));
  if (s.assignee_id && !members.some((m) => m.user_id === s.assignee_id)) {
    people.push({ value: s.assignee_id, label: <span className="flex items-center gap-2"><UserAvatar name={s.assignee_name} size="xs" />{s.assignee_name ?? "Former member"}</span> });
  }
  return (
    <li className={cn("flex flex-wrap items-center gap-x-2 gap-y-1 px-3 py-1.5 text-sm", update.isPending && "opacity-70")}>
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-2 rounded py-1 text-left hover:underline" title={`Open ${s.key}: ${s.title}`}>
        <TypeIcon type={s.type} />
        <span className={cn("text-muted-foreground shrink-0 font-mono text-xs", s.status_category === "done" && "line-through")}>{s.key}</span>
        <span className="min-w-0 flex-1 truncate">{s.title}</span>
      </button>
      <div className="flex shrink-0 items-center gap-1">
        <InlineSelect
          label={`Priority of ${s.key}`}
          value={s.priority}
          options={PRIORITIES.map((p) => ({ value: p, label: <PriorityIcon priority={p} withLabel /> }))}
          onChange={(v) => v && save({ priority: v })}
          className="h-7 w-32 text-xs"
        />
        <InlineSelect
          label={`Assignee of ${s.key}`}
          value={s.assignee_id}
          noneLabel="Unassigned"
          options={people}
          onChange={(v) => save({ assignee_id: v })}
          className="h-7 w-36 text-xs"
        />
        <InlineSelect
          label={`Status of ${s.key}`}
          value={s.status_id}
          options={space.statuses.map((st) => ({ value: st.id, label: <StatusPill name={st.name} category={st.category} /> }))}
          onChange={(v) => v && save({ status_id: v })}
          className="h-7 w-36 text-xs"
        />
      </div>
    </li>
  );
}

function Subtasks({ item }: { item: ItemDetail }) {
  const { space, openItem } = useSpaceCtx();
  const create = useCreateItem(space.space_key);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  if (item.type === "subtask") return null;
  const add = async () => {
    if (!title.trim()) return;
    try {
      await create.mutateAsync({ title: title.trim(), type: "subtask", parent_number: item.number });
      setTitle("");
    } catch (err) {
      applyApiError(err);
    }
  };
  const done = item.subtasks.filter((s) => s.status_category === "done").length;
  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Subtasks {item.subtasks.length > 0 && <span className="text-muted-foreground font-normal">· {done} of {item.subtasks.length} done</span>}</h3>
        <Button variant="ghost" size="sm" onClick={() => setAdding(true)}><Plus className="size-4" /> Add subtask</Button>
      </div>
      {item.subtasks.length > 0 && (
        <div className="mb-2">
          <p className="text-muted-foreground mb-1 text-xs">{Math.round((done / item.subtasks.length) * 100)}% done</p>
          <div className="bg-muted h-1.5 overflow-hidden rounded-full" role="progressbar" aria-valuemin={0} aria-valuemax={item.subtasks.length} aria-valuenow={done} aria-label="Subtasks done">
            <div className="h-full rounded-full bg-emerald-500 transition-[width]" style={{ width: `${(done / item.subtasks.length) * 100}%` }} />
          </div>
        </div>
      )}
      {item.subtasks.length > 0 && (
        <ul className="divide-y rounded-lg border">
          {item.subtasks.map((s) => (
            <SubtaskRow key={s.id} subtask={s} onOpen={() => openItem(s.number)} />
          ))}
        </ul>
      )}
      {adding && (
        <div className="mt-2 flex gap-2">
          <Input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs to be done?" maxLength={255} onKeyDown={(e) => {
            if (e.key === "Enter") void add();
            if (e.key === "Escape") setAdding(false);
          }} />
          <SubmitButton size="sm" pending={create.isPending} onClick={() => void add()}>Create</SubmitButton>
          <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
        </div>
      )}
    </section>
  );
}

function Attachments({ item }: { item: ItemDetail }) {
  const { space, isAdmin } = useSpaceCtx();
  const { data: me } = useSession();
  const upload = useUploadAttachment(space.space_key, item.number);
  const remove = useDeleteAttachment(space.space_key, item.number);
  const input = useRef<HTMLInputElement>(null);
  const full = item.attachments.length >= MAX_ATTACHMENTS;
  const onFiles = async (files: FileList | null) => {
    for (const f of Array.from(files ?? []).slice(0, MAX_ATTACHMENTS - item.attachments.length)) {
      try {
        await upload.mutateAsync(f);
      } catch (err) {
        applyApiError(err);
      }
    }
    if (input.current) input.current.value = "";
  };
  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Attachments {item.attachments.length > 0 && <span className="text-muted-foreground font-normal">· {item.attachments.length}/{MAX_ATTACHMENTS}</span>}</h3>
        <input ref={input} type="file" multiple hidden onChange={(e) => void onFiles(e.target.files)} />
        <SubmitButton type="button" variant="ghost" size="sm" pending={upload.isPending} disabled={full} onClick={() => input.current?.click()} title={full ? "Limit of 10 attachments reached" : "Up to 10 MB each"}>
          <Paperclip className="size-4" /> Add attachment
        </SubmitButton>
      </div>
      {item.attachments.length > 0 ? (
        <ul className="grid gap-2 sm:grid-cols-2">
          {item.attachments.map((a) => (
            <li key={a.id} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
              <Paperclip className="text-muted-foreground size-4 shrink-0" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium" title={a.file_name}>{a.file_name}</p>
                <p className="text-muted-foreground text-xs">{formatBytes(a.size_bytes)} · {a.uploaded_by_name ?? "Unknown"}</p>
              </div>
              <Button size="icon" variant="ghost" className="size-7" asChild>
                <a href={projectService.attachmentUrl(space.space_key, item.number, a.id)} aria-label={`Download ${a.file_name}`}><Download className="size-4" /></a>
              </Button>
              {(isAdmin || a.uploaded_by === me?.id) && (
                <Button size="icon" variant="ghost" className="size-7" aria-label={`Remove ${a.file_name}`} onClick={() => void remove.mutateAsync(a.id).catch((e) => applyApiError(e))}>
                  <Trash2 className="size-4" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground text-sm">No attachments. Up to 10 files, 10 MB each.</p>
      )}
    </section>
  );
}

const FIELD_LABELS: Record<string, string> = {
  title: "summary",
  description: "description",
  priority: "priority",
  story_points: "story points",
  start_date: "start date",
  due_date: "due date",
  status: "status",
  assignee: "assignee",
  reporter: "reporter",
  client: "client",
  type: "type",
  parent: "parent",
  sprint: "sprint",
  labels: "labels",
};

function Activity({ item }: { item: ItemDetail }) {
  const { space, isAdmin } = useSpaceCtx();
  const { data: me } = useSession();
  const [tab, setTab] = useState<"comments" | "history" | "worklog">("comments");
  const [logging, setLogging] = useState(false);
  const comments = useComments(space.space_key, item.number);
  const history = useActivity(space.space_key, item.number, tab === "history");
  const add = useAddComment(space.space_key, item.number);
  const edit = useEditComment(space.space_key, item.number);
  const del = useDeleteComment(space.space_key, item.number);
  const [body, setBody] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editBody, setEditBody] = useState("");

  return (
    <section>
      <div className="mb-3 flex items-center gap-1">
        <h3 className="mr-3 text-sm font-semibold">Activity</h3>
        {(["comments", "history", "worklog"] as const).map((t) => (
          <Button key={t} size="sm" variant={tab === t ? "secondary" : "ghost"} onClick={() => setTab(t)} aria-pressed={tab === t}>
            {t === "comments" ? "Comments" : t === "history" ? "History" : "Work log"}
          </Button>
        ))}
      </div>
      <LogTimeDialog item={item} open={logging} onOpenChange={setLogging} />
      {tab === "worklog" ? (
        <WorklogList item={item} onLog={() => setLogging(true)} />
      ) : tab === "comments" ? (
        <div className="grid gap-4">
          <div className="flex gap-3">
            <UserAvatar name={me?.fullName ?? null} size="md" />
            <div className="grid flex-1 gap-2">
              <Textarea rows={2} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Add a comment…" aria-label="Add a comment" />
              {body.trim() && (
                <div className="flex gap-2">
                  <SubmitButton size="sm" pending={add.isPending} onClick={() => void add.mutateAsync(body.trim()).then(() => setBody("")).catch((e) => applyApiError(e))}>Save</SubmitButton>
                  <Button size="sm" variant="ghost" onClick={() => setBody("")}>Cancel</Button>
                </div>
              )}
            </div>
          </div>
          {comments.error && <ErrorState error={comments.error} onRetry={() => void comments.refetch()} />}
          {comments.data?.map((c) => (
            <div key={c.id} className="flex gap-3">
              <UserAvatar name={c.author_name} size="md" />
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <span className="font-medium">{c.author_name ?? "Former user"}</span>{" "}
                  <span className="text-muted-foreground text-xs">{formatLocalDateTime(c.created_at)}{c.edited_at ? " · edited" : ""}</span>
                </p>
                {editingId === c.id ? (
                  <div className="mt-1 grid gap-2">
                    <Textarea rows={2} value={editBody} onChange={(e) => setEditBody(e.target.value)} aria-label="Edit comment" />
                    <div className="flex gap-2">
                      <SubmitButton size="sm" pending={edit.isPending} onClick={() => void edit.mutateAsync({ id: c.id, body: editBody.trim() }).then(() => setEditingId(null)).catch((e) => applyApiError(e))}>Save</SubmitButton>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-0.5 text-sm whitespace-pre-wrap">{c.body}</p>
                )}
                {editingId !== c.id && (c.author_id === me?.id || isAdmin) && (
                  <div className="mt-1 flex gap-3 text-xs">
                    {c.author_id === me?.id && <button type="button" className="text-muted-foreground hover:underline" onClick={() => (setEditingId(c.id), setEditBody(c.body))}>Edit</button>}
                    <button type="button" className="text-muted-foreground hover:underline" onClick={() => void del.mutateAsync(c.id).catch((e) => applyApiError(e))}>Delete</button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {comments.data?.length === 0 && <p className="text-muted-foreground text-sm">No comments yet.</p>}
        </div>
      ) : (
        <ul className="grid gap-3">
          {history.data?.map((a) => (
            <li key={a.id} className="flex gap-3 text-sm">
              <UserAvatar name={a.actor_name} size="sm" />
              <div className="min-w-0">
                <p>
                  <span className="font-medium">{a.actor_name ?? "Someone"}</span>{" "}
                  {a.action === "created" ? "created the work item" : a.action === "commented" ? "commented" : a.action === "attachment_added" ? `attached ${a.new_value}` : a.action === "attachment_removed" ? `removed ${a.old_value}` : a.action === "logged work" ? `logged ${a.new_value ?? "time"}` : a.action === "removed work log" ? `removed ${a.old_value ?? "a"} work log entry` : `changed the ${FIELD_LABELS[a.field ?? ""] ?? a.field}`}
                  <span className="text-muted-foreground"> · {formatLocalDateTime(a.created_at)}</span>
                </p>
                {a.action === "updated" && a.field !== "description" && (
                  <p className="text-muted-foreground text-xs">
                    <span className="line-through">{a.old_value ?? "None"}</span> → <span className="text-foreground">{a.new_value ?? "None"}</span>
                  </p>
                )}
              </div>
            </li>
          ))}
          {history.data?.length === 0 && <li className="text-muted-foreground text-sm">No history yet.</li>}
        </ul>
      )}
    </section>
  );
}

function DetailsPanel({ item, save }: { item: ItemDetail; save: (p: ItemPatch) => Promise<unknown> }) {
  const [logging, setLogging] = useState(false);
  const { space, members, openItem } = useSpaceCtx();
  const clients = useClientOptions();
  const sprints = useSprints(space.space_key, space.template === "scrum");
  const memberOpts = members.map((m) => ({ value: m.user_id, label: <span className="flex items-center gap-2"><UserAvatar name={m.full_name} size="xs" />{m.full_name}</span> }));
  // Keep a removed member visible as the current value.
  const withCurrent = (id: number | null, name: string | null) =>
    id && !members.some((m) => m.user_id === id) ? [...memberOpts, { value: id, label: <span>{name ?? "Former member"} (not in space)</span> }] : memberOpts;
  const openSprints = (sprints.data ?? []).filter((s) => s.status !== "completed");

  return (
    <div className="divide-y rounded-xl border">
      <div className="p-4">
        <InlineSelect
          label="Status"
          value={item.status_id}
          options={space.statuses.map((s) => ({ value: s.id, label: s.name }))}
          onChange={(v) => v && void save({ status_id: v })}
          className="bg-primary/10 text-primary w-auto min-w-36 font-semibold"
        />
      </div>
      <div className="p-4">
        <p className="mb-2 text-sm font-semibold">Details</p>
        <DetailRow label="Assignee"><InlineSelect label="Assignee" value={item.assignee_id} noneLabel="Unassigned" options={withCurrent(item.assignee_id, item.assignee_name)} onChange={(v) => void save({ assignee_id: v })} /></DetailRow>
        <DetailRow label="Reporter"><InlineSelect label="Reporter" value={item.reporter_id} noneLabel="None" options={withCurrent(item.reporter_id, item.reporter_name)} onChange={(v) => void save({ reporter_id: v })} /></DetailRow>
        <DetailRow label="Priority">
          <InlineSelect label="Priority" value={item.priority} options={PRIORITIES.map((p) => ({ value: p, label: <PriorityIcon priority={p} withLabel /> }))} onChange={(v) => v && void save({ priority: v })} />
        </DetailRow>
        <DetailRow label="Type">
          <InlineSelect
            label="Type"
            value={item.type}
            options={ITEM_TYPES.filter((t) => t !== "subtask" || item.type === "subtask").map((t) => ({ value: t, label: <span className="flex items-center gap-2"><TypeIcon type={t} />{ITEM_TYPE_LABELS[t]}</span> }))}
            onChange={(v) => v && void save({ type: v })}
          />
        </DetailRow>
        {item.type === "subtask" ? (
          <DetailRow label="Parent">
            {item.parent_number ? (
              <button type="button" onClick={() => openItem(item.parent_number!)} className="text-primary flex items-center gap-1 px-2 text-sm hover:underline">
                <Link2 className="size-3.5" /> {space.space_key}-{item.parent_number} {item.parent_title}
              </button>
            ) : (
              "—"
            )}
          </DetailRow>
        ) : (
          space.template === "scrum" && (
            <DetailRow label="Sprint">
              <InlineSelect label="Sprint" value={item.sprint_id} noneLabel="Backlog" options={[...openSprints.map((s) => ({ value: s.id, label: `${s.name}${s.status === "active" ? " (active)" : ""}` })), ...(item.sprint_id && !openSprints.some((s) => s.id === item.sprint_id) ? [{ value: item.sprint_id, label: item.sprint_name ?? "Sprint" }] : [])]} onChange={(v) => void save({ sprint_id: v })} />
            </DetailRow>
          )
        )}
        {item.type === "subtask" && space.template === "scrum" && <DetailRow label="Sprint"><span className="px-2 text-sm">{item.sprint_name ?? "Backlog"}</span></DetailRow>}
        <DetailRow label="Story points"><InlineInput label="Story points" type="number" value={item.story_points == null ? null : String(item.story_points)} onSave={(v) => save({ story_points: v == null ? null : Number(v) })} /></DetailRow>
        <DetailRow label="Original estimate">
          <InlineInput
            label="Original estimate"
            value={formatMinutes(item.original_estimate_minutes) || null}
            placeholder="None"
            display={<span className="bg-muted rounded px-1.5 py-0.5 text-xs font-medium">{formatMinutes(item.original_estimate_minutes)}</span>}
            onSave={(v) => {
              if (v == null) return save({ original_estimate_minutes: null });
              const minutes = parseDuration(v);
              if (!minutes) {
                toast.error(`Couldn't read "${v}". Use ${DURATION_HINT}.`);
                return;
              }
              return save({ original_estimate_minutes: minutes });
            }}
          />
        </DetailRow>
        <div className="py-1.5">
          <p className="text-muted-foreground mb-0.5 text-sm">Time tracking</p>
          <TimeTrackingBar item={item} onLog={() => setLogging(true)} />
        </div>
        <LogTimeDialog item={item} open={logging} onOpenChange={setLogging} />
        <DetailRow label="Labels">
          <InlineInput label="Labels" value={item.labels.join(" ") || null} placeholder="None" display={<span className="flex flex-wrap gap-1">{item.labels.map((l) => <span key={l} className="bg-muted rounded px-1.5 py-0.5 text-xs">{l}</span>)}</span>} onSave={(v) => save({ labels: (v ?? "").split(/[\s,]+/).filter(Boolean) })} />
        </DetailRow>
        <DetailRow label="Start date"><InlineInput label="Start date" type="date" value={item.start_date} display={formatDate(item.start_date)} onSave={(v) => save({ start_date: v })} /></DetailRow>
        <DetailRow label="Due date"><InlineInput label="Due date" type="date" value={item.due_date} display={formatDate(item.due_date)} onSave={(v) => save({ due_date: v })} /></DetailRow>
        <DetailRow label="Client"><InlineSelect label="Client" value={item.client_id} noneLabel="No client" options={(clients.data ?? []).map((c) => ({ value: c.id, label: c.name }))} onChange={(v) => void save({ client_id: v })} /></DetailRow>
      </div>
      <div className="text-muted-foreground space-y-1 p-4 text-xs">
        <p>Created {formatLocalDateTime(item.created_at)}</p>
        <p>Updated {formatLocalDateTime(item.updated_at)}</p>
        {item.resolved_at && <p>Resolved {formatLocalDateTime(item.resolved_at)}</p>}
      </div>
    </div>
  );
}

/** The work item: editable title, description, subtasks, attachments, activity, and the details panel. */
export function ItemDetailView({ number, onDeleted, wide }: { number: number; onDeleted?: () => void; wide?: boolean }) {
  const { space, isAdmin, openItem } = useSpaceCtx();
  const { data: me } = useSession();
  const query = useItem(space.space_key, number);
  const update = useUpdateItem(space.space_key);
  const del = useDeleteItem(space.space_key);

  if (query.error) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  if (!query.data) return <Skeleton className="h-96 w-full" />;
  const item = query.data;
  const save = (patch: ItemPatch) => update.mutateAsync({ n: item.number, patch }).catch((err) => applyApiError(err));
  const canDelete = isAdmin || item.reporter_id === me?.id;

  return (
    <div className={cn("grid gap-6", wide ? "lg:grid-cols-[1fr_22rem]" : "xl:grid-cols-[1fr_20rem]")}>
      <div className="grid min-w-0 content-start gap-6">
        <div>
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            {item.parent_number && (
              <>
                <button type="button" className="hover:underline" onClick={() => openItem(item.parent_number!)}>{space.space_key}-{item.parent_number}</button> /
              </>
            )}
            <TypeIcon type={item.type} />
            <span className="font-mono">{item.key}</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="ml-auto size-8" aria-label="More actions"><MoreHorizontal className="size-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => void navigator.clipboard.writeText(`${window.location.origin}/projects/${space.space_key}/items/${item.number}`).then(() => toast.success("Link copied"))}>
                  <Link2 className="size-4" /> Copy link
                </DropdownMenuItem>
                {canDelete && (
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => {
                      const extra = item.subtask_count ? ` and its ${item.subtask_count} subtask(s)` : "";
                      if (!window.confirm(`Delete ${item.key}${extra}? This can't be undone.`)) return;
                      void del.mutateAsync(item.number).then(() => (toast.success(`${item.key} deleted`), onDeleted?.())).catch((e) => applyApiError(e));
                    }}
                  >
                    <Trash2 className="size-4" /> Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <Title key={item.title} item={item} save={save} />
        </div>
        <section>
          <h3 className="mb-1 text-sm font-semibold">Description</h3>
          <Description key={item.description ?? ""} item={item} save={save} />
        </section>
        <Subtasks item={item} />
        <Attachments item={item} />
        <Activity item={item} />
      </div>
      <div className="min-w-0">
        <DetailsPanel item={item} save={save} />
      </div>
    </div>
  );
}
