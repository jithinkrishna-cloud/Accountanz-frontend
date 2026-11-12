export type ReviewDecision = "approved" | "returned";

export interface ReviewQueueItem {
  task_id: number;
  title: string;
  period: string;
  due_date: string | null;
  submitted_at: string | null;
  client_id: number;
  client_name: string;
  assignee_id: number | null;
  assignee_email: string | null;
  reviewer_email: string | null;
  waiting_days: number;
}

export interface AccountantQuality {
  user_id: number;
  full_name: string;
  first_submissions: number;
  approved_first: number;
  returns: number;
  approved_first_pct: number;
}

export interface ReviewOverview {
  queue: ReviewQueueItem[];
  quality: AccountantQuality[];
}
