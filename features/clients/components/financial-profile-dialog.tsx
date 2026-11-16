"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { FormField } from "@/components/shared/form-field";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MONTHS } from "@/lib/constants";
import { applyApiError } from "@/lib/form-errors";
import { useClientProfileMutation } from "../hooks/use-clients";
import { clientService, type FinancialProfileBody } from "../services/client-service";
import type { ClientDetail } from "../types/client.types";



const wholeNumber = z.string().trim().refine((v) => v === "" || /^\d+$/.test(v), "Use a whole number");
// Mirrors backend financialProfileSchema.
const schema = z.object({
  financial_year_start_month: z.string(),
  annual_turnover: z.string().trim().refine((v) => v === "" || /^\d+(\.\d{1,2})?$/.test(v), "Enter an amount in rupees"),
  monthly_transaction_volume: wholeNumber,
  employee_count: wholeNumber,
  monthly_invoice_count: wholeNumber,
  current_accounting_software: z.string().trim().max(100),
  notes: z.string().trim().max(1000),
});
type Values = z.infer<typeof schema>;

const str = (n: number | null | undefined) => (n == null ? "" : String(n));
const num = (s: string) => (s === "" ? null : Number(s));

const toValues = (c: ClientDetail): Values => {
  const f = c.financial_profile;
  return {
    financial_year_start_month: str(f?.financial_year_start_month),
    annual_turnover: str(f?.annual_turnover),
    monthly_transaction_volume: str(f?.monthly_transaction_volume),
    employee_count: str(f?.employee_count),
    monthly_invoice_count: str(f?.monthly_invoice_count),
    current_accounting_software: f?.current_accounting_software ?? "",
    notes: f?.notes ?? "",
  };
};

const toBody = (v: Values): FinancialProfileBody => ({
  financial_year_start_month: num(v.financial_year_start_month),
  annual_turnover: num(v.annual_turnover),
  monthly_transaction_volume: num(v.monthly_transaction_volume),
  employee_count: num(v.employee_count),
  monthly_invoice_count: num(v.monthly_invoice_count),
  current_accounting_software: v.current_accounting_software || null,
  notes: v.notes || null,
});

function FinancialForm({ client, onDone }: { client: ClientDetail; onDone: () => void }) {
  const save = useClientProfileMutation(client.id, (body: FinancialProfileBody) => clientService.saveFinancialProfile(client.id, body));
  const { register, control, handleSubmit, setError, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: toValues(client),
  });

  const onSubmit = handleSubmit(async (v) => {
    try {
      await save.mutateAsync(toBody(v));
      toast.success("Financial profile saved");
      onDone();
    } catch (err) {
      applyApiError(err, setError, Object.keys(schema.shape));
    }
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle>Financial profile</DialogTitle>
        <DialogDescription>Rough figures are fine; they help size the engagement.</DialogDescription>
      </DialogHeader>
      <form id="financial-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
        <FormField id="fp-fy" label="Financial year starts in" hint="Usually April in India." error={errors.financial_year_start_month?.message}>
          <Controller control={control} name="financial_year_start_month" render={({ field }) => (
            <Select value={field.value || undefined} onValueChange={field.onChange}>
              <SelectTrigger id="fp-fy" className="w-full"><SelectValue placeholder="Select month" /></SelectTrigger>
              <SelectContent>{MONTHS.map((m, i) => <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
            </Select>
          )} />
        </FormField>
        <FormField id="fp-turnover" label="Annual turnover (₹)" error={errors.annual_turnover?.message}>
          <Input id="fp-turnover" inputMode="decimal" aria-invalid={!!errors.annual_turnover} {...register("annual_turnover")} />
        </FormField>
        <FormField id="fp-txns" label="Transactions per month" error={errors.monthly_transaction_volume?.message}>
          <Input id="fp-txns" inputMode="numeric" aria-invalid={!!errors.monthly_transaction_volume} {...register("monthly_transaction_volume")} />
        </FormField>
        <FormField id="fp-invoices" label="Invoices per month" error={errors.monthly_invoice_count?.message}>
          <Input id="fp-invoices" inputMode="numeric" aria-invalid={!!errors.monthly_invoice_count} {...register("monthly_invoice_count")} />
        </FormField>
        <FormField id="fp-employees" label="Employees" error={errors.employee_count?.message}>
          <Input id="fp-employees" inputMode="numeric" aria-invalid={!!errors.employee_count} {...register("employee_count")} />
        </FormField>
        <FormField id="fp-software" label="Current accounting software" hint="e.g. Tally, Zoho Books, spreadsheets" error={errors.current_accounting_software?.message}>
          <Input id="fp-software" {...register("current_accounting_software")} />
        </FormField>
        <FormField id="fp-notes" label="Internal notes" hint="Only Accountanz staff see these." error={errors.notes?.message} className="sm:col-span-2">
          <Textarea id="fp-notes" rows={3} {...register("notes")} />
        </FormField>
      </form>
      <DialogFooter>
        <Button variant="outline" onClick={onDone}>Cancel</Button>
        <SubmitButton form="financial-form" pending={save.isPending}>Save</SubmitButton>
      </DialogFooter>
    </>
  );
}

export function FinancialProfileDialog({ client, open, onOpenChange }: { client: ClientDetail; open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">{open && <FinancialForm client={client} onDone={() => onOpenChange(false)} />}</DialogContent>
    </Dialog>
  );
}
