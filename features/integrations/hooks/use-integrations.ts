"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { integrationService } from "../services/integration-service";
import type { ConnectionStatus, Provider } from "../types/integration.types";

const KEY = ["admin", "integrations"] as const;

export const useConnections = (params: { q?: string; provider?: Provider; status?: ConnectionStatus; page?: number }) =>
  useQuery({ queryKey: [...KEY, params], queryFn: () => integrationService.list(params), placeholderData: keepPreviousData });
