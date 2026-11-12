"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { FormField } from "@/components/shared/form-field";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { applyApiError } from "@/lib/form-errors";
import { humanize } from "@/lib/format";
import { useCreateTask, useTaskOptions, useUpdateTask } from "../hooks/use-tasks";
import { taskFormSchema, type TaskFormOutput, type TaskFormValues } from "../schemas/task.schema";
import type { TaskPortal } from "../services/task-service";
import type { TaskDetail } from "../types/task.types";

const blank = (): TaskFormValues => ({
  client_id: "",
  engagement_id: "",
  title: "",
  description: "",
  assignee_id: "",
  reviewer_id: "",
  period: "",
  due_date: "",
  client_visible: true,
  checklist: "",
});

const fromTask = (t: TaskDetail): TaskFormValues => ({
  client_id: String(t.client_id),
  engagement_id: t.engagement_id ? String(t.engagement_id) : "",
  title: t.title,
  description: t.description ?? "",
  assignee_id: t.assignee_id ? String(t.assignee_id) : "",
  reviewer_id: t.reviewer_id ? String(t.reviewer_id) : "",
  period: t.period,
  due_date: t.due_date ?? "",
  client_visible: t.client_visible,
  checklist: t.checklist.map((c) => c.text).join("\n"),
});

interface Props {
  portal: TaskPortal;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Editing an existing task; omit to create a one-off task. */
  task?: TaskDetail;
  onSaved?: (task: TaskDetail) => void;
}

const FIELDS = ["client_id", "engagement_id", "title", "description", "assignee_id", "reviewer_id", "period", "due_date", "client_visible", "checklist"];

