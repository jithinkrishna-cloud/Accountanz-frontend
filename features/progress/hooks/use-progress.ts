"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { PersonProgress, ProgressList } from "../types/progress.types";

export const progressService = {
  list: (period?: string) => api<ProgressList>("/admin/progress", { query: { period } }),
  person: (id: number, period?: string) => api<PersonProgress>(`/admin/progress/${id}`, { query: { period } }),
};

export const useProgressList = (period?: string) =>
  useQuery({ queryKey: ["admin", "progress", period ?? "current"], queryFn: () => progressService.list(period), placeholderData: keepPreviousData });

export const usePersonProgress = (id: number, period?: string) =>
  useQuery({
    queryKey: ["admin", "progress", id, period ?? "current"],
    queryFn: () => progressService.person(id, period),
    placeholderData: keepPreviousData,
    enabled: Number.isInteger(id) && id > 0,
  });
