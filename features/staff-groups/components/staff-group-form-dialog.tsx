"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronsUpDown, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
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
import { StaffPicker } from "@/features/assignments/components/staff-picker";
import { Textarea } from "@/components/ui/textarea";
import { useAssignmentOptions } from "@/features/assignments/hooks/use-assignments";
import { TEAM_ROLE_LABELS, TEAM_ROLES, type TeamRole } from "@/features/assignments/types/assignment.types";
import { applyApiError } from "@/lib/form-errors";
import { useSaveStaffGroup } from "../hooks/use-staff-groups";
import type { StaffGroup } from "../services/staff-group-service";
import { JOURNL_INTEGRATION } from "@/lib/features";

// Mirrors backend staffGroupBodySchema.
const schema = z.object({
  name: z.string().trim().min(2, "Enter a group name").max(150),
  description: z.string().trim().max(500),
  members: z
    .array(
      z.object({
        user_id: z.string().min(1, "Choose a person"),
        team_role: z.string().refine((v) => (TEAM_ROLES as readonly string[]).includes(v), "Choose a role"),
        journl_access: z.boolean(),
      }),
    )
    .min(1, "Add at least one member")
    .refine((ms) => new Set(ms.map((m) => `${m.user_id}:${m.team_role}`)).size === ms.length, "The same person is listed twice in the same role"),
});
type Values = z.infer<typeof schema>;

const blank: Values["members"][number] = { user_id: "", team_role: "", journl_access: false };

const toValues = (g?: StaffGroup | null): Values => ({
  name: g?.name ?? "",
  description: g?.description ?? "",
  members: g?.members.length ? g.members.map((m) => ({ user_id: String(m.user_id), team_role: m.team_role, journl_access: m.journl_access })) : [{ ...blank }],
});

