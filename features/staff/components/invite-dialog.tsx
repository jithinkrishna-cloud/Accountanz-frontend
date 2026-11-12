"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
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
import { useInviteStaff } from "../hooks/use-staff";
import { inviteFormSchema, type InviteFormValues } from "../schemas/staff.schema";
import { ROLES_BY_TYPE, type StaffType } from "../types/staff.types";
import { InviteLinkBox } from "./invite-link-box";

export function InviteDialog({ open, onOpenChange, staffType }: { open: boolean; onOpenChange: (o: boolean) => void; staffType: StaffType }) {
  const invite = useInviteStaff();
  const roles = ROLES_BY_TYPE[staffType];
  const [created, setCreated] = useState<{ email: string; url: string; emailSent: boolean } | null>(null);
  const { register, control, handleSubmit, reset, setError, formState: { errors } } = useForm<InviteFormValues>({ resolver: zodResolver(inviteFormSchema) });

  useEffect(() => {
    if (open) reset({ full_name: "", email: "", phone: "", portal_role: roles[0] });
  }, [open, reset, roles]);

  const close = (o: boolean) => {
    if (!o) setCreated(null);
    onOpenChange(o);
  };

  const onSubmit = handleSubmit(async (values) => {
    try {
      const person = await invite.mutateAsync({ ...values, staff_type: staffType });
      toast.success(`${values.full_name} invited`);
      setCreated({ email: person.email, url: person.invite_url, emailSent: person.email_sent });
    } catch (err) {
      applyApiError(err, setError, ["full_name", "email", "phone", "portal_role"]);
    }
  });

  if (created) {
    return (
      <Dialog open={open} onOpenChange={close}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite created</DialogTitle>
            <DialogDescription>The account is waiting for its owner to set a password.</DialogDescription>
          </DialogHeader>
          <InviteLinkBox url={created.url} email={created.email} emailSent={created.emailSent} />
          <DialogFooter>
            <Button onClick={() => close(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite a person</DialogTitle>
          <DialogDescription>They receive an email invite and land in the portal their role belongs to.</DialogDescription>
        </DialogHeader>
        <form id="invite-form" onSubmit={onSubmit} className="grid gap-4" noValidate>
          <FormField id="full_name" label="Full name" error={errors.full_name?.message}>
            <Input id="full_name" autoFocus aria-invalid={!!errors.full_name} {...register("full_name")} />
          </FormField>
          <FormField id="email" label="Email" error={errors.email?.message}>
            <Input id="email" type="email" aria-invalid={!!errors.email} {...register("email")} />
          </FormField>
          <FormField id="phone" label="Phone" error={errors.phone?.message}>
            <Input id="phone" type="tel" {...register("phone")} />
          </FormField>
          <FormField id="portal_role" label="Portal role" error={errors.portal_role?.message}>
            <Controller control={control} name="portal_role" render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="portal_role" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{roles.map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}</SelectContent>
              </Select>
            )} />
          </FormField>
          <p className="text-muted-foreground text-xs">Access to client records still comes from an active assignment — the role alone grants nothing.</p>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => close(false)}>Cancel</Button>
          <SubmitButton form="invite-form" pending={invite.isPending}>Send invite</SubmitButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
