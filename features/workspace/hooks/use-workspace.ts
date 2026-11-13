"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { StaffPortal } from "@/types/auth";
import { workspaceService } from "../services/workspace-service";

const KEY = ["team", "workspace"] as const;

export const useWorkspaceDashboard = () => useQuery({ queryKey: [...KEY, "dashboard"], queryFn: workspaceService.dashboard });
export const useMyClients = () => useQuery({ queryKey: [...KEY, "clients"], queryFn: workspaceService.clients });
export const useClientOverview = (id: number | null, portal: StaffPortal = "team") =>
  useQuery({ queryKey: [portal, "workspace", "client", id], queryFn: () => workspaceService.client(id!, portal), enabled: id !== null });
export const useChecklist = (period?: string) => useQuery({ queryKey: [...KEY, "closing", period ?? "current"], queryFn: () => workspaceService.checklist(period) });

/** Pickers in shared delivery screens: only clients this user can act on. */
export const useStaffClientOptions = (portal: StaffPortal) =>
  useQuery({ queryKey: [portal, "client-options"], queryFn: () => workspaceService.clientOptions(portal), staleTime: 60_000 });

export function useSetReadiness() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { clientId: number; period: string; status: "open" | "ready"; reason?: string }) => workspaceService.setReadiness(v.clientId, v.period, v.status, v.reason),
    onSuccess: () => void qc.invalidateQueries({ queryKey: KEY }),
  });
}
