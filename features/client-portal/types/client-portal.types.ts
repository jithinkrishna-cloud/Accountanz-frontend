import type { BusinessType, CompanyFinancialProfile, CompanyStakeholder, CompanyTaxDetails } from "@/features/clients/types/client.types";
import type { OnboardingServiceRequirements } from "@/features/onboarding/types/onboarding.types";

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
  business_type: BusinessType | null;
  date_of_establishment: string | null;
  gstin: string | null;
  pan: string | null;
  state: string | null;
  address: string | null;
  primary_contact_name: string | null;
  primary_contact_email: string | null;
  primary_contact_phone: string | null;
  status: string;
  accounting_software: string;
  branches: { id: number; name: string; gstin: string | null }[];
  /** Read-only in the portal; staff keep these up to date. */
  tax_details: Omit<CompanyTaxDetails, "client_id" | "created_at" | "updated_at"> | null;
  /** Personal identifiers and contact details are not exposed to the portal. */
  stakeholders: Pick<CompanyStakeholder, "id" | "stakeholder_type" | "full_name" | "designation" | "ownership_percentage" | "is_primary">[];
  financial_profile: Omit<CompanyFinancialProfile, "client_id" | "notes" | "created_at" | "updated_at"> | null;
  service_requirements: Pick<OnboardingServiceRequirements, "bookkeeping" | "gst_filing" | "income_tax_filing" | "payroll" | "audit_support" | "other_services"> | null;
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
  /** Document Centre folder; null = top level. */
  folder_id: number | null;
  size_bytes: number | null;
  mime_type: string | null;
  /** 1 = uploaded by someone at the company, 0 = by the accounting team. */
  from_client: 0 | 1;
  /** Accountants this file is shared with directly. */
  shared_with: { user_id: number; full_name: string }[];
}

/** A Document Centre folder. Any depth: parent_id is another folder (null = top level). */
export interface PortalFolder {
  id: number;
  parent_id: number | null;
  name: string;
  /** 1 = made by the accounting team (e.g. a document request folder): the team sees it and everything in it. */
  staff_folder: 0 | 1;
  created_at: string;
  /** Accountants it is shared with directly (subfolders inherit). Empty = private to the company. */
  shared_with: { user_id: number; full_name: string }[];
}

export interface PortalRequest {
  id: number;
  description: string;
  due_date: string | null;
  period: string | null;
  status: "open" | "fulfilled";
  requested_by: string | null;
  /** Their role on the company's team (bookkeeper, finance_manager, ...) or at Accountanz (super_admin, ops_admin). */
  requested_by_role: string | null;
  files: number;
  /** The job this request belongs to, when the client can see it on Tasks & Progress. */
  task: { id: number; title: string; status: PortalTask["status"]; period: string } | null;
  /** Files sent for this request. */
  documents: { id: number; file_name: string; created_at: string }[];
}

/** The proposal Accountanz sent (while open), or the accepted one while the company is onboarding. */
export interface PortalProposal {
  id: number;
  stage: "proposal_sent" | "accepted";
  package_id: number;
  package_name: string;
  package_description: string | null;
  billing_cycle: "monthly" | "quarterly" | "yearly";
  scope_notes: string | null;
  monthly_fee: number;
  message: string | null;
  sent_at: string | null;
  sent_by: string | null;
  accepted_at: string | null;
  accepted_via: "client" | "team" | null;
  services: string[];
  /** The team included with the proposed package. */
  team_roles: string[];
  can_accept: boolean;
}

export interface PortalTeamMember {
  assignment_id: number;
  user_id: number;
  full_name: string;
  email: string;
  team_role: "cfo" | "finance_manager" | "reviewer" | "bookkeeper";
}

/** One job's own page: the job plus when it moved along and what's tied to it. */
export interface PortalTaskDetail extends PortalTask {
  period: string;
  created_at: string;
  submitted_at: string | null;
  approved_at: string | null;
  requests: { id: number; description: string; due_date: string | null; status: string; requested_by: string | null; files: number }[];
  approvals: { id: number; subject: string; status: "pending" | "approved" | "rejected"; created_at: string; decided_at: string | null }[];
}

