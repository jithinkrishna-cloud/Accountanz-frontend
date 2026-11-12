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
import { Textarea } from "@/components/ui/textarea";
import { applyApiError } from "@/lib/form-errors";
import { useSaveService } from "../hooks/use-catalogue";
import { serviceFormSchema, type ServiceFormOutput, type ServiceFormValues } from "../schemas/service.schema";
import type { Service } from "../types/service.types";

export function ServiceFormDialog({ open, onOpenChange, service }: { open: boolean; onOpenChange: (o: boolean) => void; service?: Service }) {
  const save = useSaveService(service?.id);
  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<ServiceFormValues, unknown, ServiceFormOutput>({
    resolver: zodResolver(serviceFormSchema),
  });

  useEffect(() => {
    if (open) reset({ code: service?.code ?? "", name: service?.name ?? "", description: service?.description ?? "" });
  }, [open, service, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      await save.mutateAsync(values);
      toast.success(service ? "Service updated" : "Service added");
      onOpenChange(false);
    } catch (err) {
      applyApiError(err, setError, ["code", "name", "description"]);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{service ? "Edit service" : "New service"}</DialogTitle>
          <DialogDescription>A billable building block that packages are made of.</DialogDescription>
        </DialogHeader>
        <form id="service-form" onSubmit={onSubmit} className="grid gap-4" noValidate>
          <FormField id="code" label="Code" error={errors.code?.message}>
            <Input id="code" className="uppercase" placeholder="BK-M" autoFocus aria-invalid={!!errors.code} {...register("code")} />
          </FormField>
          <FormField id="name" label="Name" error={errors.name?.message}>
            <Input id="name" aria-invalid={!!errors.name} {...register("name")} />
          </FormField>
          <FormField id="description" label="Description" error={errors.description?.message}>
            <Textarea id="description" rows={3} {...register("description")} />
          </FormField>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <SubmitButton form="service-form" pending={save.isPending}>Save service</SubmitButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
