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
import { useCreatePortalTask } from "../hooks/use-client-portal";

const today = () => new Date().toLocaleDateString("en-CA");

function NewTaskForm({ onDone }: { onDone: (period: string) => void }) {
  const create = useCreatePortalTask();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [steps, setSteps] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (title.trim().length < 2) next.title = "Enter a title";
    if (!dueDate) next.due_date = "Pick a due date";
    else if (dueDate < today()) next.due_date = "Pick today or a later date";
    setErrors(next);
    if (Object.keys(next).length) return;
    try {
      const task = await create.mutateAsync({
        title: title.trim(),
        description: description.trim() || null,
        due_date: dueDate,
        checklist: steps.split("\n").map((s) => s.trim()).filter(Boolean),
      });
      toast.success("Task created. Your accounting team has been notified.");
      onDone(task.period);
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length) {
        setErrors(Object.fromEntries(Object.entries(err.fieldErrors).map(([k, v]) => [k, v?.[0] ?? ""])));
      } else toast.error(err instanceof ApiError ? err.message : "Couldn't create the task");
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>New task</DialogTitle>
        <DialogDescription>Ask your accounting team to do something. It goes to your bookkeeper, and your finance manager reviews it.</DialogDescription>
      </DialogHeader>
      <form id="portal-task-form" onSubmit={submit} className="grid gap-4" noValidate>
        <FormField id="pt-title" label="What needs doing?" error={errors.title || undefined}>
          <Input id="pt-title" placeholder="Reconcile March bank statement" value={title} onChange={(e) => setTitle(e.target.value)} aria-invalid={!!errors.title} maxLength={200} />
        </FormField>
        <FormField id="pt-description" label="Details (optional)" error={errors.description || undefined}>
          <Textarea id="pt-description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={5000} />
        </FormField>
        <FormField id="pt-due" label="Due date" error={errors.due_date || errors.period || undefined}>
          <Input id="pt-due" type="date" min={today()} value={dueDate} onChange={(e) => setDueDate(e.target.value)} aria-invalid={!!(errors.due_date || errors.period)} className="w-48" />
        </FormField>
        <FormField id="pt-steps" label="Steps (optional, one per line)" error={errors.checklist || undefined}>
          <Textarea id="pt-steps" rows={3} placeholder={"Collect statements\nMatch entries"} value={steps} onChange={(e) => setSteps(e.target.value)} />
        </FormField>
      </form>
      <DialogFooter>
        <Button variant="outline" onClick={() => onDone("")}>Cancel</Button>
        <SubmitButton form="portal-task-form" pending={create.isPending}>Create task</SubmitButton>
      </DialogFooter>
    </>
  );
}

/** Company owners only. `onCreated` gets the new task's month so the board can jump to it. */
export function NewTaskDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (open: boolean) => void; onCreated: (period: string) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {open && (
          <NewTaskForm
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
