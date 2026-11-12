"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
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
import { InviteLinkBox } from "@/features/staff/components/invite-link-box";
import { applyApiError } from "@/lib/form-errors";
import { clientService } from "../services/client-service";

const schema = z.object({
  full_name: z.string().trim().min(2, "Enter the full name").max(150),
  email: z.email("Enter a valid email address"),
  phone: z.string().trim().max(30),
  role: z.enum(["owner", "member"]),
  can_approve: z.boolean(),
});
type Values = z.infer<typeof schema>;

function InviteForm({ clientId, clientName, onDone }: { clientId: number; clientName: string; onDone: () => void }) {
  const qc = useQueryClient();
  const invite = useMutation({
    mutationFn: (v: Values) => clientService.inviteUser(clientId, { ...v, phone: v.phone || null }),
    onSuccess: (r) => qc.setQueryData(["admin", "clients", "detail", clientId], r.client),
  });
  const [sent, setSent] = useState<{ url: string; email: string; emailSent: boolean } | null>(null);
  const { register, control, handleSubmit, setError, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { full_name: "", email: "", phone: "", role: "owner", can_approve: true },
  });
  const role = useWatch({ control, name: "role" });

  const onSubmit = handleSubmit(async (v) => {
    try {
      const r = await invite.mutateAsync(v);
      toast.success(`${v.full_name} invited to the client portal`);
      setSent({ url: r.invite_url, email: v.email, emailSent: r.email_sent });
    } catch (err) {
      applyApiError(err, setError, ["full_name", "email", "phone", "role"]);
    }
  });

  if (sent) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Invite created</DialogTitle>
          <DialogDescription>They can sign in to the {clientName} portal once they set a password.</DialogDescription>
        </DialogHeader>
        <InviteLinkBox url={sent.url} email={sent.email} emailSent={sent.emailSent} />
        <DialogFooter><Button onClick={onDone}>Done</Button></DialogFooter>
      </>
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Invite a client user</DialogTitle>
        <DialogDescription>A login to the {clientName} client portal: documents, approvals, reports and billing.</DialogDescription>
      </DialogHeader>
      <form id="invite-client-user" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
        <FormField id="full_name" label="Full name" error={errors.full_name?.message}><Input id="full_name" autoFocus {...register("full_name")} /></FormField>
        <FormField id="email" label="Email" error={errors.email?.message}><Input id="email" type="email" {...register("email")} /></FormField>
        <FormField id="phone" label="Phone"><Input id="phone" type="tel" {...register("phone")} /></FormField>
        <FormField id="role" label="Role" hint={role === "owner" ? "Owners can always approve." : undefined}>
          <Controller control={control} name="role" render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="role" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="owner">Owner</SelectItem>
                <SelectItem value="member">Member</SelectItem>
              </SelectContent>
            </Select>
          )} />
        </FormField>
        {role === "member" && (
          <Controller control={control} name="can_approve" render={({ field }) => (
            <Label className="flex items-center gap-2 font-normal sm:col-span-2">
              <Checkbox checked={field.value} onCheckedChange={(c) => field.onChange(c === true)} />
              Can approve requests from the accounting team
            </Label>
          )} />
        )}
      </form>
      <DialogFooter>
        <Button variant="outline" onClick={onDone}>Cancel</Button>
        <SubmitButton form="invite-client-user" pending={invite.isPending}>Send invite</SubmitButton>
      </DialogFooter>
    </>
  );
}

export function InviteClientUserDialog({ open, onOpenChange, clientId, clientName }: { open: boolean; onOpenChange: (o: boolean) => void; clientId: number; clientName: string }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">{open && <InviteForm clientId={clientId} clientName={clientName} onDone={() => onOpenChange(false)} />}</DialogContent>
    </Dialog>
  );
}
