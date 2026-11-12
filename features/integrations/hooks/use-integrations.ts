"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { integrationService } from "../services/integration-service";
import type { ConnectionStatus, Provider } from "../types/integration.types";

const KEY = ["admin", "integrations"] as const;

export const useConnections = (params: { q?: string; provider?: Provider; status?: ConnectionStatus; page?: number }) =>
  useQuery({ queryKey: [...KEY, params], queryFn: () => integrationService.list(params), placeholderData: keepPreviousData });

export function useCreateConnection() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: integrationService.create, onSuccess: () => void qc.invalidateQueries({ queryKey: KEY }) });
}

export function useHealthCheck() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: integrationService.healthCheck, onSettled: () => void qc.invalidateQueries({ queryKey: KEY }) });
}
