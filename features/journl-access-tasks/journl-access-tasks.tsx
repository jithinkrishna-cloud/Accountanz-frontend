"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api, type Paged } from "@/lib/api-client";
import { applyApiError } from "@/lib/form-errors";
import { formatDate } from "@/lib/format";

type Action = "grant" | "revoke" | "verify_revoke" | "update";
type Status = "pending" | "in_progress" | "completed" | "cancelled";

interface AccessTask {
  id: number;
  client_id: number;
  client_name: string;
  journl_org_id: string | null;
  user_name: string;
  user_email: string;
  previous_user_name: string | null;
  action: Action;
  status: Status;
  responsible_id: number | null;
  responsible_name: string | null;
  notes: string | null;
  completed_at: string | null;
  completed_by_name: string | null;
  created_at: string;
}

const STATUS_LABELS: Record<Status, string> = { pending: "Pending", in_progress: "In progress", completed: "Completed", cancelled: "Cancelled" };
const UNASSIGNED = "none";

/** What to do in JournL, in words. */
function title(t: AccessTask) {
  switch (t.action) {
    case "grant":
      return `Add ${t.user_name} to JournL`;
    case "revoke":
      return `Remove ${t.user_name} from JournL`;
    case "verify_revoke":
      return `Verify and remove ${t.user_name}'s JournL access`;
    case "update":
      return t.previous_user_name ? `Update JournL access: remove ${t.previous_user_name}, add ${t.user_name}` : `Update JournL access for ${t.user_name}`;
  }
}

const KEY = ["admin", "journl-access-tasks"] as const;

function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: { status?: Status; responsible_id?: number | null; notes?: string | null } }) =>
      api<AccessTask>(`/admin/journl-access-tasks/${id}`, { method: "PATCH", body }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
      // The assignment list shows whether access is confirmed.
      void qc.invalidateQueries({ queryKey: ["admin", "assignments"] });
    },
  });
}

