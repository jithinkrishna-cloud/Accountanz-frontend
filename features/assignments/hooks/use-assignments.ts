"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import type { AssignmentEditOutput, AssignmentFormOutput } from "../schemas/assignment.schema";
import { assignmentService, type AssignmentListParams } from "../services/assignment-service";

const KEY = ["admin", "assignments"] as const;

export const useAssignments = (params: AssignmentListParams) =>
  useQuery({ queryKey: [...KEY, "list", params], queryFn: () => assignmentService.list(params), placeholderData: keepPreviousData });

export const useAssignmentOptions = (enabled = true) => useQuery({ queryKey: [...KEY, "options"], queryFn: assignmentService.options, enabled });

/** Assignments drive teams, client detail ("today's team") and staff client counts. */
function afterChange(qc: QueryClient) {
  void qc.invalidateQueries({ queryKey: [...KEY, "list"] });
  void qc.invalidateQueries({ queryKey: ["admin", "teams"] });
  void qc.invalidateQueries({ queryKey: ["admin", "clients"] });
  void qc.invalidateQueries({ queryKey: ["admin", "staff"] });
}

export function useCreateAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (values: AssignmentFormOutput & { replaces_id?: number }) => assignmentService.create(values),
    onSuccess: () => afterChange(qc),
  });
}

export function useUpdateAssignment(id: number) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (values: AssignmentEditOutput) => assignmentService.update(id, values), onSuccess: () => afterChange(qc) });
}

export function useEndAssignment() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: number) => assignmentService.end(id), onSuccess: () => afterChange(qc) });
}
