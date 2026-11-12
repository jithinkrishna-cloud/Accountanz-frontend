"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ItemFormOutput, TemplateFormOutput } from "../schemas/task.schema";
import { templateService } from "../services/task-service";

const KEY = ["admin", "task-templates"] as const;

export const useTaskTemplates = () => useQuery({ queryKey: KEY, queryFn: templateService.list });

function useInvalidate() {
  const qc = useQueryClient();
  return () => void qc.invalidateQueries({ queryKey: KEY });
}

export function useCreateTemplate() {
  const onSuccess = useInvalidate();
  return useMutation({ mutationFn: (v: TemplateFormOutput) => templateService.create(v), onSuccess });
}

/** Adds an item to `templateId`, or updates `itemId` when editing. */
export function useSaveTemplateItem(templateId: number, itemId?: number) {
  const onSuccess = useInvalidate();
  return useMutation({
    mutationFn: (v: ItemFormOutput) => (itemId ? templateService.updateItem(itemId, v) : templateService.addItem(templateId, v)),
    onSuccess,
  });
}

export function useDeleteTemplateItem() {
  const onSuccess = useInvalidate();
  return useMutation({ mutationFn: templateService.deleteItem, onSuccess });
}
