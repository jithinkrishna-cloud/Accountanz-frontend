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
import { applyApiError } from "@/lib/form-errors";
import { formatDate } from "@/lib/format";
import { useUpdateAssignment } from "../hooks/use-assignments";
import { assignmentEditSchema, type AssignmentEditOutput, type AssignmentEditValues } from "../schemas/assignment.schema";
import { TEAM_ROLE_LABELS, type Assignment } from "../types/assignment.types";

const toValues = (a: Assignment): AssignmentEditValues => ({ valid_to: a.valid_to ?? "", journl_access: a.journl_access });

export function AssignmentEditDialog({ assignment, onOpenChange }: { assignment: Assignment | null; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={!!assignment} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">{assignment && <EditForm key={assignment.id} assignment={assignment} onDone={() => onOpenChange(false)} />}</DialogContent>
    </Dialog>
  );
}

function EditForm({ assignment, onDone }: { assignment: Assignment; onDone: () => void }) {
  const update = useUpdateAssignment(assignment.id);
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<AssignmentEditValues, unknown, AssignmentEditOutput>({ resolver: zodResolver(assignmentEditSchema), defaultValues: toValues(assignment) });

  useEffect(() => reset(toValues(assignment)), [assignment, reset]);

  const onSubmit = handleSubmit(async (values) => {
    if (values.valid_to && values.valid_to < assignment.valid_from) {
      setError("valid_to", { message: "End date can't be before the start date" });
      return;
    }
    try {
      await update.mutateAsync(values);
      toast.success("Assignment updated");
      onDone();
    } catch (err) {
      applyApiError(err, setError, Object.keys(values));
    }
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle>Edit assignment</DialogTitle>
        <DialogDescription>
          {assignment.full_name} · {TEAM_ROLE_LABELS[assignment.team_role]} on {assignment.client_name}, from {formatDate(assignment.valid_from)}
        </DialogDescription>
      </DialogHeader>
      <form id="assignment-edit-form" onSubmit={onSubmit} className="grid gap-4" noValidate>
        <FormField id="edit_valid_to" label="Ends" error={errors.valid_to?.message} hint="Leave empty for no end date. Access stops after this day.">
          <Input id="edit_valid_to" type="date" min={assignment.valid_from} aria-invalid={!!errors.valid_to} {...register("valid_to")} />
        </FormField>
        <Controller
          control={control}
          name="journl_access"
          render={({ field }) => (
            <div className="flex items-center gap-3">
              <Checkbox id="edit_journl_access" checked={field.value} onCheckedChange={(v) => field.onChange(v === true)} />
              <Label htmlFor="edit_journl_access">JournL access</Label>
            </div>
          )}
        />
      </form>
      <DialogFooter>
        <Button variant="outline" onClick={onDone}>Cancel</Button>
        <SubmitButton form="assignment-edit-form" pending={update.isPending}>Save changes</SubmitButton>
      </DialogFooter>
    </>
  );
}
