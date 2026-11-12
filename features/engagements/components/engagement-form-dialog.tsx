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
import { usePackages } from "@/features/services/hooks/use-catalogue";
import { applyApiError } from "@/lib/form-errors";
import { formatINR } from "@/lib/format";
import { useEngagementClientOptions, useSaveEngagement } from "../hooks/use-engagements";
import { engagementFormSchema, type EngagementFormOutput, type EngagementFormValues } from "../schemas/engagement.schema";
import type { Engagement } from "../types/engagement.types";

const toValues = (e?: Engagement): EngagementFormValues => ({
  client_id: e ? String(e.client_id) : "",
  package_id: e ? String(e.package_id) : "",
  start_date: e?.start_date ?? "",
  renewal_date: e?.renewal_date ?? "",
});

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  engagement?: Engagement;
  onSaved?: (row: Engagement) => void;
}

export function EngagementFormDialog({ open, onOpenChange, engagement, onSaved }: Props) {
  const editing = !!engagement;
  const save = useSaveEngagement(engagement?.id);
  const packages = usePackages();
  const clients = useEngagementClientOptions(open && !editing);
  const packageLocked = editing && engagement.status !== "draft";

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<EngagementFormValues, unknown, EngagementFormOutput>({ resolver: zodResolver(engagementFormSchema), defaultValues: toValues(engagement) });

  useEffect(() => {
    if (open) reset(toValues(engagement));
  }, [open, engagement, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      const row = await save.mutateAsync(values);
      toast.success(editing ? "Engagement updated" : "Draft engagement created");
      onOpenChange(false);
      onSaved?.(row);
    } catch (err) {
      applyApiError(err, setError, Object.keys(values));
    }
  });

  const packageOptions = packages.data?.filter((p) => p.is_active || p.id === engagement?.package_id) ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit engagement" : "New engagement"}</DialogTitle>
          <DialogDescription>
            {editing ? engagement.client_name : "Starts as a draft. Send it, record acceptance, then activate it with the signed agreement."}
          </DialogDescription>
        </DialogHeader>
        <form id="engagement-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
          {!editing && (
            <FormField id="client_id" label="Client" error={errors.client_id?.message} className="sm:col-span-2">
              <Controller
                control={control}
                name="client_id"
                render={({ field }) => (
                  <Select value={field.value || undefined} onValueChange={field.onChange}>
                    <SelectTrigger id="client_id" className="w-full" aria-invalid={!!errors.client_id}>
                      <SelectValue placeholder={clients.isLoading ? "Loading clients…" : "Select a client"} />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.data?.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.trade_name ?? c.legal_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
          )}
          <FormField
            id="package_id"
            label="Package"
            error={errors.package_id?.message}
            hint={packageLocked ? "The package can only change while the engagement is a draft." : undefined}
            className="sm:col-span-2"
          >
            <Controller
              control={control}
              name="package_id"
              render={({ field }) => (
                <Select value={field.value || undefined} onValueChange={field.onChange} disabled={packageLocked}>
                  <SelectTrigger id="package_id" className="w-full" aria-invalid={!!errors.package_id}>
                    <SelectValue placeholder={packages.isLoading ? "Loading packages…" : "Select a package"} />
                  </SelectTrigger>
                  <SelectContent>
                    {packageOptions.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.name} · {formatINR(p.monthly_fee)}/mo</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          <FormField id="start_date" label="Start date" error={errors.start_date?.message} hint="Defaults to the activation date.">
            <Input id="start_date" type="date" {...register("start_date")} />
          </FormField>
          <FormField id="renewal_date" label="Renewal date" error={errors.renewal_date?.message}>
            <Input id="renewal_date" type="date" aria-invalid={!!errors.renewal_date} {...register("renewal_date")} />
          </FormField>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <SubmitButton form="engagement-form" pending={save.isPending}>{editing ? "Save changes" : "Create draft"}</SubmitButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