export function TaskFormDialog({ portal, open, onOpenChange, task, onSaved }: Props) {
  const editing = !!task;
  const templateLocked = task?.creation_source === "template";
  const create = useCreateTask(portal);
  const update = useUpdateTask(portal, task?.id ?? 0);
  const { register, control, handleSubmit, reset, setValue, setError, getFieldState, formState: { errors } } = useForm<TaskFormValues, unknown, TaskFormOutput>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: blank(),
  });

  const clientId = useWatch({ control, name: "client_id" });
  const assigneeId = useWatch({ control, name: "assignee_id" });
  const dueDate = useWatch({ control, name: "due_date" });
  const options = useTaskOptions(portal, clientId ? Number(clientId) : undefined, open);

  useEffect(() => {
    if (open) reset(task ? fromTask(task) : blank());
  }, [open, task, reset]);

  // The period follows the due date's month until the user picks one themselves.
  useEffect(() => {
    if (dueDate && !getFieldState("period").isDirty) setValue("period", dueDate.slice(0, 7));
  }, [dueDate, getFieldState, setValue]);

  // People and engagements depend on the client; pick the only engagement automatically.
  useEffect(() => {
    if (editing || !options.data || !clientId) return;
    if (options.data.engagements.length === 1) setValue("engagement_id", String(options.data.engagements[0]!.id));
  }, [editing, options.data, clientId, setValue]);

  const assignees = [...new Map((options.data?.assignees ?? []).map((a) => [a.user_id, a])).values()];
  const reviewers = (options.data?.reviewers ?? []).filter((r) => String(r.user_id) !== assigneeId);
  const pending = create.isPending || update.isPending;

  const onSubmit = handleSubmit(async (values) => {
    try {
      const saved = editing ? await update.mutateAsync(values) : await create.mutateAsync(values);
      toast.success(editing ? "Task updated" : `Task created for ${saved.assignee_name ?? "the assignee"}`);
      onOpenChange(false);
      onSaved?.(saved);
    } catch (err) {
      applyApiError(err, setError, FIELDS);
    }
  });

  const select = (name: "client_id" | "engagement_id" | "assignee_id" | "reviewer_id", items: { value: string; label: string }[], placeholder: string, disabled = false) => (
    <Controller control={control} name={name} render={({ field }) => (
      <Select
        value={field.value || undefined}
        onValueChange={(v) => {
          field.onChange(v);
          if (name === "client_id") {
            setValue("engagement_id", "");
            setValue("assignee_id", "");
            setValue("reviewer_id", "");
          }
        }}
        disabled={disabled}
      >
        <SelectTrigger id={name} className="w-full" aria-invalid={!!errors[name]}><SelectValue placeholder={placeholder} /></SelectTrigger>
        <SelectContent>{items.map((i) => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}</SelectContent>
      </Select>
    )} />
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit task" : "New one-off task"}</DialogTitle>
          <DialogDescription>
            {templateLocked
              ? "Generated from a template: title, description and checklist come from the template."
              : "For work outside the monthly templates. The assignee sees it in My Tasks straight away."}
          </DialogDescription>
        </DialogHeader>
        <form id="task-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
          <FormField id="client_id" label="Client" error={errors.client_id?.message}>
            {editing ? (
              <Input id="client_id" value={task.client_name} disabled />
            ) : (
              select("client_id", (options.data?.clients ?? []).map((c) => ({ value: String(c.id), label: c.name })), options.isLoading ? "Loading…" : "Select a client")
            )}
          </FormField>
          <FormField id="engagement_id" label="Engagement" error={errors.engagement_id?.message}>
            {select(
              "engagement_id",
              (options.data?.engagements ?? []).map((e) => ({ value: String(e.id), label: e.package_name })),
              clientId ? "Select an engagement" : "Pick a client first",
              editing || !clientId,
            )}
          </FormField>
          {clientId && options.data && options.data.engagements.length === 0 && (
            <p className="text-destructive text-xs sm:col-span-2">This client has no active engagement, so tasks can&apos;t be added yet.</p>
          )}
          <FormField id="title" label="Task title" error={errors.title?.message} className="sm:col-span-2">
            <Input id="title" disabled={templateLocked} aria-invalid={!!errors.title} {...register("title")} />
          </FormField>
          <FormField id="description" label="Description" error={errors.description?.message} className="sm:col-span-2">
            <Textarea id="description" rows={3} disabled={templateLocked} {...register("description")} />
          </FormField>
          <FormField id="assignee_id" label="Assignee" error={errors.assignee_id?.message} hint={clientId ? "People with an active assignment to this client." : undefined}>
            {select("assignee_id", assignees.map((a) => ({ value: String(a.user_id), label: `${a.full_name} · ${humanize(a.team_role)}` })), clientId ? "Select a person" : "Pick a client first", !clientId)}
          </FormField>
          <FormField id="reviewer_id" label="Reviewer" error={errors.reviewer_id?.message}>
            {select("reviewer_id", reviewers.map((r) => ({ value: String(r.user_id), label: `${r.full_name} · ${humanize(r.role)}` })), clientId ? "Select a reviewer" : "Pick a client first", !clientId)}
          </FormField>
          <FormField id="due_date" label="Due date" error={errors.due_date?.message}>
            <Input id="due_date" type="date" aria-invalid={!!errors.due_date} {...register("due_date")} />
          </FormField>
          <FormField id="period" label="Period" error={errors.period?.message} hint="Counts towards this month's closing.">
            <Input id="period" type="month" aria-invalid={!!errors.period} {...register("period")} />
          </FormField>
          <FormField id="checklist" label="Checklist" error={errors.checklist?.message} hint="One point per line." className="sm:col-span-2">
            <Textarea id="checklist" rows={4} disabled={templateLocked} aria-invalid={!!errors.checklist} {...register("checklist")} />
          </FormField>
          <Controller control={control} name="client_visible" render={({ field }) => (
            <Label className="flex items-center gap-2 font-normal sm:col-span-2">
              <Checkbox checked={field.value} onCheckedChange={(c) => field.onChange(c === true)} />
              Visible to the client in Tasks &amp; Progress
            </Label>
          )} />
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <SubmitButton form="task-form" pending={pending}>{editing ? "Save changes" : "Create task"}</SubmitButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
