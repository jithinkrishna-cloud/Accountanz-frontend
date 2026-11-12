"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Pencil, Send, Undo2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { FormField } from "@/components/shared/form-field";
import { ErrorState } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { ReviewDialog } from "@/features/reviews/components/review-dialog";
import type { ReviewQueueItem } from "@/features/reviews/types/review.types";
import { applyApiError } from "@/lib/form-errors";
import { formatDate, formatPeriod } from "@/lib/format";
import { useLogWork, useSetChecklist, useSubmitTask, useTask } from "../hooks/use-tasks";
import { workLogFormSchema, type WorkLogFormOutput, type WorkLogFormValues } from "../schemas/task.schema";
import type { TaskPortal } from "../services/task-service";
import type { TaskDetail } from "../types/task.types";
import { TaskFormDialog } from "./task-form-dialog";

const today = () => new Date().toISOString().slice(0, 10);

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t px-5 py-4">
      <h3 className="text-muted-foreground mb-3 text-xs font-semibold tracking-[0.12em] uppercase">{title}</h3>
      {children}
    </section>
  );
}

function Checklist({ task }: { task: TaskDetail }) {
  const setChecklist = useSetChecklist(task.id);
  const toggle = async (index: number, done: boolean) => {
    try {
      await setChecklist.mutateAsync(task.checklist.map((c, i) => (i === index ? done : c.done)));
    } catch (err) {
      applyApiError(err);
    }
  };
  return (
    <ul className="space-y-2">
      {task.checklist.map((c, i) => (
        <li key={`${i}-${c.text}`}>
          <label className="flex items-start gap-2.5 text-sm">
            <Checkbox
              checked={c.done}
              disabled={!task.permissions.can_work || setChecklist.isPending}
              onCheckedChange={(v) => toggle(i, v === true)}
              className="mt-0.5"
            />
            <span className={c.done ? "text-muted-foreground line-through" : ""}>{c.text}</span>
          </label>
        </li>
      ))}
    </ul>
  );
}

function LogTimeForm({ task }: { task: TaskDetail }) {
  const log = useLogWork(task.id);
  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<WorkLogFormValues, unknown, WorkLogFormOutput>({
    resolver: zodResolver(workLogFormSchema),
    defaultValues: { minutes: "", note: "", logged_on: today() },
  });
  const onSubmit = handleSubmit(async (v) => {
    try {
      await log.mutateAsync(v);
      toast.success(`${v.minutes} min logged`);
      reset({ minutes: "", note: "", logged_on: today() });
    } catch (err) {
      applyApiError(err, setError, ["minutes", "note", "logged_on"]);
    }
  });
  return (
    <form onSubmit={onSubmit} className="grid grid-cols-[6rem_1fr] gap-2 sm:grid-cols-[6rem_9rem_1fr_auto]" noValidate>
      <FormField id="minutes" label="Minutes" error={errors.minutes?.message}>
        <Input id="minutes" type="number" inputMode="numeric" min={1} max={720} {...register("minutes")} />
      </FormField>
      <FormField id="logged_on" label="Date" error={errors.logged_on?.message}>
        <Input id="logged_on" type="date" max={today()} {...register("logged_on")} />
      </FormField>
      <FormField id="note" label="Note" error={errors.note?.message} className="col-span-2 sm:col-span-1">
        <Input id="note" placeholder="What you worked on" {...register("note")} />
      </FormField>
      <div className="col-span-2 flex items-end sm:col-span-1">
        <SubmitButton pending={log.isPending} variant="outline" className="w-full">Log time</SubmitButton>
      </div>
    </form>
  );
}

