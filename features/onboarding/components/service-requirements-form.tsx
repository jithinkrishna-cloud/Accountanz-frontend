"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { FormField } from "@/components/shared/form-field";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { applyApiError } from "@/lib/form-errors";
import { splitList } from "@/lib/format";
import { useSaveServiceRequirements } from "../hooks/use-onboarding";
import type { OnboardingCase, OnboardingServiceRequirements } from "../types/onboarding.types";

const SERVICES = [
  { key: "bookkeeping", label: "Bookkeeping" },
  { key: "gst_filing", label: "GST filing" },
  { key: "income_tax_filing", label: "Income tax filing" },
  { key: "payroll", label: "Payroll" },
  { key: "audit_support", label: "Audit support" },
] as const;

// Mirrors backend serviceRequirementsSchema.
const schema = z.object({
  bookkeeping: z.boolean(),
  gst_filing: z.boolean(),
  income_tax_filing: z.boolean(),
  payroll: z.boolean(),
  audit_support: z.boolean(),
  other_services: z.string().trim().max(500),
  notes: z.string().trim().max(1000),
});
type Values = z.infer<typeof schema>;

const toValues = (r: OnboardingServiceRequirements | null | undefined): Values => ({
  bookkeeping: !!r?.bookkeeping,
  gst_filing: !!r?.gst_filing,
  income_tax_filing: !!r?.income_tax_filing,
  payroll: !!r?.payroll,
  audit_support: !!r?.audit_support,
  other_services: r?.other_services ?? "",
  notes: r?.notes ?? "",
});


function OtherServicesInput({ id, value, onChange, disabled }: { id: string; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const [draft, setDraft] = useState("");
  const items = splitList(value);

  // Typing "ROC filings, Virtual CFO" adds both; duplicates (any case) are skipped.
  const add = () => {
    const next = [...items];
    for (const s of splitList(draft)) if (!next.some((i) => i.toLowerCase() === s.toLowerCase())) next.push(s);
    setDraft("");
    if (next.length !== items.length) onChange(next.join(", "));
  };
  const remove = (s: string) => onChange(items.filter((i) => i !== s).join(", "));

  return (
    <div className="grid gap-2">
      {items.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Other services added">
          {items.map((s) => (
            <li key={s} className="bg-muted inline-flex items-center gap-1 rounded-md py-1 pr-1 pl-2.5 text-sm">
              {s}
              {!disabled && (
                <button type="button" onClick={() => remove(s)} aria-label={`Remove ${s}`} className="text-muted-foreground hover:text-foreground rounded p-0.5">
                  <X className="size-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {disabled && items.length === 0 && <p className="text-muted-foreground text-sm">None</p>}
      {!disabled && (
        <div className="flex gap-2">
          <Input
            id={id}
            value={draft}
            placeholder="e.g. ROC filings"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
            // Don't lose a typed service if Save is clicked without pressing +.
            onBlur={add}
          />
          <Button type="button" variant="outline" size="icon" onClick={add} disabled={!draft.trim()} aria-label="Add service">
            <Plus className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

export function ServiceRequirementsForm({ row, locked, onChanged }: { row: OnboardingCase; locked: boolean; onChanged: (row: OnboardingCase) => void }) {
  const save = useSaveServiceRequirements(row.id);
  const { register, control, handleSubmit, reset, setError, formState: { errors, isDirty } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: toValues(row.service_requirements),
  });

  useEffect(() => reset(toValues(row.service_requirements)), [row.service_requirements, reset]);

  const onSave = handleSubmit(async (v) => {
    try {
      onChanged(await save.mutateAsync({ ...v, other_services: v.other_services || null, notes: v.notes || null }));
      toast.success("Service requirements saved");
    } catch (err) {
      applyApiError(err, setError, Object.keys(schema.shape));
    }
  });

  return (
    <section aria-labelledby="requirements-heading">
      <div className="mb-3">
        <h3 id="requirements-heading" className="font-medium">Service requirements</h3>
        <p className="text-muted-foreground text-xs">What the company needs from us. At least one is needed for onboarding to be complete.</p>
      </div>
      <form id="requirements-form" onSubmit={onSave} className="grid gap-4" noValidate>
        <fieldset disabled={locked} className="contents">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
            {SERVICES.map((s) => (
              <Controller key={s.key} control={control} name={s.key} render={({ field }) => (
                <div className="flex items-center gap-2">
                  <Checkbox id={`req-${s.key}`} checked={field.value} disabled={locked} onCheckedChange={(c) => field.onChange(c === true)} />
                  <Label htmlFor={`req-${s.key}`} className="font-normal">{s.label}</Label>
                </div>
              )} />
            ))}
          </div>
          <FormField id="req-other" label="Other services" hint={locked ? undefined : "Optional. Press Enter or + to add each one."} error={errors.other_services?.message}>
            <Controller control={control} name="other_services" render={({ field }) => (
              <OtherServicesInput id="req-other" value={field.value} onChange={field.onChange} disabled={locked} />
            )} />
          </FormField>
          <FormField id="req-notes" label="Internal notes" hint="Only Accountanz staff see these." error={errors.notes?.message}>
            <Textarea id="req-notes" rows={2} {...register("notes")} />
          </FormField>
        </fieldset>
      </form>
      {!locked && (
        <div className="mt-4 flex justify-end">
          <SubmitButton form="requirements-form" size="sm" variant={isDirty ? "default" : "outline"} pending={save.isPending}>
            Save requirements
          </SubmitButton>
        </div>
      )}
    </section>
  );
}
