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
import { Textarea } from "@/components/ui/textarea";
import { ClientPicker } from "@/features/workspace/components/client-picker";
import { applyApiError } from "@/lib/form-errors";
import type { StaffPortal } from "@/types/auth";
import { useRequestApproval } from "../hooks/use-client-approvals";

const schema = z.object({
  client_id: z.string().min(1, "Choose a client"),
  subject: z.string().trim().min(3, "Say what needs approval").max(200),
  description: z.string().trim().max(2000),
});
type Values = z.infer<typeof schema>;

function ApprovalForm({ portal, clientId, onDone }: { portal: StaffPortal; clientId?: number; onDone: () => void }) {
  const request = useRequestApproval(portal);
  const { register, control, handleSubmit, setError, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { client_id: clientId ? String(clientId) : "", subject: "", description: "" },
  });
  const onSubmit = handleSubmit(async (v) => {
    try {
      await request.mutateAsync({ client_id: Number(v.client_id), subject: v.subject, description: v.description || null });
      toast.success("Approval requested. The client's approvers have been emailed.");
      onDone();
    } catch (err) {
      applyApiError(err, setError, ["client_id", "subject", "description"]);
    }
  });
  return (
    <>
      <DialogHeader>
        <DialogTitle>Request client approval</DialogTitle>
        <DialogDescription>The client&apos;s owner, or anyone allowed to approve, decides in their portal. Rejections come with a reason.</DialogDescription>
      </DialogHeader>
      <form id="approval-form" onSubmit={onSubmit} className="grid gap-4" noValidate>
        {!clientId && (
          <FormField id="apr-client" label="Client" error={errors.client_id?.message}>
            <Controller control={control} name="client_id" render={({ field }) => <ClientPicker portal={portal} id="apr-client" value={field.value} onChange={field.onChange} invalid={!!errors.client_id} />} />
          </FormField>
        )}
        <FormField id="apr-subject" label="What needs approval?" error={errors.subject?.message}>
          <Input id="apr-subject" placeholder="Approve November provisioning for slow-moving stock" aria-invalid={!!errors.subject} {...register("subject")} />
        </FormField>
        <FormField id="apr-description" label="Details" hint="Optional: amounts, reasons, what happens next." error={errors.description?.message}>
          <Textarea id="apr-description" rows={4} {...register("description")} />
        </FormField>
      </form>
      <DialogFooter>
        <Button variant="outline" onClick={onDone}>Cancel</Button>
        <SubmitButton form="approval-form" pending={request.isPending}>Send for approval</SubmitButton>
      </DialogFooter>
    </>
  );
}

export function RequestApprovalDialog({ portal, clientId, open, onOpenChange }: { portal: StaffPortal; clientId?: number; open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">{open && <ApprovalForm portal={portal} clientId={clientId} onDone={() => onOpenChange(false)} />}</DialogContent>
    </Dialog>
  );
}