/** Creates a group, or edits one (`group`). Editing never changes assignments already made from the group. */
export function StaffGroupFormDialog({ open, onOpenChange, group }: { open: boolean; onOpenChange: (open: boolean) => void; group?: StaffGroup | null }) {
  const save = useSaveStaffGroup(group?.id);
  const options = useAssignmentOptions(open);
  const { register, control, handleSubmit, reset, setError, setValue, getValues, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: toValues(group),
  });
  const members = useFieldArray({ control, name: "members" });
  const memberValues = useWatch({ control, name: "members" });
  // Row whose person picker is open (one at a time keeps the dialog short).
  const [picking, setPicking] = useState<number | null>(null);

  useEffect(() => {
    if (open) reset(toValues(group));
  }, [open, group, reset]);

  const close = (next: boolean) => {
    if (!next) setPicking(null);
    onOpenChange(next);
  };

  const staff = options.data?.staff ?? [];

  const onSubmit = handleSubmit(async (v) => {
    try {
      const saved = await save.mutateAsync({
        name: v.name,
        description: v.description || null,
        members: v.members.map((m) => ({ user_id: Number(m.user_id), team_role: m.team_role as TeamRole, journl_access: m.journl_access })),
      });
      toast.success(group ? `${saved.name} saved` : `${saved.name} created`);
      close(false);
    } catch (err) {
      applyApiError(err, setError, ["name", "description", "members"]);
    }
  });

  const membersError = errors.members?.message ?? errors.members?.root?.message;

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{group ? "Edit group" : "New group"}</DialogTitle>
          <DialogDescription>
            {group
              ? "Changes apply the next time you assign this group. Clients it's already assigned to keep their current people."
              : "A reusable set of people and roles. Assign it to a client to give everyone access in one step."}
          </DialogDescription>
        </DialogHeader>
        <form id="staff-group-form" onSubmit={onSubmit} className="grid gap-4" noValidate>
          <FormField id="group-name" label="Group name" error={errors.name?.message}>
            <Input id="group-name" maxLength={150} placeholder="e.g. Team A" aria-invalid={!!errors.name} {...register("name")} />
          </FormField>
          <FormField id="group-description" label="Description" hint="Optional. For example, who this group usually handles." error={errors.description?.message}>
            <Textarea id="group-description" rows={2} maxLength={500} {...register("description")} />
          </FormField>

          <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm font-medium">Members</legend>
            {members.fields.map((f, i) => {
              const rowErr = errors.members?.[i];
              // A blank row shows its picker straight away; a filled one opens it on "Change". An open picker takes the full row.
              const pickerOpen = !options.isLoading && (picking === i || (picking === null && !memberValues?.[i]?.user_id));
              return (
                <div key={f.id} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[minmax(0,1fr)_11rem_auto_auto] sm:items-start">
                  <div className={pickerOpen ? "grid min-w-0 gap-1 sm:col-span-full" : "grid min-w-0 gap-1"}>
                    <Controller control={control} name={`members.${i}.user_id`} render={({ field }) => {
                      const chosen = staff.find((s) => String(s.user_id) === field.value);
                      return pickerOpen ? (
                        // Same searchable picker as New assignment: name, role, skills and current client load.
                        <StaffPicker
                          id={`member-${i}`}
                          staff={staff}
                          value={field.value}
                          invalid={!!rowErr?.user_id}
                          onChange={(v) => {
                            field.onChange(v);
                            setPicking(null);
                            // Start the role at the person's own role; still changeable.
                            const p = staff.find((s) => String(s.user_id) === v);
                            if (p && !getValues(`members.${i}.team_role`) && (TEAM_ROLES as readonly string[]).includes(p.portal_role)) {
                              setValue(`members.${i}.team_role`, p.portal_role as TeamRole);
                            }
                          }}
                        />
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full justify-between font-normal"
                          aria-label={chosen ? `Member ${i + 1}: ${chosen.full_name}. Change` : `Member ${i + 1}: choose a person`}
                          aria-invalid={!!rowErr?.user_id}
                          onClick={() => setPicking(i)}
                          disabled={options.isLoading}
                        >
                          <span className={chosen ? "truncate" : "text-muted-foreground"}>
                            {options.isLoading ? "Loading…" : chosen?.full_name ?? "Choose a person"}
                          </span>
                          <ChevronsUpDown className="size-4 opacity-50" aria-hidden />
                        </Button>
                      );
                    }} />
                    {rowErr?.user_id && <p className="text-destructive text-xs">{rowErr.user_id.message}</p>}
                  </div>
                  <div className="grid gap-1">
                    <Controller control={control} name={`members.${i}.team_role`} render={({ field }) => (
                      <Select value={field.value || undefined} onValueChange={field.onChange}>
                        <SelectTrigger className="w-full" aria-label={`Role for member ${i + 1}`} aria-invalid={!!rowErr?.team_role}>
                          <SelectValue placeholder="Role" />
                        </SelectTrigger>
                        <SelectContent>{TEAM_ROLES.map((r) => <SelectItem key={r} value={r}>{TEAM_ROLE_LABELS[r]}</SelectItem>)}</SelectContent>
                      </Select>
                    )} />
                    {rowErr?.team_role && <p className="text-destructive text-xs">{rowErr.team_role.message}</p>}
                  </div>
                  {!JOURNL_INTEGRATION ? <span aria-hidden /> : <Controller control={control} name={`members.${i}.journl_access`} render={({ field }) => (
                    <div className="flex h-9 items-center gap-2">
                      <Checkbox id={`member-journl-${i}`} checked={field.value} onCheckedChange={(c) => field.onChange(c === true)} />
                      <Label htmlFor={`member-journl-${i}`} className="font-normal">JournL</Label>
                    </div>
                  )} />}
                  <Button type="button" variant="ghost" size="icon" onClick={() => { members.remove(i); setPicking(null); }} disabled={members.fields.length === 1} aria-label={`Remove member ${i + 1}`}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              );
            })}
            {membersError && <p role="alert" className="text-destructive text-xs">{membersError}</p>}
            <Button type="button" variant="outline" size="sm" className="justify-self-start" onClick={() => { members.append({ ...blank }); setPicking(null); }}>
              <Plus className="size-4" /> Add member
            </Button>
          </fieldset>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => close(false)}>Cancel</Button>
          <SubmitButton form="staff-group-form" pending={save.isPending}>{group ? "Save group" : "Create group"}</SubmitButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
