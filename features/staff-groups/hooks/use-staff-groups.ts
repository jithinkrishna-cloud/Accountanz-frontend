"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { staffGroupService, type AssignGroupInput, type StaffGroupInput } from "../services/staff-group-service";

const KEY = ["admin", "staff-groups"] as const;

export const useStaffGroups = (enabled = true) => useQuery({ queryKey: KEY, queryFn: staffGroupService.list, enabled });

export function useSaveStaffGroup(id?: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: StaffGroupInput) => (id ? staffGroupService.update(id, input) : staffGroupService.create(input)),
    onSuccess: () => void qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteStaffGroup() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: number) => staffGroupService.remove(id), onSuccess: () => void qc.invalidateQueries({ queryKey: KEY }) });
}

/** Assigning creates real assignments, so everything built on them refreshes too. */
export function useAssignStaffGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: AssignGroupInput }) => staffGroupService.assign(id, input),
    onSuccess: () => {
      for (const key of [KEY, ["admin", "assignments"], ["admin", "teams"], ["admin", "clients"], ["admin", "staff"]]) void qc.invalidateQueries({ queryKey: key });
    },
  });
}
