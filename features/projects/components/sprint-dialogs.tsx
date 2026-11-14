"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FormField } from "@/components/shared/form-field";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { applyApiError } from "@/lib/form-errors";
import { useCompleteSprint, useSprints, useUpdateSprint } from "../hooks/use-projects";
import type { Sprint } from "../types/project.types";

const isoDay = (offsetDays: number) => new Date(Date.now() + offsetDays * 864e5).toISOString().slice(0, 10);

/** Edit name, goal and dates. Starting a sprint needs both dates, so "Start" opens this first when they are missing. */
export function SprintFormDialog({ spaceKey, sprint, onClose, onSaved }: { spaceKey: string; sprint: Sprint | null; onClose: () => void; onSaved?: (s: Sprint) => void }) {
  return (
    <Dialog open={!!sprint} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">{sprint && <SprintForm spaceKey={spaceKey} sprint={sprint} onClose={onClose} onSaved={onSaved} />}</DialogContent>
    </Dialog>
  );
}

function SprintForm({ spaceKey, sprint, onClose, onSaved }: { spaceKey: string; sprint: Sprint; onClose: () => void; onSaved?: (s: Sprint) => void }) {
  const update = useUpdateSprint(spaceKey);
  const [name, setName] = useState(sprint.name);
  const [goal, setGoal] = useState(sprint.goal ?? "");
  // Default: a two-week sprint starting today.
  const [start, setStart] = useState(() => sprint.start_date ?? isoDay(0));
  const [end, setEnd] = useState(() => sprint.end_date ?? isoDay(13));
  const save = async () => {
    try {
      const s = await update.mutateAsync({ id: sprint.id, name: name.trim(), goal: goal.trim() || null, start_date: start || null, end_date: end || null });
      onSaved?.(s);
      onClose();
    } catch (err) {
      applyApiError(err);
    }
  };
  return (
    <>
      <DialogHeader>
        <DialogTitle>Edit sprint</DialogTitle>
        <DialogDescription>Sprints need a start and end date before they can start.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4">
        <FormField id="sprint-name" label="Name *">
          <Input id="sprint-name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField id="sprint-start" label="Start date">
            <Input id="sprint-start" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </FormField>
          <FormField id="sprint-end" label="End date">
            <Input id="sprint-end" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          </FormField>
        </div>
        <FormField id="sprint-goal" label="Sprint goal">
          <Textarea id="sprint-goal" rows={2} value={goal} maxLength={500} onChange={(e) => setGoal(e.target.value)} />
        </FormField>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <SubmitButton pending={update.isPending} disabled={!name.trim()} onClick={() => void save()}>Save</SubmitButton>
      </DialogFooter>
    </>
  );
}

/** Complete the active sprint; unfinished items go to the backlog or a planned sprint. */
export function CompleteSprintDialog({ spaceKey, sprint, onClose }: { spaceKey: string; sprint: Sprint | null; onClose: () => void }) {
  const sprints = useSprints(spaceKey);
  const complete = useCompleteSprint(spaceKey);
  const [target, setTarget] = useState("backlog");
  const planned = (sprints.data ?? []).filter((s) => s.status === "planned");
  const open = sprint ? sprint.item_count - sprint.done_count : 0;
  return (
    <Dialog open={!!sprint} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        {sprint && (
          <>
            <DialogHeader>
              <DialogTitle>Complete {sprint.name}?</DialogTitle>
              <DialogDescription>
                {sprint.done_count} of {sprint.item_count} work items are done.
                {open > 0 ? ` Choose where the ${open} unfinished item${open === 1 ? "" : "s"} should go.` : ""}
              </DialogDescription>
            </DialogHeader>
            {open > 0 && (
              <FormField id="move-to" label="Move open work items to">
                <Select value={target} onValueChange={setTarget}>
                  <SelectTrigger id="move-to" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="backlog">Backlog</SelectItem>
                    {planned.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormField>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <SubmitButton
                pending={complete.isPending}
                onClick={() =>
                  void complete
                    .mutateAsync({ id: sprint.id, moveTo: target === "backlog" ? null : Number(target) })
                    .then(() => (toast.success(`${sprint.name} completed`), onClose()))
                    .catch((e) => applyApiError(e))
                }
              >
                Complete sprint
              </SubmitButton>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