/** Shared task panel: the controls shown come from the permissions the API computed for this user. */
export function TaskDetailSheet({ portal, taskId, onClose }: { portal: TaskPortal; taskId: number | null; onClose: () => void }) {
  const { data: task, isLoading, error, refetch } = useTask(portal, taskId);
  const submit = useSubmitTask(taskId ?? 0);
  const [editing, setEditing] = useState(false);
  const [reviewing, setReviewing] = useState<ReviewQueueItem | null>(null);

  const doSubmit = async () => {
    try {
      await submit.mutateAsync(undefined);
      toast.success("Submitted for review");
    } catch (err) {
      applyApiError(err);
    }
  };

  const openReview = (t: TaskDetail) =>
    setReviewing({
      task_id: t.id,
      title: t.title,
      period: t.period,
      due_date: t.due_date,
      submitted_at: t.submitted_at,
      client_id: t.client_id,
      client_name: t.client_name,
      assignee_id: t.assignee_id,
      assignee_email: t.assignee_name,
      reviewer_email: t.reviewer_name,
      waiting_days: 0,
    });

  const minutes = task?.work_logs.reduce((s, w) => s + w.minutes, 0) ?? 0;
  const openPoints = task?.checklist.filter((c) => !c.done).length ?? 0;

  return (
    <>
      <Sheet open={taskId !== null} onOpenChange={(o) => !o && onClose()}>
        <SheetContent className="w-full gap-0 overflow-y-auto p-0 sm:max-w-xl">
          {error ? (
            <ErrorState error={error} onRetry={() => void refetch()} />
          ) : isLoading || !task ? (
            <div className="space-y-3 p-6"><Skeleton className="h-6 w-2/3" /><Skeleton className="h-4 w-1/2" /><Skeleton className="h-32 w-full" /></div>
          ) : (
            <>
              <SheetHeader className="px-5 pt-5 pb-4">
                <div className="flex flex-wrap items-center gap-2 pr-8">
                  <StatusBadge status={task.status} />
                  <span className="bg-secondary rounded px-1.5 py-0.5 text-xs">{task.creation_source === "manual" ? "One-off" : "Template"}</span>
                  {!task.client_visible && <span className="text-muted-foreground text-xs">Internal only</span>}
                </div>
                <SheetTitle className="text-lg">{task.title}</SheetTitle>
                <SheetDescription>
                  {task.client_name} · {formatPeriod(task.period)} · due {formatDate(task.due_date)}
                </SheetDescription>
              </SheetHeader>

              <div className="flex flex-wrap gap-2 px-5 pb-4">
                {task.permissions.can_submit && (
                  <SubmitButton type="button" size="sm" pending={submit.isPending} disabled={openPoints > 0} onClick={doSubmit} title={openPoints ? `${openPoints} checklist point(s) left` : undefined}>
                    <Send className="size-4" /> Submit for review
                  </SubmitButton>
                )}
                {task.permissions.can_review && (
                  <Button size="sm" onClick={() => openReview(task)}><CheckCircle2 className="size-4" /> Review</Button>
                )}
                {task.permissions.can_edit && (
                  <Button size="sm" variant="outline" onClick={() => setEditing(true)}><Pencil className="size-4" /> Edit</Button>
                )}
              </div>

              <dl className="grid grid-cols-2 gap-3 border-t px-5 py-4 text-sm">
                <div><dt className="text-muted-foreground text-xs">Assignee</dt><dd>{task.assignee_name ?? "Unassigned"}</dd></div>
                <div><dt className="text-muted-foreground text-xs">Reviewer</dt><dd>{task.reviewer_name ?? "—"}</dd></div>
                <div><dt className="text-muted-foreground text-xs">Created by</dt><dd className="truncate">{task.created_by_email ?? "—"}</dd></div>
                <div><dt className="text-muted-foreground text-xs">Time logged</dt><dd className="tabular-nums">{(minutes / 60).toFixed(1)} h</dd></div>
              </dl>

              {task.description && (
                <Section title="Description"><p className="text-sm whitespace-pre-line">{task.description}</p></Section>
              )}

              <Section title={`Checklist · ${task.checklist.length - openPoints}/${task.checklist.length}`}>
                <Checklist task={task} />
                {task.permissions.can_submit && openPoints > 0 && (
                  <p className="text-muted-foreground mt-3 text-xs">Tick every point before submitting.</p>
                )}
              </Section>

              <Section title="Time">
                {task.permissions.can_log_time && <div className="mb-4"><LogTimeForm task={task} /></div>}
                {task.work_logs.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No time logged yet.</p>
                ) : (
                  <ul className="space-y-1.5 text-sm">
                    {task.work_logs.map((w) => (
                      <li key={w.id} className="flex justify-between gap-3">
                        <span className="text-muted-foreground truncate">{formatDate(w.logged_on)} · {w.user_email}{w.note ? ` · ${w.note}` : ""}</span>
                        <span className="shrink-0 tabular-nums">{w.minutes} min</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>

              <Section title="Review history">
                {task.reviews.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Not reviewed yet.</p>
                ) : (
                  <ul className="space-y-3 text-sm">
                    {task.reviews.map((r, i) => (
                      <li key={i} className="flex gap-2">
                        {r.decision === "approved" ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden /> : <Undo2 className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden />}
                        <div>
                          <p><span className="font-medium">{r.decision === "approved" ? "Approved" : "Returned"}</span> · submission {r.submission_number} · {r.reviewer_email ?? "—"}</p>
                          {r.comments && <p className="text-muted-foreground">{r.comments}</p>}
                          <p className="text-muted-foreground text-xs">{formatDate(r.created_at, true)}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>
            </>
          )}
        </SheetContent>
      </Sheet>
      {task && <TaskFormDialog portal={portal} open={editing} onOpenChange={setEditing} task={task} />}
      <ReviewDialog portal={portal} item={reviewing} onOpenChange={(o) => !o && setReviewing(null)} />
    </>
  );
}
