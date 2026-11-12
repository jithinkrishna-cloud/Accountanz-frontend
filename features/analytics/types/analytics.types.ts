export interface AnalyticsOverview {
  months: string[];
  avg_review_turnaround_days: number;
  tasks_approved: number;
  revenue_booked: number;
  tasks_by_accountant: { user_id: number; full_name: string; counts: number[] }[];
  revenue_by_month: number[];
  clients_by_status: { status: string; count: number }[];
}
