"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { FormField } from "@/components/shared/form-field";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ClientPicker } from "@/features/workspace/components/client-picker";
import { applyApiError } from "@/lib/form-errors";
import type { StaffPortal } from "@/types/auth";
import { useStartThread } from "../hooks/use-communication";
import type { ThreadVisibility } from "../types/communication.types";

const schema = z.object({
  client_id: z.string().min(1, "Choose a client"),
  visibility: z.enum(["client", "internal"]),
  subject: z.string().trim().min(2, "Add a subject").max(200),
  body: z.string().trim().min(1, "Write a message").max(5000),
});
type Values = z.infer<typeof schema>;

function ThreadForm({ portal, clientId, visibility, onDone }: { portal: StaffPortal; clientId?: number; visibility: ThreadVisibility; onDone: (threadId?: number) => void }) {
  const start = useStartThread(portal);
  const { register, control, handleSubmit, setError, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { client_id: clientId ? String(clientId) : "", visibility, subject: "", body: "" },
  });
  const vis = useWatch({ control, name: "visibility" });
  const onSubmit = handleSubmit(async (v) => {
    try {
      const t = await start.mutateAsync({ client_id: Number(v.client_id), visibility: v.visibility, subject: v.subject, body: v.body });
      toast.success(v.visibility === "client" ? "Message sent to the client" : "Internal note posted");
      onDone(t.id);
    } catch (err) {
      applyApiError(err, setError, ["client_id", "subject", "body"]);
    }
  });
  return (
    <>
      <DialogHeader>
        <DialogTitle>New conversation</DialogTitle>
        <DialogDescription>Client conversations appear in the client&apos;s portal. Internal ones are only visible to staff.</DialogDescription>
      </DialogHeader>
      <form id="thread-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
        {!clientId && (
          <FormField id="th-client" label="Client" error={errors.client_id?.message}>
            <Controller control={control} name="client_id" render={({ field }) => <ClientPicker portal={portal} id="th-client" value={field.value} onChange={field.onChange} invalid={!!errors.client_id} />} />
          </FormField>
        )}
        <FormField id="th-visibility" label="Who can see it" className={clientId ? "sm:col-span-2" : undefined}>
          <Controller control={control} name="visibility" render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="th-visibility" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="client">Client and team</SelectItem>
                <SelectItem value="internal">Staff only (internal)</SelectItem>
              </SelectContent>
            </Select>
          )} />
        </FormField>
        <FormField id="th-subject" label="Subject" error={errors.subject?.message} className="sm:col-span-2">
          <Input id="th-subject" aria-invalid={!!errors.subject} {...register("subject")} />
        </FormField>
        <FormField id="th-body" label="Message" error={errors.body?.message} className="sm:col-span-2" hint={vis === "client" ? "The client's portal users are emailed." : "Colleagues on this client are emailed."}>
          <Textarea id="th-body" rows={5} aria-invalid={!!errors.body} {...register("body")} />
        </FormField>
      </form>
      <DialogFooter>
        <Button variant="outline" onClick={() => onDone()}>Cancel</Button>
        <SubmitButton form="thread-form" pending={start.isPending}>Send</SubmitButton>
      </DialogFooter>
    </>
  );
}

export function NewThreadDialog({
  portal,
  clientId,
  visibility = "client",
  open,
  onOpenChange,
  onCreated,
}: {
  portal: StaffPortal;
  clientId?: number;
  visibility?: ThreadVisibility;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated?: (threadId: number) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {open && (
          <ThreadForm
            portal={portal}
            clientId={clientId}
            visibility={visibility}
            onDone={(id) => {
              onOpenChange(false);
              if (id) onCreated?.(id);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
