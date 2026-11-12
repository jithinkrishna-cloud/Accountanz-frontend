"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { FormField } from "@/components/shared/form-field";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { applyApiError } from "@/lib/form-errors";
import { clientService, type BranchBody } from "../services/client-service";
import type { ClientBranch, ClientDetail } from "../types/client.types";

// Mirrors backend branchBodySchema.
const schema = z.object({
  name: z.string().trim().min(2, "Enter the branch name").max(150),
  gstin: z
    .string()
    .trim()
    .transform((v) => v.toUpperCase())
    .refine((v) => v === "" || /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(v), "Enter a valid 15-character GSTIN"),
  external_branch_ref: z.string().trim().max(60),
});
type Values = z.infer<typeof schema>;

const toBody = (v: Values): BranchBody => ({ name: v.name, gstin: v.gstin || null, external_branch_ref: v.external_branch_ref || null });

function useStoreClient(clientId: number) {
  const qc = useQueryClient();
  return (client: ClientDetail) => qc.setQueryData(["admin", "clients", "detail", clientId], client);
}

function BranchForm({ clientId, branch, onDone }: { clientId: number; branch: ClientBranch | null; onDone: () => void }) {
  const store = useStoreClient(clientId);
  const save = useMutation({
    mutationFn: (v: Values) => (branch ? clientService.updateBranch(clientId, branch.id, toBody(v)) : clientService.addBranch(clientId, toBody(v))),
    onSuccess: store,
  });
  const { register, handleSubmit, setError, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: branch?.name ?? "", gstin: branch?.gstin ?? "", external_branch_ref: branch?.external_branch_ref ?? "" },
  });

  const onSubmit = handleSubmit(async (v) => {
    try {
      await save.mutateAsync(v);
      toast.success(branch ? "Branch updated" : `${v.name} added`);
      onDone();
    } catch (err) {
      applyApiError(err, setError, ["name", "gstin", "external_branch_ref"]);
    }
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle>{branch ? "Edit branch" : "Add branch"}</DialogTitle>
        <DialogDescription>An additional place of business. Branches in another state have their own GSTIN; same-state branches can share the company&apos;s.</DialogDescription>
      </DialogHeader>
      <form id="branch-form" onSubmit={onSubmit} className="grid gap-4" noValidate>
        <FormField id="branch-name" label="Branch name" error={errors.name?.message}>
          <Input id="branch-name" autoFocus placeholder="Kochi warehouse" aria-invalid={!!errors.name} {...register("name")} />
        </FormField>
        <FormField id="branch-gstin" label="GSTIN" hint="Optional" error={errors.gstin?.message}>
          <Input id="branch-gstin" className="font-mono uppercase" maxLength={15} aria-invalid={!!errors.gstin} {...register("gstin")} />
        </FormField>
        <FormField id="branch-ref" label="Accounting software branch reference" hint="Optional: the branch's code in the client's accounting software." error={errors.external_branch_ref?.message}>
          <Input id="branch-ref" {...register("external_branch_ref")} />
        </FormField>
      </form>
      <DialogFooter>
        <Button variant="outline" onClick={onDone}>Cancel</Button>
        <SubmitButton form="branch-form" pending={save.isPending}>{branch ? "Save" : "Add branch"}</SubmitButton>
      </DialogFooter>
    </>
  );
}

/** `branch` undefined = closed, null = adding, a branch = editing. */
export function BranchDialog({ clientId, branch, onClose }: { clientId: number; branch: ClientBranch | null | undefined; onClose: () => void }) {
  const open = branch !== undefined;
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">{open && <BranchForm clientId={clientId} branch={branch} onDone={onClose} />}</DialogContent>
    </Dialog>
  );
}

export function RemoveBranchDialog({ clientId, branch, onClose }: { clientId: number; branch: ClientBranch | null; onClose: () => void }) {
  const store = useStoreClient(clientId);
  const remove = useMutation({ mutationFn: (id: number) => clientService.removeBranch(clientId, id), onSuccess: store });
  if (!branch) return null;

  const confirm = async () => {
    try {
      await remove.mutateAsync(branch.id);
      toast.success(`${branch.name} removed`);
      onClose();
    } catch (err) {
      applyApiError(err);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Remove {branch.name}?</DialogTitle>
          <DialogDescription>The branch is removed from this client. The change is recorded in the audit log.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <SubmitButton variant="destructive" pending={remove.isPending} onClick={() => void confirm()}>Remove</SubmitButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
