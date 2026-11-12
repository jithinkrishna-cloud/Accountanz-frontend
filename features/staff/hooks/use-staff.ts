"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { staffService, type StaffUpdate } from "../services/staff-service";
import type { StaffType } from "../types/staff.types";

const KEY = ["admin", "staff"] as const;

export const useStaff = (params: { type: StaffType; q?: string; page?: number }) =>
  useQuery({ queryKey: [...KEY, params], queryFn: () => staffService.list(params), placeholderData: keepPreviousData });

export function useInviteStaff() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: staffService.invite, onSuccess: () => void qc.invalidateQueries({ queryKey: KEY }) });
}

export const useIssueInviteLink = () => useMutation({ mutationFn: staffService.inviteLink });

export function useDeleteStaff() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: staffService.remove, onSuccess: () => void qc.invalidateQueries({ queryKey: KEY }) });
}

export function useUpdateStaff(id: number) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (body: StaffUpdate) => staffService.update(id, body), onSuccess: () => void qc.invalidateQueries({ queryKey: KEY }) });
}
