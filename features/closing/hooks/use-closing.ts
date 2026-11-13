"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { closingService } from "../services/closing-service";
import type { ClosingStatus } from "../types/closing.types";

const KEY = ["admin", "closing"] as const;

export const useClosingGrid = () => useQuery({ queryKey: KEY, queryFn: closingService.grid });

export function useSetClosingStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ clientId, period, status, reason }: { clientId: number; period: string; status: ClosingStatus; reason?: string }) => closingService.setStatus(clientId, period, status, reason),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: KEY });
      void qc.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    },
  });
}
