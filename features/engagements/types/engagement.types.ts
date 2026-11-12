export const ENGAGEMENT_STATUSES = ["draft", "sent", "accepted", "active", "ended"] as const;
export type EngagementStatus = (typeof ENGAGEMENT_STATUSES)[number];

/** Mirrors ENGAGEMENT_TRANSITIONS in backend/src/modules/engagements/engagement.types.ts. */
export const ENGAGEMENT_TRANSITIONS: Record<EngagementStatus, EngagementStatus[]> = {
  draft: ["sent", "ended"],
  sent: ["accepted", "draft", "ended"],
  accepted: ["active", "ended"],
  active: ["ended"],
  ended: [],
};

export interface Engagement {
  id: number;
  client_id: number;
  client_name: string;
  client_status: string;
  package_id: number;
  package_name: string;
  monthly_fee: number;
  billing_cycle: "monthly" | "quarterly" | "yearly";
  status: EngagementStatus;
  start_date: string | null;
  end_date: string | null;
  renewal_date: string | null;
  agreement_file_name: string | null;
  invoice_count: number;
  first_invoice_number: string | null;
  created_at: string;
  updated_at: string;
}

export type EngagementCounts = Record<EngagementStatus, number>;

export interface IssuedInvoice {
  id: number;
  invoice_number: string;
  period: string;
  amount: number;
  gst_amount: number;
  total: number;
}