/** Finish (with how it was confirmed) or cancel (with why). */
function CloseDialog({ task, mode, onClose }: { task: AccessTask | null; mode: "completed" | "cancelled"; onClose: () => void }) {
  const update = useUpdateTask();
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string>();
  const done = mode === "completed";

  async function submit() {
    if (!task) return;
    if (notes.trim().length < 3) {
      setError(done ? "Say how you confirmed it in JournL" : "Say why it's cancelled");
      return;
    }
    try {
      await update.mutateAsync({ id: task.id, body: { status: mode, notes: notes.trim() } });
      toast.success(done ? "Marked done" : "Cancelled");
      setNotes("");
      setError(undefined);
      onClose();
    } catch (err) {
      setError(applyApiError(err));
    }
  }

  return (
    <Dialog open={!!task} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{done ? "Mark as done?" : "Cancel this to-do?"}</DialogTitle>
          <DialogDescription>
            {task && title(task)} · {task?.client_name}
            {done && ". Only mark it done once you've made the change in JournL and checked it."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-1.5">
          <Label htmlFor="task-notes">{done ? "How did you confirm it?" : "Why is it cancelled?"}</Label>
          <Textarea
            id="task-notes"
            rows={3}
            maxLength={2000}
            value={notes}
            aria-invalid={!!error}
            placeholder={done ? "e.g. Added under JournL → Settings → Users, invite accepted" : "e.g. Duplicate of another to-do"}
            onChange={(e) => setNotes(e.target.value)}
          />
          {error && <p role="alert" className="text-destructive text-xs">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Back</Button>
          <Button variant={done ? "default" : "destructive"} onClick={() => void submit()} disabled={update.isPending}>{done ? "Mark done" : "Cancel to-do"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * JournL logins are changed by hand in JournL. Assignment changes queue these to-dos; access only counts as
 * granted or removed once one is marked done with a note.
 */
export function JournlAccessTasks() {
  const [status, setStatus] = useState<"open" | "done" | "all">("open");
  const [page, setPage] = useState(1);
  const [closing, setClosing] = useState<{ task: AccessTask; mode: "completed" | "cancelled" } | null>(null);
  const update = useUpdateTask();
  const list = useQuery({
    queryKey: [...KEY, status, page],
    queryFn: () => api<Paged<AccessTask>>("/admin/journl-access-tasks", { query: { status, page, pageSize: 10 } }),
    placeholderData: keepPreviousData,
  });
  const options = useQuery({ queryKey: [...KEY, "options"], queryFn: () => api<{ responsible: { id: number; full_name: string }[] }>("/admin/journl-access-tasks/options") });

  const patch = async (t: AccessTask, body: { status?: Status; responsible_id?: number | null }) => {
    try {
      await update.mutateAsync({ id: t.id, body });
    } catch (err) {
      applyApiError(err);
    }
  };

  const open = (t: AccessTask) => t.status === "pending" || t.status === "in_progress";

  const columns: Column<AccessTask>[] = [
    {
      key: "task",
      header: "To-do",
      cell: (t) => (
        <div className="min-w-0">
          <p className="font-medium">{title(t)}</p>
          <p className="text-muted-foreground text-xs">
            {t.client_name}
            {t.journl_org_id && ` · JournL company ${t.journl_org_id}`} · {t.user_email}
          </p>
          {t.notes && <p className="text-muted-foreground mt-0.5 text-xs italic">“{t.notes}”</p>}
        </div>
      ),
    },
    {
      key: "owner",
      header: "Responsible",
      hideOnMobile: true,
      cell: (t) =>
        open(t) ? (
          <Select value={t.responsible_id ? String(t.responsible_id) : UNASSIGNED} onValueChange={(v) => void patch(t, { responsible_id: v === UNASSIGNED ? null : Number(v) })}>
            <SelectTrigger className="h-8 w-40" aria-label={`Responsible for: ${title(t)}`}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
              {options.data?.responsible.map((u) => <SelectItem key={u.id} value={String(u.id)}>{u.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
        ) : (
          t.responsible_name ?? <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      cell: (t) => (
        <div className="text-sm">
          <p className={t.status === "completed" ? "text-success font-medium" : t.status === "cancelled" ? "text-muted-foreground" : "text-warning font-medium"}>{STATUS_LABELS[t.status]}</p>
          <p className="text-muted-foreground text-xs">
            {t.completed_at ? `${formatDate(t.completed_at)}${t.completed_by_name ? ` by ${t.completed_by_name}` : ""}` : `Raised ${formatDate(t.created_at)}`}
          </p>
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      cell: (t) =>
        open(t) && (
          <div className="flex justify-end gap-1.5">
            {t.status === "pending" && <Button size="sm" variant="outline" onClick={() => void patch(t, { status: "in_progress" })}>Start</Button>}
            <Button size="sm" onClick={() => setClosing({ task: t, mode: "completed" })}>Mark done</Button>
            <Button size="sm" variant="ghost" onClick={() => setClosing({ task: t, mode: "cancelled" })}>Cancel</Button>
          </div>
        ),
    },
  ];

  return (
    <section className="bg-card mb-6 rounded-xl border shadow-xs" aria-labelledby="access-todos-heading">
      <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="access-todos-heading" className="font-medium">Access to-dos</h2>
          <p className="text-muted-foreground text-xs">JournL logins are changed by hand in JournL. Access counts as given or removed only once a to-do is marked done.</p>
        </div>
        <Select value={status} onValueChange={(v) => { setStatus(v as typeof status); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-36" aria-label="Show to-dos"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="done">Finished</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <DataTable
        columns={columns}
        rows={list.data?.items}
        rowKey={(t) => t.id}
        isLoading={list.isLoading}
        error={list.error}
        onRetry={() => void list.refetch()}
        empty={{ title: status === "open" ? "Nothing to do" : "No to-dos yet", description: "Turning JournL access on or off, ending an assignment or handing one over creates a to-do here." }}
        pagination={list.data && { ...list.data, onPageChange: setPage }}
      />
      <CloseDialog task={closing?.task ?? null} mode={closing?.mode ?? "completed"} onClose={() => setClosing(null)} />
    </section>
  );
}
