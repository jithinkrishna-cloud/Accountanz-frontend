"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { teamService } from "../services/team-service";

const KEY = ["admin", "teams"] as const;

export const useTeams = (params: { q?: string; page?: number }) =>
  useQuery({ queryKey: [...KEY, params], queryFn: () => teamService.list(params), placeholderData: keepPreviousData });

/** Clients that don't have a team yet (for the Create team dialog). */
export const useTeamClientOptions = (enabled: boolean) => useQuery({ queryKey: [...KEY, "client-options"], queryFn: teamService.clientOptions, enabled });

export function useCreateTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ clientId, name }: { clientId: number; name: string }) => teamService.create(clientId, name),
    onSuccess: () => void qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useRenameTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ clientId, name }: { clientId: number; name: string }) => teamService.rename(clientId, name),
    onSuccess: () => void qc.invalidateQueries({ queryKey: KEY }),
  });
}
