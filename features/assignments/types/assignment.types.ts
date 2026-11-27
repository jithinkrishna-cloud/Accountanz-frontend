export const TEAM_ROLES = ["bookkeeper", "finance_manager", "cfo", "reviewer"] as const;
export type TeamRole = (typeof TEAM_ROLES)[number];

export const TEAM_ROLE_LABELS: Record<TeamRole, string> = {
  bookkeeper: "Bookkeeper",
  finance_manager: "Finance manager",
  cfo: "CFO",
  reviewer: "Reviewer",
};

export type AssignmentStatus = "active" | "ended";
export type AssignmentPhase = "current" | "scheduled" | "expired" | "ended";

export const PHASE_LABELS: Record<AssignmentPhase, string> = {
  current: "Has access",
  scheduled: "Starts later",
  expired: "Past end date",
  ended: "Ended",
};

export interface Assignment {
  id: number;
  client_id: number;
  client_name: string;
  client_status: string;
  user_id: number;
  full_name: string;
  email: string;
  portal_role: string;
  team_role: TeamRole;
  valid_from: string;
  valid_to: string | null;
  status: AssignmentStatus;
  phase: AssignmentPhase;
  journl_access: boolean;
  replaced_by_assignment_id: number | null;
  replaced_by_name: string | null;
  /** The staff group this assignment was created from, if any (null once the group is deleted). */
  source_group_id: number | null;
  source_group_name: string | null;
  created_at: string;
}

export interface AssignmentOptions {
  staff: { user_id: number; full_name: string; email: string; portal_role: string; verification_status: string; expertise: string[]; active_clients: number }[];
  clients: { id: number; name: string; status: string }[];
}
