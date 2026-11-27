"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle } from "lucide-react";
import { useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { FormField } from "@/components/shared/form-field";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAssignmentOptions } from "@/features/assignments/hooks/use-assignments";
import { TEAM_ROLE_LABELS } from "@/features/assignments/types/assignment.types";
import { applyApiError } from "@/lib/form-errors";
import { useAssignStaffGroup, useStaffGroups } from "../hooks/use-staff-groups";

const today = () => new Date().toLocaleDateString("en-CA");

const schema = z
  .object({
    group_id: z.string().min(1, "Choose a group"),
    client_id: z.string().min(1, "Choose a client"),
    valid_from: z.string().min(1, "Choose a start date"),
    valid_to: z.string(),
  })
  .refine((v) => !v.valid_to || v.valid_to >= v.valid_from, { message: "End date can't be before the start date", path: ["valid_to"] });
type Values = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Fixes the group (from the Groups page). */
  groupId?: number;
  /** Pre-selects the client (from Assignments filtered to one client). */
  clientId?: number;
}

/** Assigns every member of a group to a client: one assignment each, with the member's role and JournL setting. */
export function AssignGroupDialog({ open, onOpenChange, groupId, clientId }: Props) {
  const groups = useStaffGroups(open);
  const options = useAssignmentOptions(open);
  const assign = useAssignStaffGroup();
  const defaults = (): Values => ({ group_id: groupId ? String(groupId) : "", client_id: clientId ? String(clientId) : "", valid_from: today(), valid_to: "" });
  const { register, control, handleSubmit, reset, setError, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: defaults() });

  useEffect(() => {
    if (open) reset(defaults());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, groupId, clientId, reset]);

  const selectedId = useWatch({ control, name: "group_id" });
  const group = groups.data?.find((g) => String(g.id) === selectedId);

  const onSubmit = handleSubmit(async (v) => {
    try {
      const r = await assign.mutateAsync({ id: Number(v.group_id), input: { client_id: Number(v.client_id), valid_from: v.valid_from, valid_to: v.valid_to || null } });
      const assigned = `${r.created.length} ${r.created.length === 1 ? "person" : "people"} assigned to ${r.client_name}`;
      if (r.skipped.length) {
        toast.warning(assigned, { description: `Skipped: ${r.skipped.map((s) => `${s.full_name} (${s.reason})`).join("; ")}`, duration: 10000 });
      } else {
        toast.success(assigned);
      }
      onOpenChange(false);
    } catch (err) {
      applyApiError(err, setError, ["client_id", "valid_from", "valid_to"]);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{group && groupId ? `Assign ${group.name}` : "Assign a group"}</DialogTitle>
          <DialogDescription>Each member gets their own assignment on the client. You can still change or end them one by one later.</DialogDescription>
        </DialogHeader>
        <form id="assign-group-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
          {!groupId && (
            <FormField id="group_id" label="Group" error={errors.group_id?.message} className="sm:col-span-2">
              <Controller control={control} name="group_id" render={({ field }) => (
                <Select value={field.value || ""} onValueChange={field.onChange}>
                  <SelectTrigger id="group_id" className="w-full" aria-invalid={!!errors.group_id}>
                    <SelectValue placeholder={groups.isLoading ? "Loading…" : groups.data?.length === 0 ? "No groups yet. Create one in People → Groups." : "Select a group"} />
                  </SelectTrigger>
                  <SelectContent>{groups.data?.map((g) => <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>)}</SelectContent>
                </Select>
              )} />
            </FormField>
          )}
          {group && (
            <ul className="bg-muted/50 grid gap-1 rounded-lg p-3 text-sm sm:col-span-2" aria-label="People who will be assigned">
              {group.members.map((m) => (
                <li key={`${m.user_id}-${m.team_role}`} className={m.assignable ? "" : "text-muted-foreground line-through"}>
                  {m.full_name} · {TEAM_ROLE_LABELS[m.team_role]}
                  {!m.assignable && <span className="ml-1 no-underline">(will be skipped: not verified)</span>}
                </li>
              ))}
            </ul>
          )}
          <FormField id="group-client" label="Client" error={errors.client_id?.message} className="sm:col-span-2">
            <Controller control={control} name="client_id" render={({ field }) => (
              <Select value={field.value || ""} onValueChange={field.onChange}>
                <SelectTrigger id="group-client" className="w-full" aria-invalid={!!errors.client_id}>
                  <SelectValue placeholder={options.isLoading ? "Loading…" : "Select a client"} />
                </SelectTrigger>
                <SelectContent>{options.data?.clients.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            )} />
          </FormField>
          <FormField id="group-from" label="Starts" error={errors.valid_from?.message}>
            <Input id="group-from" type="date" aria-invalid={!!errors.valid_from} {...register("valid_from")} />
          </FormField>
          <FormField id="group-to" label="Ends" hint="Leave empty for no end date." error={errors.valid_to?.message}>
            <Input id="group-to" type="date" aria-invalid={!!errors.valid_to} {...register("valid_to")} />
          </FormField>
          <p className="text-muted-foreground flex gap-1.5 text-xs sm:col-span-2">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            Anyone already in that role on the client is skipped, so nobody is assigned twice.
          </p>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <SubmitButton form="assign-group-form" pending={assign.isPending}>Assign group</SubmitButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
