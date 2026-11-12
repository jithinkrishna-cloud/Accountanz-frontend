"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { FormField } from "@/components/shared/form-field";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ROLE_LABELS } from "@/lib/constants";
import { applyApiError } from "@/lib/form-errors";
import type { PortalRole } from "@/types/auth";
import { useAssignmentOptions, useCreateAssignment } from "../hooks/use-assignments";
import { assignmentFormSchema, type AssignmentFormOutput, type AssignmentFormValues } from "../schemas/assignment.schema";
import { TEAM_ROLE_LABELS, TEAM_ROLES, type Assignment } from "../types/assignment.types";

const today = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD in local time

const toValues = (replacing?: Assignment, clientId?: number): AssignmentFormValues => ({
  client_id: replacing ? String(replacing.client_id) : clientId ? String(clientId) : "",
  user_id: "",
  team_role: replacing?.team_role ?? "",
  valid_from: today(),
  valid_to: "",
  journl_access: replacing?.journl_access ?? false,
});

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Hand-over mode: the new person takes this assignment's client and role, and it ends. */
  replacing?: Assignment;
  /** Pre-selects the client (e.g. when the list is filtered to one client). */
  clientId?: number;
}

export function AssignmentFormDialog({ open, onOpenChange, replacing, clientId }: Props) {
  const create = useCreateAssignment();
  const options = useAssignmentOptions(open);
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<AssignmentFormValues, unknown, AssignmentFormOutput>({ resolver: zodResolver(assignmentFormSchema), defaultValues: toValues(replacing, clientId) });

  useEffect(() => {
    if (open) reset(toValues(replacing, clientId));
  }, [open, replacing, clientId, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      await create.mutateAsync({ ...values, replaces_id: replacing?.id });
      toast.success(replacing ? "Handed over. The previous assignment has ended." : "Assignment created");
      onOpenChange(false);
    } catch (err) {
      applyApiError(err, setError, Object.keys(values));
    }
  });

  const staff = options.data?.staff.filter((s) => s.user_id !== replacing?.user_id) ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{replacing ? "Hand over assignment" : "New assignment"}</DialogTitle>
          <DialogDescription>
            {replacing
              ? `${replacing.full_name}'s ${TEAM_ROLE_LABELS[replacing.team_role].toLowerCase()} role on ${replacing.client_name} ends today and moves to the person you choose.`
              : "Gives an accountant access to a client for the dates you set."}
          </DialogDescription>
        </DialogHeader>
        <form id="assignment-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
          {!replacing && (
            <FormField id="client_id" label="Client" error={errors.client_id?.message} className="sm:col-span-2">
              <Controller
                control={control}
                name="client_id"
                render={({ field }) => (
                  <Select value={field.value || undefined} onValueChange={field.onChange}>
                    <SelectTrigger id="client_id" className="w-full" aria-invalid={!!errors.client_id}>
                      <SelectValue placeholder={options.isLoading ? "Loading…" : "Select a client"} />
                    </SelectTrigger>
                    <SelectContent>
                      {options.data?.clients.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
          )}
          <FormField id="user_id" label={replacing ? "New person" : "Accountant"} error={errors.user_id?.message} className={replacing ? "sm:col-span-2" : undefined}>
            <Controller
              control={control}
              name="user_id"
              render={({ field }) => (
                <Select value={field.value || undefined} onValueChange={field.onChange}>
                  <SelectTrigger id="user_id" className="w-full" aria-invalid={!!errors.user_id}>
                    <SelectValue placeholder={options.isLoading ? "Loading…" : "Select a person"} />
                  </SelectTrigger>
                  <SelectContent>
                    {staff.map((s) => {
                      const verified = s.verification_status === "verified";
                      return (
                        <SelectItem key={s.user_id} value={String(s.user_id)} disabled={!verified}>
                          {s.full_name} · {ROLE_LABELS[s.portal_role as PortalRole] ?? s.portal_role}
                          {!verified && " · not verified"}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          {!replacing && (
            <FormField id="team_role" label="Team role" error={errors.team_role?.message}>
              <Controller
                control={control}
                name="team_role"
                render={({ field }) => (
                  <Select value={field.value || undefined} onValueChange={field.onChange}>
                    <SelectTrigger id="team_role" className="w-full" aria-invalid={!!errors.team_role}><SelectValue placeholder="Select a role" /></SelectTrigger>
                    <SelectContent>
                      {TEAM_ROLES.map((r) => <SelectItem key={r} value={r}>{TEAM_ROLE_LABELS[r]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
          )}
          <FormField id="valid_from" label="Starts" error={errors.valid_from?.message}>
            <Input id="valid_from" type="date" aria-invalid={!!errors.valid_from} {...register("valid_from")} />
          </FormField>
          <FormField id="valid_to" label="Ends" error={errors.valid_to?.message} hint="Leave empty for no end date.">
            <Input id="valid_to" type="date" aria-invalid={!!errors.valid_to} {...register("valid_to")} />
          </FormField>
          <Controller
            control={control}
            name="journl_access"
            render={({ field }) => (
              <div className="flex items-start gap-3 rounded-lg border p-3 sm:col-span-2">
                <Checkbox id="journl_access" checked={field.value} onCheckedChange={(v) => field.onChange(v === true)} className="mt-0.5" />
                <div className="grid gap-0.5">
                  <Label htmlFor="journl_access">JournL access</Label>
                  <p className="text-muted-foreground text-xs">This person also needs a login to the client&apos;s books in JournL.</p>
                </div>
              </div>
            )}
          />
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <SubmitButton form="assignment-form" pending={create.isPending}>{replacing ? "Hand over" : "Assign"}</SubmitButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
