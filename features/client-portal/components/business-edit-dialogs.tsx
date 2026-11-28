"use client";

import { Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { Controller, useForm, type FieldValues, type Path, type UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import { FormField } from "@/components/shared/form-field";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { REGISTRATION_STATUSES, STAKEHOLDER_TYPES } from "@/features/clients/types/client.types";
import { MONTHS } from "@/lib/constants";
import { humanize } from "@/lib/format";
import { applyApiError } from "@/lib/form-errors";
import { useSaveBusiness } from "../hooks/use-client-portal";
import { clientPortalService as s, type BusinessServicesBody, type BusinessTaxBody } from "../services/client-portal-service";
import type { PortalBusiness } from "../types/client-portal.types";

/*
 * Owner-only editors for the My Business sections. Every change applies straight away and is written to the audit log,
 * so the accounting team sees who changed what. The server checks formats (PAN, GSTIN), duplicate GSTINs and that
 * ownership adds up to at most 100%; its field errors show under the matching input.
 */

const NONE = "none"; // Radix Select can't hold an empty value
const blank = (v: string) => (v.trim() === "" ? null : v.trim());
const num = (v: string) => (v.trim() === "" ? null : Number(v));
const str = (v: number | string | null | undefined) => (v == null ? "" : String(v));

export function EditButton({ onClick, label = "Edit" }: { onClick: () => void; label?: string }) {
  return (
    <Button type="button" variant="outline" size="sm" onClick={onClick}>
      {label === "Edit" ? <Pencil className="size-4" /> : <Plus className="size-4" />} {label}
    </Button>
  );
}

function EditDialog({ open, onOpenChange, title, description, formId, pending, wide, footerStart, children }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: string; description: string; formId: string; pending: boolean; wide?: boolean; footerStart?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={wide ? "max-h-[90vh] overflow-y-auto sm:max-w-2xl" : "max-h-[90vh] overflow-y-auto sm:max-w-lg"}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
        <DialogFooter className="gap-2 sm:justify-between">
          <div>{footerStart}</div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <SubmitButton form={formId} pending={pending}>Save</SubmitButton>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TextField<T extends FieldValues>({ form, name, label, mono, type, placeholder, className }: {
  form: UseFormReturn<T>; name: Path<T>; label: string; mono?: boolean; type?: string; placeholder?: string; className?: string;
}) {
  const error = form.formState.errors[name]?.message as string | undefined;
  return (
    <FormField id={name} label={label} error={error} className={className}>
      <Input id={name} type={type} inputMode={type === "number" ? "decimal" : undefined} placeholder={placeholder} className={mono ? "font-mono uppercase placeholder:normal-case" : undefined} aria-invalid={!!error} {...form.register(name)} />
    </FormField>
  );
}

function SelectField<T extends FieldValues>({ form, name, label, options, placeholder = "Not set" }: {
  form: UseFormReturn<T>; name: Path<T>; label: string; options: { value: string; label: string }[]; placeholder?: string;
}) {
  const error = form.formState.errors[name]?.message as string | undefined;
  return (
    <FormField id={name} label={label} error={error}>
      <Controller control={form.control} name={name} render={({ field }) => (
        <Select value={field.value || NONE} onValueChange={(v) => field.onChange(v === NONE ? "" : v)}>
          <SelectTrigger id={name} className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>{placeholder}</SelectItem>
            {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      )} />
    </FormField>
  );
}

/* ---------- Tax & registrations ---------- */

const REGISTRATIONS = [
  { number: "pan_number", status: "pan_status", label: "PAN", placeholder: "ABCDE1234F" },
  { number: "gstin", status: "gstin_status", label: "GSTIN", placeholder: "15 characters" },
  { number: "tan_number", status: "tan_status", label: "TAN", placeholder: "10 characters" },
  { number: "cin", status: "cin_status", label: "CIN", placeholder: "21 characters" },
  { number: "llpin", status: "llpin_status", label: "LLPIN", placeholder: "AAA-1234" },
  { number: "msme_udyam_number", status: "msme_status", label: "MSME / Udyam", placeholder: "UDYAM-XX-00-0000000" },
  { number: "professional_tax_registration", status: "professional_tax_status", label: "Professional tax", placeholder: "Registration number" },
] as const;
type TaxValues = Record<keyof BusinessTaxBody, string>;
const STATUS_OPTIONS = REGISTRATION_STATUSES.map((v) => ({ value: v, label: humanize(v) }));

export function TaxDetailsDialog({ b, open, onOpenChange }: { b: PortalBusiness; open: boolean; onOpenChange: (o: boolean) => void }) {
  const save = useSaveBusiness(s.saveTaxDetails);
  const t = b.tax_details;
  const form = useForm<TaxValues>({
    values: Object.fromEntries(REGISTRATIONS.flatMap((r) => [
      [r.number, str(t?.[r.number] ?? (r.number === "pan_number" ? b.pan : r.number === "gstin" ? b.gstin : null))],
      [r.status, str(t?.[r.status])],
    ])) as TaxValues,
  });
  const submit = form.handleSubmit(async (v) => {
    const body = Object.fromEntries(REGISTRATIONS.flatMap((r) => [
      [r.number, blank(v[r.number])?.toUpperCase() ?? null],
      [r.status, blank(v[r.status])],
    ])) as unknown as BusinessTaxBody;
    try {
      await save.mutateAsync(body);
      toast.success("Registrations saved");
      onOpenChange(false);
    } catch (err) {
      applyApiError(err, form.setError, Object.keys(v));
    }
  });
  return (
    <EditDialog open={open} onOpenChange={onOpenChange} wide formId="tax-form" pending={save.isPending} title="Tax & registrations" description="Leave a number blank if you don't have it yet. Changing PAN or GSTIN here also updates your company details.">
      <form id="tax-form" onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        {REGISTRATIONS.map((r) => (
          <div key={r.number} className="contents">
            <TextField form={form} name={r.number} label={r.label} mono placeholder={r.placeholder} />
            <SelectField form={form} name={r.status} label={`${r.label} status`} options={STATUS_OPTIONS} />
          </div>
        ))}
      </form>
    </EditDialog>
  );
}

/* ---------- Owners & directors ---------- */

type Stakeholder = PortalBusiness["stakeholders"][number];
interface StakeholderValues { stakeholder_type: string; full_name: string; designation: string; ownership_percentage: string; is_primary: boolean }

/** Add (person = null) or edit one owner/director. PAN, DIN and contact details stay with the accounting team. */
export function StakeholderDialog({ person, open, onOpenChange }: { person: Stakeholder | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const add = useSaveBusiness(s.addStakeholder);
  const update = useSaveBusiness(s.updateStakeholder);
  const remove = useSaveBusiness(s.removeStakeholder);
  const [confirming, setConfirming] = useState(false);
  const form = useForm<StakeholderValues>({
    values: {
      stakeholder_type: person?.stakeholder_type ?? "director",
      full_name: person?.full_name ?? "",
      designation: person?.designation ?? "",
      ownership_percentage: str(person?.ownership_percentage),
      is_primary: !!person?.is_primary,
    },
  });
  const close = (o: boolean) => {
    if (!o) setConfirming(false);
    onOpenChange(o);
  };
  const submit = form.handleSubmit(async (v) => {
    if (v.full_name.trim().length < 2) return form.setError("full_name", { message: "Enter the full name" });
    const pct = num(v.ownership_percentage);
    if (pct != null && (Number.isNaN(pct) || pct < 0 || pct > 100)) return form.setError("ownership_percentage", { message: "Enter a share between 0 and 100" });
    const body = {
      stakeholder_type: v.stakeholder_type as Stakeholder["stakeholder_type"],
      full_name: v.full_name.trim(),
      designation: blank(v.designation),
      ownership_percentage: pct,
      is_primary: v.is_primary,
    };
    try {
      if (person) await update.mutateAsync({ id: person.id, ...body });
      else await add.mutateAsync(body);
      toast.success(person ? "Saved" : `${body.full_name} added`);
      close(false);
    } catch (err) {
      applyApiError(err, form.setError, Object.keys(v));
    }
  });
  const removeNow = async () => {
    if (!person) return;
    try {
      await remove.mutateAsync(person.id);
      toast.success(`${person.full_name} removed`);
      close(false);
    } catch (err) {
      applyApiError(err);
    }
  };
  return (
    <EditDialog
      open={open}
      onOpenChange={close}
      formId="stakeholder-form"
      pending={add.isPending || update.isPending}
      title={person ? `Edit ${person.full_name}` : "Add an owner or director"}
      description="Your accounting team keeps their PAN, DIN and contact details. Message them if those need to change."
      footerStart={person && (confirming ? (
        <span className="flex items-center gap-2">
          <Button type="button" variant="destructive" size="sm" disabled={remove.isPending} onClick={() => void removeNow()}>Yes, remove</Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(false)}>Keep</Button>
        </span>
      ) : (
        <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => setConfirming(true)}>Remove</Button>
      ))}
    >
      <form id="stakeholder-form" onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        <TextField form={form} name="full_name" label="Full name" className="sm:col-span-2" />
        <FormField id="stakeholder_type" label="Role">
          <Controller control={form.control} name="stakeholder_type" render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="stakeholder_type" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{STAKEHOLDER_TYPES.map((t) => <SelectItem key={t} value={t}>{humanize(t)}</SelectItem>)}</SelectContent>
            </Select>
          )} />
        </FormField>
        <TextField form={form} name="designation" label="Designation" placeholder="e.g. Managing director" />
        <TextField form={form} name="ownership_percentage" label="Ownership %" type="number" placeholder="Leave blank if none" />
        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <Controller control={form.control} name="is_primary" render={({ field }) => <Checkbox checked={field.value} onCheckedChange={(c) => field.onChange(c === true)} />} />
          Main contact person
        </label>
      </form>
    </EditDialog>
  );
}

/* ---------- Financial profile ---------- */

interface FinancialValues { financial_year_start_month: string; annual_turnover: string; monthly_transaction_volume: string; monthly_invoice_count: string; employee_count: string; current_accounting_software: string }

export function FinancialProfileDialog({ b, open, onOpenChange }: { b: PortalBusiness; open: boolean; onOpenChange: (o: boolean) => void }) {
  const save = useSaveBusiness(s.saveFinancialProfile);
  const f = b.financial_profile;
  const form = useForm<FinancialValues>({
    values: {
      financial_year_start_month: str(f?.financial_year_start_month ?? 4),
      annual_turnover: str(f?.annual_turnover),
      monthly_transaction_volume: str(f?.monthly_transaction_volume),
      monthly_invoice_count: str(f?.monthly_invoice_count),
      employee_count: str(f?.employee_count),
      current_accounting_software: f?.current_accounting_software ?? "",
    },
  });
  const submit = form.handleSubmit(async (v) => {
    const counts = ["annual_turnover", "monthly_transaction_volume", "monthly_invoice_count", "employee_count"] as const;
    let ok = true;
    for (const k of counts) {
      const n = num(v[k]);
      if (n != null && (Number.isNaN(n) || n < 0 || (k !== "annual_turnover" && !Number.isInteger(n)))) {
        form.setError(k, { message: k === "annual_turnover" ? "Enter an amount in rupees" : "Enter a whole number" });
        ok = false;
      }
    }
    if (!ok) return;
    try {
      await save.mutateAsync({
        financial_year_start_month: num(v.financial_year_start_month),
        annual_turnover: num(v.annual_turnover),
        monthly_transaction_volume: num(v.monthly_transaction_volume),
        monthly_invoice_count: num(v.monthly_invoice_count),
        employee_count: num(v.employee_count),
        current_accounting_software: blank(v.current_accounting_software),
      });
      toast.success("Financial profile saved");
      onOpenChange(false);
    } catch (err) {
      applyApiError(err, form.setError, Object.keys(v));
    }
  });
  return (
    <EditDialog open={open} onOpenChange={onOpenChange} formId="financial-form" pending={save.isPending} title="Financial profile" description="Rough numbers are fine. They help your team plan the work each month.">
      <form id="financial-form" onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        <SelectField form={form} name="financial_year_start_month" label="Financial year starts" options={MONTHS.map((m, i) => ({ value: String(i + 1), label: m }))} />
        <TextField form={form} name="annual_turnover" label="Annual turnover (₹)" type="number" />
        <TextField form={form} name="monthly_transaction_volume" label="Transactions per month" type="number" />
        <TextField form={form} name="monthly_invoice_count" label="Invoices per month" type="number" />
        <TextField form={form} name="employee_count" label="Employees" type="number" />
        <TextField form={form} name="current_accounting_software" label="Current accounting software" placeholder="e.g. Tally, Zoho Books" />
      </form>
    </EditDialog>
  );
}

/* ---------- Services ---------- */

export const SERVICES = [
  ["bookkeeping", "Bookkeeping"],
  ["gst_filing", "GST filing"],
  ["income_tax_filing", "Income tax filing"],
  ["payroll", "Payroll"],
  ["audit_support", "Audit support"],
] as const;
type ServiceValues = Omit<BusinessServicesBody, "other_services"> & { other_services: string };

export function ServicesDialog({ b, open, onOpenChange }: { b: PortalBusiness; open: boolean; onOpenChange: (o: boolean) => void }) {
  const save = useSaveBusiness(s.saveServices);
  const r = b.service_requirements;
  const form = useForm<ServiceValues>({
    values: {
      bookkeeping: !!r?.bookkeeping, gst_filing: !!r?.gst_filing, income_tax_filing: !!r?.income_tax_filing,
      payroll: !!r?.payroll, audit_support: !!r?.audit_support, other_services: r?.other_services ?? "",
    },
  });
  const submit = form.handleSubmit(async (v) => {
    try {
      await save.mutateAsync({ ...v, other_services: blank(v.other_services) });
      toast.success("Services saved");
      onOpenChange(false);
    } catch (err) {
      applyApiError(err, form.setError, Object.keys(v));
    }
  });
  return (
    <EditDialog open={open} onOpenChange={onOpenChange} formId="services-form" pending={save.isPending} title="Services" description="What you need help with. Your team sees the change straight away; any change to your plan or fees is agreed with you separately.">
      <form id="services-form" onSubmit={submit} noValidate className="grid gap-3">
        {SERVICES.map(([key, label]) => (
          <label key={key} className="flex items-center gap-2 text-sm">
            <Controller control={form.control} name={key} render={({ field }) => <Checkbox checked={field.value} onCheckedChange={(c) => field.onChange(c === true)} />} />
            {label}
          </label>
        ))}
        <TextField form={form} name="other_services" label="Anything else" placeholder="Separate with commas, e.g. ROC filings, TDS returns" />
      </form>
    </EditDialog>
  );
}
