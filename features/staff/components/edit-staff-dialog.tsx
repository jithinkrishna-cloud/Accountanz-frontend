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
import { ROLE_LABELS } from "@/lib/constants";
import { applyApiError } from "@/lib/form-errors";
import { humanize } from "@/lib/format";
import { useUpdateStaff } from "../hooks/use-staff";
import { editFormSchema, type EditFormOutput, type EditFormValues } from "../schemas/staff.schema";
import type { StaffUpdate } from "../services/staff-service";
import { ROLES_BY_TYPE, VERIFICATION_STATUSES, type StaffMember } from "../types/staff.types";
import { PendingInvite } from "./pending-invite";

const toValues = (m: StaffMember): EditFormValues => ({
  full_name: m.full_name,
  phone: m.phone ?? "",
  portal_role: m.portal_role,
  status: m.status === "disabled" ? "disabled" : "active",
  hourly_rate: m.hourly_rate == null ? "" : String(m.hourly_rate),
  expertise: (m.expertise ?? []).join(", "),
  verification_status: m.verification_status,
  bank_account_name: m.bank_account_name ?? "",
  bank_account_number: "",
  bank_ifsc: m.bank_ifsc ?? "",
});

/** Builds the PATCH body; the account number is only sent when the admin typed a new one. */
function toUpdate(v: EditFormOutput, member: StaffMember): StaffUpdate {
  const body: StaffUpdate = {
    full_name: v.full_name,
    phone: v.phone || null,
    portal_role: v.portal_role,
    hourly_rate: v.hourly_rate === "" ? null : Number(v.hourly_rate),
    expertise: v.expertise.split(",").map((s) => s.trim()).filter(Boolean),
    verification_status: v.verification_status,
    bank_account_name: v.bank_account_name || null,
    bank_ifsc: v.bank_ifsc || null,
  };
  if (member.status !== "invited") body.status = v.status;
  if (v.bank_account_number) body.bank_account_number = v.bank_account_number;
  return body;
}

export function EditStaffDialog({ member, onOpenChange }: { member: StaffMember | null; onOpenChange: (o: boolean) => void }) {
  const update = useUpdateStaff(member?.user_id ?? 0);
  const { register, control, handleSubmit, reset, setError, formState: { errors } } = useForm<EditFormValues, unknown, EditFormOutput>({
    resolver: zodResolver(editFormSchema),
  });

  useEffect(() => {
    if (member) reset(toValues(member));
  }, [member, reset]);

  if (!member) return null;
  const isAccountant = member.staff_type === "accountant";

  const onSubmit = handleSubmit(async (values) => {
    try {
      const saved = await update.mutateAsync(toUpdate(values, member));
      toast.success(
        saved.ended_assignments
          ? `Changes saved. ${member.full_name} was signed out and ${saved.ended_assignments} assignment(s) ended.`
          : "Changes saved",
      );
      onOpenChange(false);
    } catch (err) {
      applyApiError(err, setError, Object.keys(values));
    }
  });

  const select = (name: "portal_role" | "status" | "verification_status", options: { value: string; label: string }[], disabled = false) => (
    <Controller control={control} name={name} render={({ field }) => (
      <Select value={field.value} onValueChange={field.onChange} disabled={disabled}>
        <SelectTrigger id={name} className="w-full"><SelectValue /></SelectTrigger>
        <SelectContent>{options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
      </Select>
    )} />
  );

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{member.full_name}</DialogTitle>
          <DialogDescription>{member.email}</DialogDescription>
        </DialogHeader>
        <form id="staff-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
          <FormField id="full_name" label="Full name" error={errors.full_name?.message}>
            <Input id="full_name" {...register("full_name")} />
          </FormField>
          <FormField id="phone" label="Phone" error={errors.phone?.message}>
            <Input id="phone" type="tel" {...register("phone")} />
          </FormField>
          <FormField id="portal_role" label="Portal role">
            {select("portal_role", ROLES_BY_TYPE[member.staff_type].map((r) => ({ value: r, label: ROLE_LABELS[r] })))}
          </FormField>
          <FormField id="status" label="Account" hint={member.status === "invited" ? "Activates when the invite is accepted." : undefined}>
            {select("status", [{ value: "active", label: "Active" }, { value: "disabled", label: "Disabled" }], member.status === "invited")}
          </FormField>
          <FormField
            id="verification_status"
            label="Verification"
            hint={
              isAccountant
                ? "Only verified accountants can be assigned or paid. Rejecting signs them out and ends their assignments."
                : "Rejected staff can't sign in."
            }
          >
            {select("verification_status", VERIFICATION_STATUSES.map((s) => ({ value: s, label: humanize(s) })))}
          </FormField>
          {isAccountant && (
            <FormField id="hourly_rate" label="Hourly rate (₹)" error={errors.hourly_rate?.message}>
              <Input id="hourly_rate" type="number" inputMode="decimal" min={0} {...register("hourly_rate")} />
            </FormField>
          )}
          <FormField id="expertise" label="Expertise" hint="Separate with commas." className="sm:col-span-2">
            <Input id="expertise" placeholder="Bookkeeping, GST" {...register("expertise")} />
          </FormField>
          {isAccountant && (
            <fieldset className="grid gap-4 border-t pt-4 sm:col-span-2 sm:grid-cols-2">
              <legend className="text-sm font-medium">Bank details for payouts</legend>
              <FormField id="bank_account_name" label="Account name" error={errors.bank_account_name?.message}>
                <Input id="bank_account_name" {...register("bank_account_name")} />
              </FormField>
              <FormField id="bank_ifsc" label="IFSC" error={errors.bank_ifsc?.message}>
                <Input id="bank_ifsc" className="uppercase" maxLength={11} {...register("bank_ifsc")} />
              </FormField>
              <FormField
                id="bank_account_number"
                label="Account number"
                error={errors.bank_account_number?.message}
                hint={member.bank_account_last4 ? `On file: ••••${member.bank_account_last4}. Leave blank to keep it.` : "No account on file."}
                className="sm:col-span-2"
              >
                <Input id="bank_account_number" inputMode="numeric" autoComplete="off" {...register("bank_account_number")} />
              </FormField>
            </fieldset>
          )}
        </form>
        {member.status === "invited" && <PendingInvite key={member.user_id} member={member} />}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <SubmitButton form="staff-form" pending={update.isPending}>Save changes</SubmitButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
