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
