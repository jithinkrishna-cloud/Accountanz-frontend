export const ANALYTICS_RANGES = ["3", "6", "12"] as const;
export type AnalyticsRange = (typeof ANALYTICS_RANGES)[number];

/** A share as a whole percent, or null when there was nothing to measure. */
export type Rate = number | null;

/** Mirrors backend/src/modules/analytics/analytics.types.ts. */
export interface AnalyticsOverview {
  months: string[];
  range: number;
  summary: {
    billed: number;
    collected: number;
    outstanding: number;
    overdue: number;
    overdue_invoices: number;
    monthly_fees: number;
    tasks_approved: number;
    first_time_approval: Rate;
    on_time: Rate;
    avg_review_days: number | null;
    hours: number;
  };
  monthly: {
    month: string;
    billed: number;
    collected: number;
    approved: number;
    first_time_approval: Rate;
    on_time: Rate;
    avg_review_days: number | null;
    hours: number;
    new_clients: number;
    closed_clients: number;
  }[];
  people: { user_id: number; full_name: string; approved: number[]; total: number; first_time_approval: Rate; on_time: Rate; hours: number }[];
  top_clients: { client_id: number; client_name: string; total: number }[];
  packages: { package_id: number; name: string; clients: number; monthly_fees: number }[];
  clients_by_status: { status: string; count: number }[];
}
