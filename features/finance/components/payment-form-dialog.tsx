"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { FormField } from "@/components/shared/form-field";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { applyApiError } from "@/lib/form-errors";
import { formatINR } from "@/lib/format";
import { useOpenInvoices, useRecordPayment } from "../hooks/use-finance";
import { paymentFormSchema, type PaymentFormOutput, type PaymentFormValues } from "../schemas/finance.schema";
import { PAYMENT_METHOD_LABELS, PAYMENT_METHODS } from "../types/finance.types";

const today = () => new Date().toISOString().slice(0, 10);

export function PaymentFormDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const invoices = useOpenInvoices(open);
  const record = useRecordPayment();
  const { register, control, handleSubmit, reset, setValue, setError, formState: { errors } } = useForm<PaymentFormValues, unknown, PaymentFormOutput>({
    resolver: zodResolver(paymentFormSchema),
  });
  const invoiceId = useWatch({ control, name: "invoice_id" });
  const selected = invoices.data?.find((i) => String(i.id) === invoiceId);

  useEffect(() => {
    if (open) reset({ invoice_id: "", amount: "", paid_date: today(), method: "bank_transfer", reference: "" });
  }, [open, reset]);

  const onSubmit = handleSubmit(async (v) => {
    try {
      const r = await record.mutateAsync(v);
      toast.success(r.invoice_paid ? "Payment recorded — invoice is now paid" : "Payment recorded");
      onOpenChange(false);
    } catch (err) {
      applyApiError(err, setError, ["invoice_id", "amount", "paid_date", "method", "reference"]);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record a payment</DialogTitle>
          <DialogDescription>Paying the full total marks the invoice paid.</DialogDescription>
        </DialogHeader>
        <form id="payment-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
          <FormField id="invoice_id" label="Invoice" error={errors.invoice_id?.message} className="sm:col-span-2">
            <Controller control={control} name="invoice_id" render={({ field }) => (
              <Select
                value={field.value || undefined}
                onValueChange={(v) => {
                  field.onChange(v);
                  const inv = invoices.data?.find((i) => String(i.id) === v);
                  if (inv) setValue("amount", String(inv.balance)); // default to the outstanding balance
                }}
                disabled={invoices.isLoading}
              >
                <SelectTrigger id="invoice_id" className="w-full" aria-invalid={!!errors.invoice_id}>
                  <SelectValue placeholder={invoices.isLoading ? "Loading…" : "Select an invoice"} />
                </SelectTrigger>
                <SelectContent>
                  {invoices.data?.map((i) => (
                    <SelectItem key={i.id} value={String(i.id)}>{i.invoice_number} · {i.client_name} · {formatINR(i.balance, true)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )} />
          </FormField>
          {invoices.data?.length === 0 && <p className="text-muted-foreground text-sm sm:col-span-2">No invoices are waiting for payment.</p>}
          <FormField id="amount" label="Amount (₹)" error={errors.amount?.message} hint={selected ? `Outstanding ${formatINR(selected.balance, true)}` : undefined}>
            <Input id="amount" type="number" inputMode="decimal" min={0} step="0.01" aria-invalid={!!errors.amount} {...register("amount")} />
          </FormField>
          <FormField id="paid_date" label="Paid on" error={errors.paid_date?.message}>
            <Input id="paid_date" type="date" max={today()} aria-invalid={!!errors.paid_date} {...register("paid_date")} />
          </FormField>
          <FormField id="method" label="Method">
            <Controller control={control} name="method" render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="method" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</SelectItem>)}</SelectContent>
              </Select>
            )} />
          </FormField>
          <FormField id="reference" label="Reference" error={errors.reference?.message}>
            <Input id="reference" placeholder="UTR / cheque no." {...register("reference")} />
          </FormField>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <SubmitButton form="payment-form" pending={record.isPending}>Record payment</SubmitButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
