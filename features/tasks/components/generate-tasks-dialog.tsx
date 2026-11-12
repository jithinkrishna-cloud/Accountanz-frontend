"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { FormField } from "@/components/shared/form-field";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { applyApiError } from "@/lib/form-errors";
import { formatPeriod } from "@/lib/format";
import { useGenerateTasks } from "../hooks/use-tasks";
import { generateFormSchema, type GenerateFormValues } from "../schemas/task.schema";

const currentPeriod = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export function GenerateTasksDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const generate = useGenerateTasks();
  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<GenerateFormValues>({ resolver: zodResolver(generateFormSchema) });

  useEffect(() => {
    if (open) reset({ period: currentPeriod() });
  }, [open, reset]);

  const onSubmit = handleSubmit(async ({ period }) => {
    try {
      const r = await generate.mutateAsync(period);
      const label = formatPeriod(r.period);
      if (r.engagements === 0) toast.info(`No active engagement covers ${label}, so nothing was generated.`);
      else
        toast.success(
          `${label}: ${r.created} task(s) created, ${r.skipped} already existed.` +
            (r.closed_clients_skipped ? ` ${r.closed_clients_skipped} client(s) skipped because the period is closed.` : ""),
        );
      onOpenChange(false);
    } catch (err) {
      applyApiError(err, setError, ["period"]);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bulk-generate tasks</DialogTitle>
          <DialogDescription>Creates this period&apos;s tasks from templates for every active engagement, skipping tasks that already exist.</DialogDescription>
        </DialogHeader>
        <form id="generate-form" onSubmit={onSubmit} noValidate>
          <FormField id="period" label="Period" error={errors.period?.message}>
            <Input id="period" type="month" aria-invalid={!!errors.period} {...register("period")} />
          </FormField>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <SubmitButton form="generate-form" pending={generate.isPending}>Generate</SubmitButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
