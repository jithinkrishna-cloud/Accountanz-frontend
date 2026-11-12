"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Undo2 } from "lucide-react";
import { useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { FormField } from "@/components/shared/form-field";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { applyApiError } from "@/lib/form-errors";
import { formatDate, formatPeriod } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useDecideReview } from "../hooks/use-reviews";
import { reviewFormSchema, type ReviewFormValues } from "../schemas/review.schema";
import type { ReviewPortal } from "../services/review-service";
import type { ReviewDecision, ReviewQueueItem } from "../types/review.types";

const OPTIONS: { value: ReviewDecision; label: string; icon: typeof CheckCircle2 }[] = [
  { value: "approved", label: "Approve", icon: CheckCircle2 },
  { value: "returned", label: "Return", icon: Undo2 },
];

export function ReviewDialog({ item, onOpenChange, portal = "admin" }: { item: ReviewQueueItem | null; onOpenChange: (open: boolean) => void; portal?: ReviewPortal }) {
  const decide = useDecideReview(portal);
  const { control, register, handleSubmit, reset, setError, formState: { errors } } = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: { decision: "approved", comments: "" },
  });

  useEffect(() => {
    if (item) reset({ decision: "approved", comments: "" });
  }, [item, reset]);

  const decision = useWatch({ control, name: "decision" });
  if (!item) return null;

  const onSubmit = handleSubmit(async (values) => {
    try {
      await decide.mutateAsync({ taskId: item.task_id, values });
      toast.success(values.decision === "approved" ? "Task approved" : "Task returned to the accountant");
      onOpenChange(false);
    } catch (err) {
      applyApiError(err, setError, ["comments"]);
    }
  });

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item.title}</DialogTitle>
          <DialogDescription>
            {item.client_name} · {formatPeriod(item.period)}
            {item.due_date && ` · due ${formatDate(item.due_date)}`}
          </DialogDescription>
        </DialogHeader>
        <form id="review-form" onSubmit={onSubmit} className="grid gap-4" noValidate>
          <Controller
            control={control}
            name="decision"
            render={({ field }) => (
              <div role="radiogroup" aria-label="Decision" className="bg-muted grid grid-cols-2 gap-1 rounded-lg p-1">
                {OPTIONS.map((o) => {
                  const active = field.value === o.value;
                  return (
                    <button
                      key={o.value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => field.onChange(o.value)}
                      className={cn(
                        "flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        active ? "bg-card shadow-xs" : "text-muted-foreground hover:text-foreground",
                        active && o.value === "returned" && "text-amber-700",
                        active && o.value === "approved" && "text-emerald-700",
                      )}
                    >
                      <o.icon className="size-4" aria-hidden />
                      {o.label}
                    </button>
                  );
                })}
              </div>
            )}
          />
          <FormField
            id="comments"
            label="Comments"
            error={errors.comments?.message}
            hint={decision === "returned" ? "Tell the accountant what to correct." : undefined}
          >
            <Textarea id="comments" rows={4} aria-invalid={!!errors.comments} {...register("comments")} />
          </FormField>
          {item.assignee_email && <p className="text-muted-foreground text-xs">Submitted by {item.assignee_email}</p>}
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <SubmitButton form="review-form" pending={decide.isPending} variant={decision === "returned" ? "outline" : "default"}>
            {decision === "approved" ? "Approve task" : "Return task"}
          </SubmitButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
