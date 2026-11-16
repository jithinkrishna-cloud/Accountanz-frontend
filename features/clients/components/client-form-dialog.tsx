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
import { ACCOUNTING_SOFTWARE_LABELS, INDIAN_STATES } from "@/lib/constants";
import { applyApiError } from "@/lib/form-errors";
import { humanize } from "@/lib/format";
import { useSaveClient } from "../hooks/use-clients";
import { clientFormSchema, type ClientFormOutput, type ClientFormValues } from "../schemas/client.schema";
import { ACCOUNTING_SOFTWARE, BUSINESS_TYPES, CLIENT_STATUSES, type Client } from "../types/client.types";

const toValues = (c?: Client): ClientFormValues => ({
  legal_name: c?.legal_name ?? "",
  trade_name: c?.trade_name ?? "",
  business_type: c?.business_type ?? "",
  date_of_establishment: c?.date_of_establishment ?? "",
  gstin: c?.gstin ?? "",
  pan: c?.pan ?? "",
  state: c?.state ?? "",
  address: c?.address ?? "",
  primary_contact_name: c?.primary_contact_name ?? "",
  primary_contact_email: c?.primary_contact_email ?? "",
  primary_contact_phone: c?.primary_contact_phone ?? "",
  status: c?.status ?? "lead",
  accounting_software: c?.accounting_software ?? "none",
});

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Client;
  onSaved?: (client: Client) => void;
}

export function ClientFormDialog({ open, onOpenChange, client, onSaved }: Props) {
  const save = useSaveClient(client?.id);
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ClientFormValues, unknown, ClientFormOutput>({ resolver: zodResolver(clientFormSchema), defaultValues: toValues(client) });

  useEffect(() => {
    if (open) reset(toValues(client));
  }, [open, client, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      const saved = await save.mutateAsync(values);
      toast.success(client ? "Client updated" : "Client created");
      onOpenChange(false);
      onSaved?.(saved);
    } catch (err) {
      applyApiError(err, setError, Object.keys(values));
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{client ? "Edit client" : "New client"}</DialogTitle>
          <DialogDescription>Add the business details. You can attach branches afterwards.</DialogDescription>
        </DialogHeader>
        <form id="client-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
          <FormField id="legal_name" label="Legal name" error={errors.legal_name?.message} className="sm:col-span-2">
            <Input id="legal_name" autoFocus aria-invalid={!!errors.legal_name} {...register("legal_name")} />
          </FormField>
          <FormField id="trade_name" label="Trade name" error={errors.trade_name?.message}>
            <Input id="trade_name" {...register("trade_name")} />
          </FormField>
          <FormField id="business_type" label="Business type" error={errors.business_type?.message}>
            <Controller control={control} name="business_type" render={({ field }) => (
              <Select value={field.value || undefined} onValueChange={field.onChange}>
                <SelectTrigger id="business_type" className="w-full"><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>{BUSINESS_TYPES.map((t) => <SelectItem key={t} value={t}>{humanize(t)}</SelectItem>)}</SelectContent>
              </Select>
            )} />
          </FormField>
          <FormField id="date_of_establishment" label="Established on" error={errors.date_of_establishment?.message}>
            <Input id="date_of_establishment" type="date" {...register("date_of_establishment")} />
          </FormField>
          <FormField id="state" label="State" error={errors.state?.message}>
            <Controller control={control} name="state" render={({ field }) => (
              <Select value={field.value || undefined} onValueChange={field.onChange}>
                <SelectTrigger id="state" className="w-full"><SelectValue placeholder="Select a state" /></SelectTrigger>
                <SelectContent>{INDIAN_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            )} />
          </FormField>
          <FormField id="gstin" label="GSTIN" error={errors.gstin?.message}>
            <Input id="gstin" className="uppercase" maxLength={15} aria-invalid={!!errors.gstin} {...register("gstin")} />
          </FormField>
          <FormField id="pan" label="PAN" error={errors.pan?.message}>
            <Input id="pan" className="uppercase" maxLength={10} aria-invalid={!!errors.pan} {...register("pan")} />
          </FormField>
          <FormField id="primary_contact_name" label="Primary contact name" error={errors.primary_contact_name?.message}>
            <Input id="primary_contact_name" {...register("primary_contact_name")} />
          </FormField>
          <FormField id="primary_contact_phone" label="Primary contact phone" error={errors.primary_contact_phone?.message}>
            <Input id="primary_contact_phone" {...register("primary_contact_phone")} />
          </FormField>
          <FormField id="primary_contact_email" label="Primary contact email" error={errors.primary_contact_email?.message} className="sm:col-span-2">
            <Input id="primary_contact_email" type="email" {...register("primary_contact_email")} />
          </FormField>
          <FormField id="status" label="Status" error={errors.status?.message}>
            <Controller control={control} name="status" render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="status" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{CLIENT_STATUSES.map((s) => <SelectItem key={s} value={s}>{humanize(s)}</SelectItem>)}</SelectContent>
              </Select>
            )} />
          </FormField>
          <FormField id="accounting_software" label="Accounting software" error={errors.accounting_software?.message}>
            <Controller control={control} name="accounting_software" render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="accounting_software" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{ACCOUNTING_SOFTWARE.map((s) => <SelectItem key={s} value={s}>{ACCOUNTING_SOFTWARE_LABELS[s]}</SelectItem>)}</SelectContent>
              </Select>
            )} />
          </FormField>
          <FormField id="address" label="Address" error={errors.address?.message} className="sm:col-span-2">
            <Textarea id="address" rows={3} {...register("address")} />
          </FormField>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <SubmitButton form="client-form" pending={save.isPending}>{client ? "Save changes" : "Create client"}</SubmitButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
