"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { FormField } from "@/components/shared/form-field";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { engagementService } from "@/features/engagements/services/engagement-service";
import { applyApiError } from "@/lib/form-errors";
import { formatINR } from "@/lib/format";
import { useCreateInvoice } from "../hooks/use-finance";
import { invoiceFormSchema, type InvoiceFormValues } from "../schemas/finance.schema";

const currentPeriod = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export function InvoiceFormDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const engagements = useQuery({
    queryKey: ["admin", "engagements", "active-options"],
    queryFn: () => engagementService.list({ status: "active", page: 1 }).then((r) => r.items),
    enabled: open,
  });
  const create = useCreateInvoice();
  const { register, control, handleSubmit, reset, setError, formState: { errors } } = useForm<InvoiceFormValues>({ resolver: zodResolver(invoiceFormSchema) });

  useEffect(() => {
    if (open) reset({ engagement_id: "", period: currentPeriod() });
  }, [open, reset]);

  const onSubmit = handleSubmit(async (v) => {
    try {
      const inv = await create.mutateAsync({ engagementId: Number(v.engagement_id), period: v.period });
      toast.success(`Invoice ${inv.invoice_number} issued for ${formatINR(inv.total, true)}`);
      onOpenChange(false);
    } catch (err) {
      applyApiError(err, setError, ["engagement_id", "period"]);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New service invoice</DialogTitle>
          <DialogDescription>Amount comes from the engagement&apos;s package fee; GST is added from settings.</DialogDescription>
        </DialogHeader>
        <form id="invoice-form" onSubmit={onSubmit} className="grid gap-4" noValidate>
          <FormField id="engagement_id" label="Engagement" error={errors.engagement_id?.message}>
            <Controller control={control} name="engagement_id" render={({ field }) => (
              <Select value={field.value || undefined} onValueChange={field.onChange} disabled={engagements.isLoading}>
                <SelectTrigger id="engagement_id" className="w-full" aria-invalid={!!errors.engagement_id}>
                  <SelectValue placeholder={engagements.isLoading ? "Loading…" : "Select an engagement"} />
                </SelectTrigger>
                <SelectContent>
                  {engagements.data?.map((e) => (
                    <SelectItem key={e.id} value={String(e.id)}>{e.client_name} · {e.package_name} · {formatINR(e.monthly_fee)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )} />
          </FormField>
          {engagements.data?.length === 0 && <p className="text-muted-foreground text-sm">There are no active engagements to invoice.</p>}
          <FormField id="period" label="Period" error={errors.period?.message}>
            <Input id="period" type="month" aria-invalid={!!errors.period} {...register("period")} />
          </FormField>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <SubmitButton form="invoice-form" pending={create.isPending}>Issue invoice</SubmitButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
