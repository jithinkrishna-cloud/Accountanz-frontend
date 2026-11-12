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
import { Textarea } from "@/components/ui/textarea";
import { applyApiError } from "@/lib/form-errors";
import { useSaveTemplateItem } from "../hooks/use-task-templates";
import { itemFormSchema, type ItemFormOutput, type ItemFormValues } from "../schemas/task.schema";
import type { TaskTemplateItem } from "../types/task.types";

interface Props {
  templateId: number;
  /** undefined = closed, null = new item, otherwise the item being edited. */
  item: TaskTemplateItem | null | undefined;
  onClose: () => void;
}

export function TemplateItemDialog({ templateId, item, onClose }: Props) {
  const open = item !== undefined;
  const save = useSaveTemplateItem(templateId, item?.id);
  const { register, control, handleSubmit, reset, setError, formState: { errors } } = useForm<ItemFormValues, unknown, ItemFormOutput>({
    resolver: zodResolver(itemFormSchema),
  });

  useEffect(() => {
    if (open) reset({ title: item?.title ?? "", checklist: item?.checklist.join("\n") ?? "", client_visible: item?.client_visible ?? true });
  }, [open, item, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      await save.mutateAsync(values);
      toast.success(item ? "Item updated" : "Item added");
      onClose();
    } catch (err) {
      applyApiError(err, setError, ["title", "checklist", "client_visible"]);
    }
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item ? "Edit item" : "New item"}</DialogTitle>
          <DialogDescription>Each item becomes one task when the period is generated.</DialogDescription>
        </DialogHeader>
        <form id="item-form" onSubmit={onSubmit} className="grid gap-4" noValidate>
          <FormField id="title" label="Title" error={errors.title?.message}>
            <Input id="title" autoFocus aria-invalid={!!errors.title} {...register("title")} />
          </FormField>
          <FormField id="checklist" label="Checklist" error={errors.checklist?.message} hint="One point per line.">
            <Textarea id="checklist" rows={5} aria-invalid={!!errors.checklist} {...register("checklist")} />
          </FormField>
          <Controller control={control} name="client_visible" render={({ field }) => (
            <Label className="flex items-center gap-2 font-normal">
              <Checkbox checked={field.value} onCheckedChange={(c) => field.onChange(c === true)} />
              Visible in the client portal
            </Label>
          )} />
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <SubmitButton form="item-form" pending={save.isPending}>Save item</SubmitButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
