"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { FormField } from "@/components/shared/form-field";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { applyApiError } from "@/lib/form-errors";
import { useVerifyConnection } from "../hooks/use-integrations";
import type { Connection } from "../types/integration.types";

const schema = z.object({ note: z.string().trim().min(10, "Say how you checked it, in at least 10 characters").max(500) });
type Values = z.infer<typeof schema>;

function VerifyForm({ connection, onDone }: { connection: Connection; onDone: () => void }) {
  const verify = useVerifyConnection();
  const { register, handleSubmit, setError, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { note: "" } });
  const onSubmit = handleSubmit(async (v) => {
    try {
      await verify.mutateAsync({ id: connection.id, note: v.note });
      toast.success(`${connection.client_name}: marked verified`);
      onDone();
    } catch (err) {
      applyApiError(err, setError, ["note"]);
    }
  });
  return (
    <>
      <DialogHeader>
        <DialogTitle>Mark {connection.client_name}&apos;s JournL verified?</DialogTitle>
        <DialogDescription>
          Check in JournL that organisation {connection.external_org_id} ({connection.external_org_name ?? "no name"}) exists, is active and belongs to this client. This is a manual check, not JournL API access; your note is kept with the connection and in the audit log.
        </DialogDescription>
      </DialogHeader>
      <form id="verify-connection-form" onSubmit={onSubmit} className="grid gap-4" noValidate>
        <FormField id="verify-note" label="How did you verify it?" error={errors.note?.message}>
          <Textarea id="verify-note" rows={3} placeholder="Checked in JournL: company 218 active, owner email matches the client owner." aria-invalid={!!errors.note} {...register("note")} />
        </FormField>
      </form>
      <DialogFooter>
        <Button variant="outline" onClick={onDone}>Cancel</Button>
        <SubmitButton form="verify-connection-form" pending={verify.isPending}>Mark verified</SubmitButton>
      </DialogFooter>
    </>
  );
}

/** Admin's manual verification of a client's JournL organisation, with a required note. */
export function VerifyConnectionDialog({ connection, onClose }: { connection: Connection | null; onClose: () => void }) {
  return (
    <Dialog open={!!connection} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">{connection && <VerifyForm connection={connection} onDone={onClose} />}</DialogContent>
    </Dialog>
  );
}
