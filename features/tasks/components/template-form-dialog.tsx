"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { FormField } from "@/components/shared/form-field";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useServices } from "@/features/services/hooks/use-catalogue";
import { applyApiError } from "@/lib/form-errors";
import { humanize } from "@/lib/format";
import { useCreateTemplate } from "../hooks/use-task-templates";
import { templateFormSchema, type TemplateFormOutput, type TemplateFormValues } from "../schemas/task.schema";
import { RECURRENCES, type TaskTemplate } from "../types/task.types";

export function TemplateFormDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: (t: TaskTemplate) => void }) {
  const services = useServices();
  const create = useCreateTemplate();
  const { register, control, handleSubmit, reset, setError, formState: { errors } } = useForm<TemplateFormValues, unknown, TemplateFormOutput>({
    resolver: zodResolver(templateFormSchema),
  });

  useEffect(() => {
    if (open) reset({ name: "", service_id: "", recurrence: "monthly", due_day_of_period: 10 });
  }, [open, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      const t = await create.mutateAsync(values);
      toast.success("Template created");
      onOpenChange(false);
      onCreated(t);
    } catch (err) {
      applyApiError(err, setError, ["name", "service_id", "recurrence", "due_day_of_period"]);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New template</DialogTitle>
          <DialogDescription>Groups the tasks generated for one service each period.</DialogDescription>
        </DialogHeader>
        <form id="template-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
          <FormField id="name" label="Name" error={errors.name?.message} className="sm:col-span-2">
            <Input id="name" autoFocus aria-invalid={!!errors.name} {...register("name")} />
          </FormField>
          <FormField id="service_id" label="Service" error={errors.service_id?.message} className="sm:col-span-2">
            <Controller control={control} name="service_id" render={({ field }) => (
              <Select value={field.value || undefined} onValueChange={field.onChange} disabled={services.isLoading}>
                <SelectTrigger id="service_id" className="w-full" aria-invalid={!!errors.service_id}><SelectValue placeholder="Select a service" /></SelectTrigger>
                <SelectContent>{services.data?.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            )} />
          </FormField>
          <FormField id="recurrence" label="Recurrence">
            <Controller control={control} name="recurrence" render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="recurrence" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{RECURRENCES.map((r) => <SelectItem key={r} value={r}>{humanize(r)}</SelectItem>)}</SelectContent>
              </Select>
            )} />
          </FormField>
          <FormField id="due_day_of_period" label="Due day of period" error={errors.due_day_of_period?.message} hint="Day of the month the task falls due.">
            <Input id="due_day_of_period" type="number" inputMode="numeric" min={1} max={31} aria-invalid={!!errors.due_day_of_period} {...register("due_day_of_period")} />
          </FormField>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <SubmitButton form="template-form" pending={create.isPending}>Save template</SubmitButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
