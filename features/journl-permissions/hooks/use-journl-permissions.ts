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
    mutationFn: (v: { moduleKey: string; actions: string[]; grantSource?: "accountanz" | "client" }) => journlPermissionService.setModule(id, v.moduleKey, v.actions, v.grantSource),
    onSuccess: (data) => {
      qc.setQueryData([...KEY, id], data);
      void qc.invalidateQueries({ queryKey: [...KEY, "overview"] });
    },
  });
}

export const useJournlAccessOverview = () => useQuery({ queryKey: [...KEY, "overview"], queryFn: journlPermissionService.overview });

// ── Client-side hooks ──
const CLIENT_KEY = ["app", "journl-permissions"] as const;

export const useClientJournlCatalog = (enabled = true) => useQuery({ queryKey: [...CLIENT_KEY, "catalog"], queryFn: journlPermissionService.clientCatalog, enabled, staleTime: 5 * 60_000 });

export const useClientJournlTeam = () => useQuery({ queryKey: [...CLIENT_KEY, "team"], queryFn: journlPermissionService.clientTeam, staleTime: 5 * 60_000 });

export function useClientSetModulePermission(assignmentId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { moduleKey: string; actions: string[] }) => journlPermissionService.clientSetModule(assignmentId, v.moduleKey, v.actions),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...CLIENT_KEY, "team"] });
    },
  });
}
