import type { TeamRole } from "@/features/assignments/types/assignment.types";
import { api, type Paged } from "@/lib/api-client";

export interface TeamMember {
  assignment_id: number;
  user_id: number;
  full_name: string;
  email: string;
  team_role: TeamRole;
  journl_access: boolean;
  valid_to: string | null;
}

export interface Team {
  client_id: number;
  client_name: string;
  client_status: string;
  team_id: number;
  team_name: string;
  scheduled_count: number;
  members: TeamMember[];
}

export const teamService = {
  list: (params: { q?: string; page?: number }) => api<Paged<Team>>("/admin/teams", { query: { ...params, pageSize: 24 } }),
  clientOptions: () => api<{ items: { id: number; name: string }[] }>("/admin/teams/client-options").then((r) => r.items),
  create: (clientId: number, name: string) =>
    api<{ team_id: number; client_id: number; team_name: string }>("/admin/teams", { method: "POST", body: { client_id: clientId, name: name || null } }),
  rename: (clientId: number, name: string) => api<{ client_id: number; team_name: string }>(`/admin/teams/${clientId}`, { method: "PUT", body: { name } }),
};
