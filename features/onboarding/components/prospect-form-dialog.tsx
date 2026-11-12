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
import { Textarea } from "@/components/ui/textarea";
import { INDIAN_STATES } from "@/lib/constants";
import { applyApiError } from "@/lib/form-errors";
import { useCreateProspect } from "../hooks/use-onboarding";
import { prospectFormSchema, type ProspectFormOutput, type ProspectFormValues } from "../schemas/onboarding.schema";
import type { OnboardingCase } from "../types/onboarding.types";

const EMPTY: ProspectFormValues = { legal_name: "", trade_name: "", gstin: "", pan: "", state: "", notes: "" };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (row: OnboardingCase) => void;
}

export function ProspectFormDialog({ open, onOpenChange, onCreated }: Props) {
  const create = useCreateProspect();
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ProspectFormValues, unknown, ProspectFormOutput>({ resolver: zodResolver(prospectFormSchema), defaultValues: EMPTY });

  useEffect(() => {
    if (open) reset(EMPTY);
  }, [open, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      const row = await create.mutateAsync(values);
      toast.success("Prospect added");
      onOpenChange(false);
      onCreated?.(row);
    } catch (err) {
      applyApiError(err, setError, Object.keys(values));
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>New prospect</DialogTitle>
          <DialogDescription>Adds the business as a lead and opens its onboarding case.</DialogDescription>
        </DialogHeader>
        <form id="prospect-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
          <FormField id="legal_name" label="Legal name" error={errors.legal_name?.message} className="sm:col-span-2">
            <Input id="legal_name" autoFocus aria-invalid={!!errors.legal_name} {...register("legal_name")} />
          </FormField>
          <FormField id="trade_name" label="Trade name" error={errors.trade_name?.message} className="sm:col-span-2">
            <Input id="trade_name" {...register("trade_name")} />
          </FormField>
          <FormField id="gstin" label="GSTIN" error={errors.gstin?.message}>
            <Input id="gstin" className="uppercase" maxLength={15} aria-invalid={!!errors.gstin} {...register("gstin")} />
          </FormField>
          <FormField id="pan" label="PAN" error={errors.pan?.message}>
            <Input id="pan" className="uppercase" maxLength={10} aria-invalid={!!errors.pan} {...register("pan")} />
          </FormField>
          <FormField id="state" label="State" error={errors.state?.message} className="sm:col-span-2">
            <Controller
              control={control}
              name="state"
              render={({ field }) => (
                <Select value={field.value || undefined} onValueChange={field.onChange}>
                  <SelectTrigger id="state" className="w-full"><SelectValue placeholder="Select a state" /></SelectTrigger>
                  <SelectContent>
                    {INDIAN_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          <FormField id="notes" label="Notes" error={errors.notes?.message} hint="How they found us, what they need." className="sm:col-span-2">
            <Textarea id="notes" rows={3} {...register("notes")} />
          </FormField>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <SubmitButton form="prospect-form" pending={create.isPending}>Add prospect</SubmitButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
