"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FormField } from "@/components/shared/form-field";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api-client";
import { useCreatePortalTask, useOwnTaskActions } from "../hooks/use-client-portal";
import type { PortalTask } from "../types/client-portal.types";

const today = () => new Date().toLocaleDateString("en-CA");

/** Create a task, or (with `task`) edit one the company added. */
function TaskForm({ task, onDone }: { task?: PortalTask; onDone: (period: string) => void }) {
  const create = useCreatePortalTask();
  const { update } = useOwnTaskActions();
  const editing = !!task;
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [dueDate, setDueDate] = useState(task?.due_date ?? "");
  // A single step equal to the title was filled in automatically; show it as "no steps".
  const initialSteps = task && !(task.checklist.length === 1 && task.checklist[0]!.text === task.title) ? task.checklist.map((c) => c.text).join("\n") : "";
  const [steps, setSteps] = useState(initialSteps);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (title.trim().length < 2) next.title = "Enter a title";
    if (!dueDate) next.due_date = "Pick a due date";
    else if (dueDate < today() && dueDate !== task?.due_date) next.due_date = "Pick today or a later date";
    setErrors(next);
    if (Object.keys(next).length) return;
    const body = { title: title.trim(), description: description.trim() || null, due_date: dueDate, checklist: steps.split("\n").map((s) => s.trim()).filter(Boolean) };
    try {
      if (editing) {
        await update.mutateAsync({ id: task.id, body });
        toast.success("Task updated");
        onDone(dueDate.slice(0, 7));
      } else {
        const created = await create.mutateAsync(body);
        toast.success("Task created. Your accounting team has been notified.");
        onDone(created.period);
      }
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length) {
        setErrors(Object.fromEntries(Object.entries(err.fieldErrors).map(([k, v]) => [k, v?.[0] ?? ""])));
      } else toast.error(err instanceof ApiError ? err.message : editing ? "Couldn't save the task" : "Couldn't create the task");
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{editing ? "Edit task" : "New task"}</DialogTitle>
        <DialogDescription>
          {editing ? "You can change this task until your team starts working on it." : "Ask your accounting team to do something. It goes to your bookkeeper, and your finance manager reviews it."}
        </DialogDescription>
      </DialogHeader>
      <form id="portal-task-form" onSubmit={submit} className="grid gap-4" noValidate>
        <FormField id="pt-title" label="What needs doing?" error={errors.title || undefined}>
          <Input id="pt-title" placeholder="Reconcile March bank statement" value={title} onChange={(e) => setTitle(e.target.value)} aria-invalid={!!errors.title} maxLength={200} />
        </FormField>
        <FormField id="pt-description" label="Details (optional)" error={errors.description || undefined}>
          <Textarea id="pt-description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={5000} />
        </FormField>
        <FormField id="pt-due" label="Due date" error={errors.due_date || errors.period || undefined}>
          <Input id="pt-due" type="date" min={editing ? undefined : today()} value={dueDate} onChange={(e) => setDueDate(e.target.value)} aria-invalid={!!(errors.due_date || errors.period)} className="w-48" />
        </FormField>
        <FormField id="pt-steps" label="Steps (optional, one per line)" error={errors.checklist || undefined}>
          <Textarea id="pt-steps" rows={3} placeholder={"Collect statements\nMatch entries"} value={steps} onChange={(e) => setSteps(e.target.value)} />
        </FormField>
      </form>
      <DialogFooter>
        <Button variant="outline" onClick={() => onDone("")}>Cancel</Button>
        <SubmitButton form="portal-task-form" pending={create.isPending || update.isPending}>{editing ? "Save changes" : "Create task"}</SubmitButton>
      </DialogFooter>
    </>
  );
}

/**
 * Company owners only. Without `task` it creates one; with `task` it edits that (company-added, not started) task.
 * `onCreated` gets the task's month so the board can jump to it.
 */
export function NewTaskDialog({ open, onOpenChange, onCreated, task }: { open: boolean; onOpenChange: (open: boolean) => void; onCreated: (period: string) => void; task?: PortalTask | null }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {open && (
          <TaskForm
            key={task?.id ?? "new"}
            task={task ?? undefined}
            onDone={(period) => {
              onOpenChange(false);
              if (period) onCreated(period);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
