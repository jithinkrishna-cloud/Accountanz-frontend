"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { FormField } from "@/components/shared/form-field";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { applyApiError } from "@/lib/form-errors";
import { humanize } from "@/lib/format";
import { useClientProfileMutation } from "../hooks/use-clients";
import { clientService, type StakeholderBody } from "../services/client-service";
import { STAKEHOLDER_TYPES, type CompanyStakeholder } from "../types/client.types";

// Mirrors backend stakeholderSchema.
const schema = z.object({
  stakeholder_type: z.enum(STAKEHOLDER_TYPES, { error: "Choose a type" }),
  full_name: z.string().trim().min(2, "Enter the full name").max(150),
  designation: z.string().trim().max(100),
  email: z.string().trim().email("Enter a valid email address").or(z.literal("")),
  phone: z.string().trim().max(30),
  ownership_percentage: z
    .string()
    .trim()
    .refine((v) => v === "" || (/^\d+(\.\d{1,2})?$/.test(v) && Number(v) <= 100), "Enter a percentage between 0 and 100"),
  pan_number: z
    .string()
    .trim()
    .transform((v) => v.toUpperCase())
    .refine((v) => v === "" || /^[A-Z]{5}\d{4}[A-Z]$/.test(v), "Enter a valid 10-character PAN"),
  din_number: z.string().trim().max(20),
  address: z.string().trim().max(500),
  is_primary: z.boolean(),
});
type Values = z.input<typeof schema>;
type Output = z.output<typeof schema>;
const FIELDS = Object.keys(schema.shape);

const toBody = (v: Output): StakeholderBody => ({
  stakeholder_type: v.stakeholder_type,
  full_name: v.full_name,
  designation: v.designation || null,
  email: v.email ? v.email.toLowerCase() : null,
  phone: v.phone || null,
  ownership_percentage: v.ownership_percentage === "" ? null : Number(v.ownership_percentage),
  pan_number: v.pan_number || null,
  din_number: v.din_number || null,
  address: v.address || null,
  is_primary: v.is_primary,
});

const toValues = (s: CompanyStakeholder | null, makePrimary: boolean): Values => ({
  stakeholder_type: s?.stakeholder_type ?? ("" as Values["stakeholder_type"]),
  full_name: s?.full_name ?? "",
  designation: s?.designation ?? "",
  email: s?.email ?? "",
  phone: s?.phone ?? "",
  ownership_percentage: s?.ownership_percentage != null ? String(s.ownership_percentage) : "",
  pan_number: s?.pan_number ?? "",
  din_number: s?.din_number ?? "",
  address: s?.address ?? "",
  is_primary: s ? !!s.is_primary : makePrimary,
});

interface FormProps {
  clientId: number;
  stakeholder: CompanyStakeholder | null;
  /** Ownership % already held by the client's other stakeholders. */
  allocatedElsewhere: number;
  isFirst: boolean;
  onDone: () => void;
}

