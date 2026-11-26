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
  /** Effective services, "||"-separated (the client's own list, else the package's). */
  service_names: string | null;
  /** 1 when this client has its own service list instead of the package's. */
  custom_services: number;
  monthly_fee: number;
  billing_cycle: "monthly" | "quarterly" | "yearly";
  status: EngagementStatus;
  start_date: string | null;
  end_date: string | null;
  renewal_date: string | null;
  agreement_file_name: string | null;
  agreement_uploaded_at: string | null;
  agreement_uploaded_by_name: string | null;
  invoice_count: number;
  first_invoice_number: string | null;
  /** An open package change request (from the client), if any. */
  pending_change_id: number | null;
  pending_change_source: "client" | "team" | null;
  pending_change_package_id: number | null;
  pending_change_package_name: string | null;
  pending_change_message: string | null;
  pending_change_at: string | null;
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
