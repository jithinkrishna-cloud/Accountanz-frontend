"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { journlPermissionService } from "../services/journl-permission-service";

const KEY = ["admin", "journl-permissions"] as const;

export const useJournlCatalog = (enabled = true) => useQuery({ queryKey: [...KEY, "catalog"], queryFn: journlPermissionService.catalog, enabled, staleTime: 5 * 60_000 });

export const useAssignmentPermissions = (id: number | null) =>
  useQuery({ queryKey: [...KEY, id], queryFn: () => journlPermissionService.forAssignment(id!), enabled: id !== null });

export function useSetModulePermission(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { moduleKey: string; actions: string[] }) => journlPermissionService.setModule(id, v.moduleKey, v.actions),
    onSuccess: (data) => qc.setQueryData([...KEY, id], data),
  });
}