function StakeholderForm({ clientId, stakeholder, allocatedElsewhere, isFirst, onDone }: FormProps) {
  const save = useClientProfileMutation(clientId, (body: StakeholderBody) =>
    stakeholder ? clientService.updateStakeholder(clientId, stakeholder.id, body) : clientService.addStakeholder(clientId, body),
  );
  const { register, control, handleSubmit, setError, formState: { errors } } = useForm<Values, unknown, Output>({
    resolver: zodResolver(schema),
    defaultValues: toValues(stakeholder, isFirst),
  });
  const remaining = Math.max(0, 100 - allocatedElsewhere);

  const onSubmit = handleSubmit(async (v) => {
    try {
      await save.mutateAsync(toBody(v));
      toast.success(stakeholder ? "Stakeholder updated" : `${v.full_name} added`);
      onDone();
    } catch (err) {
      applyApiError(err, setError, FIELDS);
    }
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle>{stakeholder ? "Edit stakeholder" : "Add stakeholder"}</DialogTitle>
        <DialogDescription>A director, partner, owner or proprietor of the company.</DialogDescription>
      </DialogHeader>
      <form id="stakeholder-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
        <FormField id="sh-type" label="Type" error={errors.stakeholder_type?.message}>
          <Controller control={control} name="stakeholder_type" render={({ field }) => (
            <Select value={field.value || undefined} onValueChange={field.onChange}>
              <SelectTrigger id="sh-type" className="w-full" aria-invalid={!!errors.stakeholder_type}><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>{STAKEHOLDER_TYPES.map((t) => <SelectItem key={t} value={t}>{humanize(t)}</SelectItem>)}</SelectContent>
            </Select>
          )} />
        </FormField>
        <FormField id="sh-name" label="Full name" error={errors.full_name?.message}>
          <Input id="sh-name" autoFocus aria-invalid={!!errors.full_name} {...register("full_name")} />
        </FormField>
        <FormField id="sh-designation" label="Designation" hint="Optional" error={errors.designation?.message}>
          <Input id="sh-designation" placeholder="Managing Director" {...register("designation")} />
        </FormField>
        <FormField
          id="sh-ownership"
          label="Ownership %"
          hint={`Optional. ${remaining.toFixed(2).replace(/\.00$/, "")}% left to allocate.`}
          error={errors.ownership_percentage?.message}
        >
          <Input id="sh-ownership" inputMode="decimal" aria-invalid={!!errors.ownership_percentage} {...register("ownership_percentage")} />
        </FormField>
        <FormField id="sh-email" label="Email" hint="Optional" error={errors.email?.message}>
          <Input id="sh-email" type="email" aria-invalid={!!errors.email} {...register("email")} />
        </FormField>
        <FormField id="sh-phone" label="Phone" hint="Optional" error={errors.phone?.message}>
          <Input id="sh-phone" type="tel" {...register("phone")} />
        </FormField>
        <FormField id="sh-pan" label="PAN" hint="Optional" error={errors.pan_number?.message}>
          <Input id="sh-pan" className="font-mono uppercase" maxLength={10} aria-invalid={!!errors.pan_number} {...register("pan_number")} />
        </FormField>
        <FormField id="sh-din" label="DIN" hint="Optional: director identification number." error={errors.din_number?.message}>
          <Input id="sh-din" className="font-mono" maxLength={20} {...register("din_number")} />
        </FormField>
        <FormField id="sh-address" label="Address" hint="Optional" error={errors.address?.message} className="sm:col-span-2">
          <Textarea id="sh-address" rows={2} {...register("address")} />
        </FormField>
        <Controller control={control} name="is_primary" render={({ field }) => (
          <div className="flex items-start gap-2 sm:col-span-2">
            <Checkbox id="sh-primary" checked={field.value} onCheckedChange={(c) => field.onChange(c === true)} className="mt-0.5" />
            <div className="grid gap-0.5">
              <Label htmlFor="sh-primary">Primary stakeholder</Label>
              <p className="text-muted-foreground text-xs">Only one stakeholder can be primary; choosing this one replaces the current primary.</p>
            </div>
          </div>
        )} />
      </form>
      <DialogFooter>
        <Button variant="outline" onClick={onDone}>Cancel</Button>
        <SubmitButton form="stakeholder-form" pending={save.isPending}>{stakeholder ? "Save" : "Add stakeholder"}</SubmitButton>
      </DialogFooter>
    </>
  );
}

/** `stakeholder` undefined = closed, null = adding, a stakeholder = editing. */
export function StakeholderDialog({
  clientId,
  stakeholder,
  all,
  onClose,
}: {
  clientId: number;
  stakeholder: CompanyStakeholder | null | undefined;
  all: CompanyStakeholder[];
  onClose: () => void;
}) {
  const open = stakeholder !== undefined;
  const allocatedElsewhere = all.filter((s) => s.id !== stakeholder?.id).reduce((sum, s) => sum + (s.ownership_percentage ?? 0), 0);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        {open && <StakeholderForm clientId={clientId} stakeholder={stakeholder} allocatedElsewhere={allocatedElsewhere} isFirst={all.length === 0} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

export function RemoveStakeholderDialog({ clientId, stakeholder, onClose }: { clientId: number; stakeholder: CompanyStakeholder | null; onClose: () => void }) {
  const remove = useClientProfileMutation(clientId, (id: number) => clientService.removeStakeholder(clientId, id));
  if (!stakeholder) return null;

  const confirm = async () => {
    try {
      await remove.mutateAsync(stakeholder.id);
      toast.success(`${stakeholder.full_name} removed`);
      onClose();
    } catch (err) {
      applyApiError(err);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Remove {stakeholder.full_name}?</DialogTitle>
          <DialogDescription>
            {stakeholder.is_primary ? "This is the primary stakeholder; mark someone else primary afterwards. " : ""}The change is recorded in the audit log.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <SubmitButton variant="destructive" pending={remove.isPending} onClick={() => void confirm()}>Remove</SubmitButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
