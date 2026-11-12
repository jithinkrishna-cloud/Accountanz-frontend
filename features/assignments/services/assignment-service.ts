import { api, type Paged } from "@/lib/api-client";
import type { AssignmentEditOutput, AssignmentFormOutput } from "../schemas/assignment.schema";
import type { Assignment, AssignmentOptions, AssignmentStatus, TeamRole } from "../types/assignment.types";

export interface AssignmentListParams {
  q?: string;
  status?: AssignmentStatus;
  team_role?: TeamRole;
  clientId?: number;
  page?: number;
}

export const assignmentService = {
  list: (params: AssignmentListParams) => api<Paged<Assignment>>("/admin/assignments", { query: { ...params } }),
  options: () => api<AssignmentOptions>("/admin/assignments/options"),
  create: (values: AssignmentFormOutput & { replaces_id?: number }) => api<Assignment>("/admin/assignments", { method: "POST", body: values }),
  update: (id: number, values: AssignmentEditOutput) => api<Assignment>(`/admin/assignments/${id}`, { method: "PATCH", body: values }),
  end: (id: number) => api<Assignment>(`/admin/assignments/${id}/end`, { method: "POST" }),
};
