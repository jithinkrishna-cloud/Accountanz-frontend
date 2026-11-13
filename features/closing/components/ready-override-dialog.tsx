"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { FormField } from "@/components/shared/form-field";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { applyApiError } from "@/lib/form-errors";

const schema = z.object({ reason: z.string().trim().min(10, "Explain in at least 10 characters").max(500) });
type Values = z.infer<typeof schema>;

export interface OverrideRequest {
  clientName: string;
  periodLabel: string;
  /** What is still open, in words (from the checklist, or the server's refusal message). */
  missing: string[];
}

function OverrideForm({ request, pending, onConfirm, onDone }: { request: OverrideRequest; pending: boolean; onConfirm: (reason: string) => Promise<void>; onDone: () => void }) {
  const { register, handleSubmit, setError, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { reason: "" } });
  const onSubmit = handleSubmit(async (v) => {
    try {
      await onConfirm(v.reason);
      onDone();
    } catch (err) {
      applyApiError(err, setError, ["reason"]);
    }
  });
  return (
    <>
      <DialogHeader>
        <DialogTitle>Mark {request.clientName} ready with open items?</DialogTitle>
        <DialogDescription>{request.periodLabel}&apos;s checklist isn&apos;t complete. The reason is recorded with the period and in the audit log, and the admin who closes the month will see it.</DialogDescription>
      </DialogHeader>
      <form id="override-form" onSubmit={onSubmit} className="grid gap-4" noValidate>
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="font-medium">Still open</p>
          <ul className="mt-1 list-disc pl-5">{request.missing.map((m) => <li key={m}>{m}</li>)}</ul>
        </div>
        <FormField id="override-reason" label="Why is this month ready anyway?" error={errors.reason?.message}>
          <Textarea id="override-reason" rows={3} placeholder="Client confirmed no purchases in November; the bill request will be closed next month." aria-invalid={!!errors.reason} {...register("reason")} />
        </FormField>
      </form>
      <DialogFooter>
        <Button variant="outline" onClick={onDone}>Cancel</Button>
        <SubmitButton form="override-form" pending={pending}>Mark ready with reason</SubmitButton>
      </DialogFooter>
    </>
  );
}

/** The month-end readiness exception: open items need a recorded reason (reviewers and admins only). */
export function ReadyOverrideDialog({ request, pending, onConfirm, onClose }: { request: OverrideRequest | null; pending: boolean; onConfirm: (reason: string) => Promise<void>; onClose: () => void }) {
  return (
    <Dialog open={!!request} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">{request && <OverrideForm request={request} pending={pending} onConfirm={onConfirm} onDone={onClose} />}</DialogContent>
    </Dialog>
  );
}
