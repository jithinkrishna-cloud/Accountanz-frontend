"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { FirmProgress, PersonProgress, PersonTaskList, PersonTaskView, ProgressList } from "../types/progress.types";

export const progressService = {
  list: (period?: string) => api<ProgressList>("/admin/progress", { query: { period } }),
  tasks: (id: number, p: { view: PersonTaskView; q?: string; client_id?: number; page: number }) =>
    api<PersonTaskList>(`/admin/progress/${id}/tasks`, { query: { ...p, pageSize: 20 } }),
  firm: (period?: string) => api<FirmProgress>("/admin/progress/firm", { query: { period } }),
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

export const useFirmProgress = (period?: string) =>
  useQuery({ queryKey: ["admin", "progress", "firm", period ?? "current"], queryFn: () => progressService.firm(period), placeholderData: keepPreviousData });

export const usePersonTasks = (id: number, p: { view: PersonTaskView; q?: string; client_id?: number; page: number }) =>
  useQuery({ queryKey: ["admin", "progress", id, "tasks", p], queryFn: () => progressService.tasks(id, p), placeholderData: keepPreviousData });
