import type { TeamRole } from "@/features/assignments/types/assignment.types";
import { api } from "@/lib/api-client";

export interface StaffGroupMember {
  user_id: number;
  full_name: string;
  email: string;
  team_role: TeamRole;
  journl_access: boolean;
  /** False when the person is no longer an active, verified accountant (skipped on assign). */
  assignable: boolean;
}

export interface StaffGroup {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  members: StaffGroupMember[];
  /** Clients still holding an active assignment made from this group. */
  clients: { id: number; name: string }[];
}

export interface StaffGroupInput {
  name: string;
  description: string | null;
  members: { user_id: number; team_role: TeamRole; journl_access: boolean }[];
}

export interface AssignGroupInput {
  client_id: number;
  valid_from: string;
  valid_to: string | null;
}

export interface AssignGroupResult {
  client_id: number;
  client_name: string;
  created: { assignment_id: number; full_name: string; team_role: TeamRole }[];
  skipped: { full_name: string; team_role: TeamRole; reason: string }[];
}

export const staffGroupService = {
  list: () => api<{ items: StaffGroup[] }>("/admin/staff-groups").then((r) => r.items),
  create: (input: StaffGroupInput) => api<StaffGroup>("/admin/staff-groups", { method: "POST", body: input }),
  update: (id: number, input: StaffGroupInput) => api<StaffGroup>(`/admin/staff-groups/${id}`, { method: "PUT", body: input }),
  remove: (id: number) => api<void>(`/admin/staff-groups/${id}`, { method: "DELETE" }),
  assign: (id: number, input: AssignGroupInput) => api<AssignGroupResult>(`/admin/staff-groups/${id}/assign`, { method: "POST", body: input }),
};
