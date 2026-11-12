"use client";

import { zodResolver } from "@hookform/resolvers/zod";
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
import { applyApiError } from "@/lib/form-errors";
import { useCreateTeam, useTeamClientOptions } from "../hooks/use-teams";

const schema = z.object({
  client_id: z.string().min(1, "Pick a client"),
  name: z.string().trim().max(150).refine((v) => v === "" || v.length >= 2, "Enter at least 2 characters"),
});
type Values = z.infer<typeof schema>;

export function CreateTeamDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const clients = useTeamClientOptions(open);
  const create = useCreateTeam();
  const { register, control, handleSubmit, reset, setError, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { client_id: "", name: "" },
  });
  const clientId = useWatch({ control, name: "client_id" });
  const clientName = clients.data?.find((c) => String(c.id) === clientId)?.name;

  useEffect(() => {
    if (open) reset({ client_id: "", name: "" });
  }, [open, reset]);

  const onSubmit = handleSubmit(async (v) => {
    try {
      const team = await create.mutateAsync({ clientId: Number(v.client_id), name: v.name });
      toast.success(`${team.team_name} created`);
      onOpenChange(false);
    } catch (err) {
      applyApiError(err, setError, ["client_id", "name"]);
    }
  });

  const count = clients.data?.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create a team</DialogTitle>
          <DialogDescription>{count === undefined ? "Loading clients…" : `Clients without a team: ${count}`}</DialogDescription>
        </DialogHeader>
        <form id="create-team-form" onSubmit={onSubmit} className="grid gap-4" noValidate>
          <FormField id="client_id" label="Client" error={errors.client_id?.message}>
            <Controller control={control} name="client_id" render={({ field }) => (
              <Select value={field.value || undefined} onValueChange={field.onChange} disabled={!count}>
                <SelectTrigger id="client_id" className="w-full" aria-invalid={!!errors.client_id}>
                  <SelectValue placeholder={count === 0 ? "Every client already has a team" : "Select a client"} />
                </SelectTrigger>
                <SelectContent>{clients.data?.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            )} />
          </FormField>
          <FormField id="name" label="Team name" error={errors.name?.message} hint="Defaults to the client name plus Team.">
            <Input id="name" maxLength={150} placeholder={clientName ? `${clientName} Team` : undefined} {...register("name")} />
          </FormField>
          <p className="text-muted-foreground text-xs">Members come from assignments: everyone with an active assignment on the client appears in the team.</p>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <SubmitButton form="create-team-form" pending={create.isPending} disabled={!count}>Create team</SubmitButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