export interface PortalTask {
  id: number;
  title: string;
  /** Written by the team for this task (optional); the page falls back to a plain-language explanation. */
  description: string | null;
  /** The accountant doing the work, and the senior accountant who checks it. */
  assignee_id: number | null;
  handled_by: string | null;
  reviewer_id: number | null;
  checked_by: string | null;
  status: "todo" | "in_progress" | "submitted" | "returned" | "approved";
  due_date: string | null;
  checklist: { text: string; done: boolean }[];
  /** 1 = someone at the company added it (the owner can edit or delete it while it's not started). */
  created_by_client?: 0 | 1;
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
  /** Their role on the company's team (bookkeeper, finance_manager, ...) or at Accountanz (super_admin, ops_admin). */
  requested_by_role: string | null;
  decided_by: string | null;
  decided_at: string | null;
  comment: string | null;
  created_at: string;
  /** The job this approval is about, when the client can see it on Tasks & Progress. */
  task_id: number | null;
  task_title: string | null;
  task_period: string | null;
  task_status: PortalTask["status"] | null;
}

export interface PortalThread {
  id: number;
  subject: string | null;
  created_at: string;
  messages: number;
  last_at: string | null;
  last_body: string | null;
  last_author: string | null;
  last_author_id: number | null;
}

export interface PortalThreadDetail {
  id: number;
  subject: string | null;
  /** edit_seconds_left: how long the author can still edit it (0 once the window has closed). */
  messages: { id: number; body: string; created_at: string; edited_at: string | null; edit_seconds_left: number; author: string | null; author_id: number | null; from_client: boolean; mentions: { user_id: number; full_name: string }[] }[];
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

/** The client's own meeting requests. preferred_times are ISO strings (UTC). */
export interface PortalMeetingRequest {
  id: number;
  requested_by: number | null;
  requester: string | null;
  topic: string;
  notes: string | null;
  preferred_times: string[];
  duration_minutes: number;
  status: "pending" | "scheduled" | "declined" | "withdrawn";
  decided_by_name: string | null;
  decline_reason: string | null;
  created_at: string;
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

export interface PortalPackage {
  id: number;
  name: string;
  description: string | null;
  monthly_fee: number;
  billing_cycle: "monthly" | "quarterly" | "yearly";
  scope_notes: string | null;
  /** The team included: bookkeeper, finance_manager, cfo. */
  team_roles: string[];
  services: { id: number; code: string; name: string }[];
}

export interface PortalPackages {
  items: PortalPackage[];
  /** The client's engagement that hasn't ended, if any. */
  current: { id: number; status: "draft" | "sent" | "accepted" | "active"; package_id: number; package_name: string } | null;
  /** The company's open package change request, or one answered in the last week. */
  pending_change: PortalPackageChange | null;
}

/** Once the agreement has gone out, a different package is asked for; the team approves or declines. */
export interface PortalPackageChange {
  id: number;
  from_package_name: string;
  to_package_id: number;
  to_package_name: string;
  message: string | null;
  status: "pending" | "approved" | "declined" | "withdrawn";
  decision_note: string | null;
  decided_at: string | null;
  created_at: string;
}

/** One accountant's full picture for this company (Client Portal → My Accounting Team). */
export interface PortalMemberOverview {
  member: {
    user_id: number;
    full_name: string;
    email: string;
    phone: string | null;
    team_roles: PortalTeamMember["team_role"][];
    /** First day of their earliest active assignment to this company (YYYY-MM-DD). */
    since: string;
  };
  tasks: (PortalTask & { period: string })[];
  requests: { id: number; description: string; due_date: string | null; period: string | null; status: string; files: number }[];
  approvals: { id: number; subject: string; status: "pending" | "approved" | "rejected"; created_at: string; decided_at: string | null }[];
  threads: { id: number; subject: string | null; messages: number; last_at: string | null; last_body: string | null; last_author: string | null }[];
  meetings: { id: number; title: string; starts_at: string; ends_at: string; meeting_link: string | null }[];
}
