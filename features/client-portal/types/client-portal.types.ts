export interface PortalCompany {
  id: number;
  name: string;
  /** Client lifecycle status: "lead" while the application is being reviewed. */
  status: string;
  role: "owner" | "member";
  can_approve: boolean;
}

export interface PortalDashboard {
  period: string;
  company: string;
  tasks_done: number;
  tasks_total: number;
  open_requests: number;
  pending_approvals: number;
  reports: number;
  outstanding: number;
  next_meeting_title: string | null;
  next_meeting_at: string | null;
}

export interface PortalBusiness {
  legal_name: string;
  trade_name: string | null;
  gstin: string | null;
  pan: string | null;
  state: string | null;
  address: string | null;
  status: string;
  accounting_software: string;
  branches: { id: number; name: string; gstin: string | null }[];
}

export interface PortalDocument {
  id: number;
  file_name: string;
  category: string;
  period: string | null;
  status: "new" | "reviewed" | "rejected";
  review_note: string | null;
  created_at: string;
  uploaded_by: string | null;
  request_id: number | null;
}

export interface PortalRequest {
  id: number;
  description: string;
  due_date: string | null;
  period: string | null;
  status: "open" | "fulfilled";
  requested_by: string | null;
  files: number;
}

export interface PortalTask {
  id: number;
  title: string;
  status: "todo" | "in_progress" | "submitted" | "returned" | "approved";
  due_date: string | null;
  checklist: { text: string; done: boolean }[];
}

export interface PortalReport {
  id: number;
  period: string;
  report_type: string;
  file_name: string | null;
  summary: string | null;
  published_date: string;
}

export interface PortalApproval {
  id: number;
  subject: string;
  description: string | null;
  status: "pending" | "approved" | "rejected";
  requested_by: string | null;
  decided_by: string | null;
  decided_at: string | null;
  comment: string | null;
  created_at: string;
}

export interface PortalThread {
  id: number;
  subject: string | null;
  created_at: string;
  messages: number;
  last_at: string | null;
  last_body: string | null;
  last_author: string | null;
}

export interface PortalThreadDetail {
  id: number;
  subject: string | null;
  messages: { id: number; body: string; created_at: string; author: string | null; from_client: boolean }[];
}

export interface PortalMeeting {
  id: number;
  title: string;
  starts_at: string;
  ends_at: string;
  meeting_link: string | null;
  organiser: string | null;
  attendees: string | null;
}

export interface PortalBilling {
  package: { package_name: string; monthly_fee: number; billing_cycle: string; scope_notes: string | null; start_date: string | null; renewal_date: string | null } | null;
  invoices: { id: number; invoice_number: string; period: string; amount: number; gst_amount: number; total: number; due_date: string; status: string; paid: number }[];
  payments: { id: number; invoice_number: string; amount: number; paid_date: string; method: string; reference: string | null }[];
  outstanding: number;
}

export type NotificationPrefs = Record<"document_requests" | "approvals" | "reports" | "monthly_summary", boolean>;

export interface PortalSettings {
  full_name: string;
  email: string;
  phone: string | null;
  notification_prefs: NotificationPrefs;
  company: string;
  role: "owner" | "member";
  can_approve: boolean;
}

export interface PortalSoftware {
  provider: string;
  external_org_name: string | null;
  status: string;
  last_health_check: string | null;
}
