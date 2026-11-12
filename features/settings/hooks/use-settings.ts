"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { settingsService } from "../services/settings-service";

const KEY = ["admin", "settings"] as const;

export const useSettings = () => useQuery({ queryKey: KEY, queryFn: settingsService.get });

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: settingsService.update, onSuccess: (data) => qc.setQueryData(KEY, data) });
}
