/** Headline numbers for one team member. Open/overdue/review counts are as of today; approved, returned and hours are for the chosen month. */
export interface ProgressSummary {
  user_id: number;
  full_name: string;
  email: string;
  portal_role: string;
  status: string;
  staff_type: "accountant" | "employee";
  active_clients: number;
  open_tasks: number;
  overdue: number;
  awaiting_review: number;
  to_review: number;
  approved: number;
  returned: number;
  /** Share of the month's reviews that were approvals; null when nothing was reviewed. */
  approval_rate: number | null;
  hours: number;
}

export interface ProgressList {
  period: string;
  periods: string[];
  items: ProgressSummary[];
}

export interface PersonProgress {
  period: string;
  periods: string[];
  person: ProgressSummary;
  profile: { phone: string | null; verification_status: string; expertise: string[]; hourly_rate: number | null; member_since: string; last_login_at: string | null } | null;
  groups: { group_id: number; name: string; team_role: string }[];
  assignments: { id: number; client_id: number; client_name: string; team_role: string; valid_from: string; valid_to: string | null; phase: "current" | "scheduled" | "expired" | "ended"; source_group_name: string | null }[];
  clients: {
    client_id: number;
    client_name: string;
    roles: string[];
    period_total: number;
    period_approved: number;
    open_tasks: number;
    overdue: number;
    awaiting_review: number;
  }[];
  trend: { month: string; approved: number; returned: number; hours: number }[];
  open_tasks: { id: number; title: string; client_id: number; client_name: string; period: string; status: string; due_date: string | null; overdue: boolean }[];
  recent_reviews: { id: number; task_id: number; task_title: string; client_name: string; decision: "approved" | "returned"; comments: string | null; reviewer_name: string | null; created_at: string }[];
}

export interface FirmClient {
  client_id: number;
  client_name: string;
  status: string;
  package_name: string | null;
  period_total: number;
  period_approved: number;
  open_tasks: number;
  overdue: number;
  awaiting_review: number;
  closing_status: "open" | "ready" | "closed";
  team: { user_id: number; full_name: string; team_role: string }[];
}

export interface FirmGroup {
  /** null for the "Not in a group" row. */
  group_id: number | null;
  name: string;
  members: { user_id: number; full_name: string }[];
  open_tasks: number;
  overdue: number;
  awaiting_review: number;
  approved: number;
}

export interface FirmProgress {
  period: string;
  periods: string[];
  totals: {
    active_clients: number;
    open_tasks: number;
    overdue: number;
    awaiting_review: number;
    awaiting_over_two_days: number;
    period_total: number;
    period_approved: number;
    closing_done: number;
  };
  clients: FirmClient[];
  groups: FirmGroup[];
}

export const TASK_VIEWS = ["open", "overdue", "review", "returned", "approved", "all"] as const;
export type PersonTaskView = (typeof TASK_VIEWS)[number];

export interface PersonTask {
  id: number;
  title: string;
  client_id: number;
  client_name: string;
  period: string;
  status: string;
  due_date: string | null;
  overdue: boolean;
  reviewer_name: string | null;
  hours: number;
  updated_at: string;
}

export interface PersonTaskList {
  items: PersonTask[];
  total: number;
  page: number;
  pageSize: number;
  counts: Record<PersonTaskView, number>;
}
