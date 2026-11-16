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
import { applyApiError } from "@/lib/form-errors";
import { humanize } from "@/lib/format";
import { useClientProfileMutation } from "../hooks/use-clients";
import { clientService, type TaxDetailsBody } from "../services/client-service";
import { REGISTRATION_STATUSES, type ClientDetail, type RegistrationStatus } from "../types/client.types";

const NONE = "__none";
const upperPattern = (re: RegExp | null, max: number, message: string) =>
  z
    .string()
    .trim()
    .transform((v) => v.toUpperCase())
    .refine((v) => v === "" || (v.length <= max && (!re || re.test(v))), message);
const status = z.union([z.enum(REGISTRATION_STATUSES), z.literal(NONE)]);

// Mirrors backend companyTaxDetailsSchema.
const schema = z.object({
  pan_number: upperPattern(/^[A-Z]{5}\d{4}[A-Z]$/, 10, "Enter a valid 10-character PAN"),
  pan_status: status,
  gstin: upperPattern(/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, 15, "Enter a valid 15-character GSTIN"),
  gstin_status: status,
  tan_number: upperPattern(null, 10, "At most 10 characters"),
  tan_status: status,
  cin: upperPattern(null, 21, "At most 21 characters"),
  cin_status: status,
  llpin: upperPattern(null, 8, "At most 8 characters"),
  llpin_status: status,
  msme_udyam_number: upperPattern(null, 19, "At most 19 characters"),
  msme_status: status,
  professional_tax_registration: z.string().trim().max(50, "At most 50 characters"),
  professional_tax_status: status,
});
type Values = z.input<typeof schema>;
type Output = z.output<typeof schema>;

type NumberKey = "pan_number" | "gstin" | "tan_number" | "cin" | "llpin" | "msme_udyam_number" | "professional_tax_registration";
type StatusKey = "pan_status" | "gstin_status" | "tan_status" | "cin_status" | "llpin_status" | "msme_status" | "professional_tax_status";

const ROWS: { label: string; number: NumberKey; status: StatusKey; mono?: boolean; maxLength: number }[] = [
  { label: "PAN", number: "pan_number", status: "pan_status", mono: true, maxLength: 10 },
  { label: "GSTIN", number: "gstin", status: "gstin_status", mono: true, maxLength: 15 },
  { label: "TAN", number: "tan_number", status: "tan_status", mono: true, maxLength: 10 },
  { label: "CIN", number: "cin", status: "cin_status", mono: true, maxLength: 21 },
  { label: "LLPIN", number: "llpin", status: "llpin_status", mono: true, maxLength: 8 },
  { label: "MSME / Udyam", number: "msme_udyam_number", status: "msme_status", mono: true, maxLength: 19 },
  { label: "Professional tax", number: "professional_tax_registration", status: "professional_tax_status", maxLength: 50 },
];

const toValues = (c: ClientDetail): Values => {
  const t = c.tax_details;
  const s = (v: RegistrationStatus | null | undefined) => v ?? NONE;
  return {
    // Fall back to the client's own PAN/GSTIN so the first save doesn't drop them.
    pan_number: t?.pan_number ?? c.pan ?? "",
    pan_status: s(t?.pan_status),
    gstin: t?.gstin ?? c.gstin ?? "",
    gstin_status: s(t?.gstin_status),
    tan_number: t?.tan_number ?? "",
    tan_status: s(t?.tan_status),
    cin: t?.cin ?? "",
    cin_status: s(t?.cin_status),
    llpin: t?.llpin ?? "",
    llpin_status: s(t?.llpin_status),
    msme_udyam_number: t?.msme_udyam_number ?? "",
    msme_status: s(t?.msme_status),
    professional_tax_registration: t?.professional_tax_registration ?? "",
    professional_tax_status: s(t?.professional_tax_status),
  };
};

const toBody = (v: Output): TaxDetailsBody => {
  const n = (x: string) => x || null;
  const s = (x: Output[StatusKey]) => (x === NONE ? null : x);
  return {
    pan_number: n(v.pan_number), pan_status: s(v.pan_status),
    gstin: n(v.gstin), gstin_status: s(v.gstin_status),
    tan_number: n(v.tan_number), tan_status: s(v.tan_status),
    cin: n(v.cin), cin_status: s(v.cin_status),
    llpin: n(v.llpin), llpin_status: s(v.llpin_status),
    msme_udyam_number: n(v.msme_udyam_number), msme_status: s(v.msme_status),
    professional_tax_registration: n(v.professional_tax_registration), professional_tax_status: s(v.professional_tax_status),
  };
};

function TaxForm({ client, onDone }: { client: ClientDetail; onDone: () => void }) {
  const save = useClientProfileMutation(client.id, (body: TaxDetailsBody) => clientService.saveTaxDetails(client.id, body));
  const { register, control, handleSubmit, setError, formState: { errors } } = useForm<Values, unknown, Output>({
    resolver: zodResolver(schema),
    defaultValues: toValues(client),
  });

  const onSubmit = handleSubmit(async (v) => {
    try {
      await save.mutateAsync(toBody(v));
      toast.success("Tax & registrations saved");
      onDone();
    } catch (err) {
      applyApiError(err, setError, Object.keys(schema.shape));
    }
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle>Tax & registrations</DialogTitle>
        <DialogDescription>PAN and GSTIN entered here also update the client&apos;s business details. Leave anything unknown blank.</DialogDescription>
      </DialogHeader>
      <form id="tax-form" onSubmit={onSubmit} className="grid gap-4" noValidate>
        {ROWS.map((r) => (
          <div key={r.number} className="grid gap-3 sm:grid-cols-[1fr_11rem]">
            <FormField id={`tax-${r.number}`} label={r.label} error={errors[r.number]?.message}>
              <Input
                id={`tax-${r.number}`}
                className={r.mono ? "font-mono uppercase" : undefined}
                maxLength={r.maxLength}
                aria-invalid={!!errors[r.number]}
                {...register(r.number)}
              />
            </FormField>
            <FormField id={`tax-${r.status}`} label="Status" error={errors[r.status]?.message}>
              <Controller control={control} name={r.status} render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id={`tax-${r.status}`} className="w-full" aria-label={`${r.label} status`}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Not set</SelectItem>
                    {REGISTRATION_STATUSES.map((s) => <SelectItem key={s} value={s}>{humanize(s)}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
            </FormField>
          </div>
        ))}
      </form>
      <DialogFooter>
        <Button variant="outline" onClick={onDone}>Cancel</Button>
        <SubmitButton form="tax-form" pending={save.isPending}>Save</SubmitButton>
      </DialogFooter>
    </>
  );
}

export function TaxDetailsDialog({ client, open, onOpenChange }: { client: ClientDetail; open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">{open && <TaxForm client={client} onDone={() => onOpenChange(false)} />}</DialogContent>
    </Dialog>
  );
}
