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
import { useClientOptions } from "@/features/clients/hooks/use-client-options";
import { applyApiError } from "@/lib/form-errors";
import { useCreateConnection } from "../hooks/use-integrations";
import { connectionFormSchema, type ConnectionFormValues } from "../schemas/integration.schema";
import { PROVIDER_LABELS, PROVIDERS } from "../types/integration.types";

export function ConnectionFormDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const clients = useClientOptions();
  const create = useCreateConnection();
  const { register, control, handleSubmit, reset, setError, formState: { errors } } = useForm<ConnectionFormValues>({ resolver: zodResolver(connectionFormSchema) });

  useEffect(() => {
    if (open) reset({ client_id: "", provider: "journl", external_org_name: "", external_org_id: "" });
  }, [open, reset]);

  const onSubmit = handleSubmit(async (v) => {
    try {
      await create.mutateAsync(v);
      toast.success("Connection added");
      onOpenChange(false);
    } catch (err) {
      applyApiError(err, setError, ["client_id", "provider", "external_org_name", "external_org_id"]);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a connection</DialogTitle>
          <DialogDescription>Register which software holds the books for this client.</DialogDescription>
        </DialogHeader>
        <form id="connection-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
          <FormField id="client_id" label="Client" error={errors.client_id?.message}>
            <Controller control={control} name="client_id" render={({ field }) => (
              <Select value={field.value || undefined} onValueChange={field.onChange}>
                <SelectTrigger id="client_id" className="w-full" aria-invalid={!!errors.client_id}><SelectValue placeholder="Select a client" /></SelectTrigger>
                <SelectContent>{clients.data?.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            )} />
          </FormField>
          <FormField id="provider" label="Provider">
            <Controller control={control} name="provider" render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="provider" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{PROVIDERS.map((p) => <SelectItem key={p} value={p}>{PROVIDER_LABELS[p]}</SelectItem>)}</SelectContent>
              </Select>
            )} />
          </FormField>
          <FormField id="external_org_name" label="External organisation name" error={errors.external_org_name?.message}>
            <Input id="external_org_name" {...register("external_org_name")} />
          </FormField>
          <FormField id="external_org_id" label="External organisation id" error={errors.external_org_id?.message}>
            <Input id="external_org_id" {...register("external_org_id")} />
          </FormField>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <SubmitButton form="connection-form" pending={create.isPending}>Add connection</SubmitButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
