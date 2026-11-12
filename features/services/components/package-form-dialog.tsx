"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { FormField } from "@/components/shared/form-field";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { applyApiError } from "@/lib/form-errors";
import { humanize } from "@/lib/format";
import { useSavePackage, useServices } from "../hooks/use-catalogue";
import { packageFormSchema, type PackageFormOutput, type PackageFormValues } from "../schemas/service.schema";
import { BILLING_CYCLES, type ServicePackage } from "../types/service.types";

const toValues = (p?: ServicePackage): PackageFormValues => ({
  name: p?.name ?? "",
  monthly_fee: p?.monthly_fee ?? "",
  billing_cycle: p?.billing_cycle ?? "monthly",
  description: p?.description ?? "",
  scope_notes: p?.scope_notes ?? "",
  is_active: p?.is_active ?? true,
  service_ids: p?.services.map((s) => s.id) ?? [],
});

export function PackageFormDialog({ open, onOpenChange, pkg }: { open: boolean; onOpenChange: (o: boolean) => void; pkg?: ServicePackage }) {
  const services = useServices();
  const save = useSavePackage(pkg?.id);
  const { register, control, handleSubmit, reset, setError, formState: { errors } } = useForm<PackageFormValues, unknown, PackageFormOutput>({
    resolver: zodResolver(packageFormSchema),
  });

  useEffect(() => {
    if (open) reset(toValues(pkg));
  }, [open, pkg, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      await save.mutateAsync(values);
      toast.success(pkg ? "Package updated" : "Package added");
      onOpenChange(false);
    } catch (err) {
      applyApiError(err, setError, Object.keys(values));
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{pkg ? "Edit package" : "New package"}</DialogTitle>
          <DialogDescription>Bundle services with a monthly fee and scope.</DialogDescription>
        </DialogHeader>
        <form id="package-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
          <FormField id="name" label="Package name" error={errors.name?.message} className="sm:col-span-2">
            <Input id="name" autoFocus aria-invalid={!!errors.name} {...register("name")} />
          </FormField>
          <FormField id="monthly_fee" label="Monthly fee (₹)" error={errors.monthly_fee?.message}>
            <Input id="monthly_fee" type="number" inputMode="decimal" min={0} step="0.01" aria-invalid={!!errors.monthly_fee} {...register("monthly_fee")} />
          </FormField>
          <FormField id="billing_cycle" label="Billing cycle">
            <Controller control={control} name="billing_cycle" render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="billing_cycle" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{BILLING_CYCLES.map((c) => <SelectItem key={c} value={c}>{humanize(c)}</SelectItem>)}</SelectContent>
              </Select>
            )} />
          </FormField>
          <FormField id="description" label="Description" error={errors.description?.message} className="sm:col-span-2">
            <Textarea id="description" rows={2} {...register("description")} />
          </FormField>
          <fieldset className="grid gap-2 sm:col-span-2">
            <legend className="mb-1 text-sm font-medium">Services in this package</legend>
            {services.isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <Controller control={control} name="service_ids" render={({ field }) => (
                <div className="grid gap-2 sm:grid-cols-2">
                  {services.data?.map((s) => {
                    const checked = field.value?.includes(s.id) ?? false;
                    return (
                      <Label key={s.id} className="hover:bg-muted flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 font-normal">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(c) => field.onChange(c ? [...(field.value ?? []), s.id] : (field.value ?? []).filter((id) => id !== s.id))}
                        />
                        {s.name}
                      </Label>
                    );
                  })}
                </div>
              )} />
            )}
            {errors.service_ids && <p role="alert" className="text-destructive text-xs">{errors.service_ids.message}</p>}
          </fieldset>
          <FormField id="scope_notes" label="Scope notes" error={errors.scope_notes?.message} className="sm:col-span-2">
            <Textarea id="scope_notes" rows={2} placeholder="Transaction limits, bank accounts, review calls…" {...register("scope_notes")} />
          </FormField>
          <Controller control={control} name="is_active" render={({ field }) => (
            <Label className="flex items-center gap-2 font-normal sm:col-span-2">
              <Checkbox checked={field.value} onCheckedChange={(c) => field.onChange(c === true)} />
              Package is available for new engagements
            </Label>
          )} />
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <SubmitButton form="package-form" pending={save.isPending}>Save package</SubmitButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
