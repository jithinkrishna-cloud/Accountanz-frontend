import type { AssignmentPermissions } from "@/features/journl-permissions/types/journl-permission.types";
export type ClosingStatus = "open" | "ready" | "closed";

export interface WorkspaceTask {
  id: number;
  title: string;
  client_id: number;
  client_name: string;
  period: string;
  status: string;
  due_date: string | null;
  overdue: 0 | 1;
}

export interface WorkspaceDashboard {
  period: string;
  counts: {
    clients: number;
    assigned: number;
    overdue: number;
    returned: number;
    to_review: number;
    due_week: number;
    open_requests: number;
    pending_approvals: number;
    awaiting_reply: number;
    draft_reports: number;
  };
  queue: WorkspaceTask[];
  meetings: { id: number; title: string; client_name: string; starts_at: string; meeting_link: string | null }[];
}

export interface MyClient {
  id: number;
  name: string;
  legal_name: string;
  status: string;
  roles: string;
  package_name: string | null;
  open_tasks: number;
  overdue_tasks: number;
  open_requests: number;
  awaiting_reply: number;
  closing_status: ClosingStatus;
}

export interface ClientOverview {
  client: { id: number; name: string; legal_name: string; gstin: string | null; pan: string | null; state: string | null; status: string; accounting_software: string };
  engagement: { id: number; package_name: string; scope_notes: string | null; start_date: string | null; renewal_date: string | null; services: string[] } | null;
  team: { user_id: number; full_name: string; email: string; team_role: string; journl_access: 0 | 1 }[];
  contacts: { full_name: string; email: string; role: string; can_approve: 0 | 1 }[];
  summary: MyClient | null;
  can_review: boolean;
  /** The viewer's own JournL module permissions, one per active assignment (empty for admins). */
  journl: AssignmentPermissions[];
}

export interface ChecklistItem {
  client_id: number;
  client_name: string;
  closing_status: ClosingStatus;
  /** Why it was marked ready with open items; null when the checklist was complete. */
  ready_override: string | null;
  tasks_total: number;
  tasks_approved: number;
  tasks_submitted: number;
  open_requests: number;
  pending_approvals: number;
  reports_published: number;
  reports_draft: number;
  done: { tasks: boolean; documents: boolean; approvals: boolean; reports: boolean };
  complete: boolean;
  /** What is still open, in words. */
  missing: string[];
  can_review: boolean;
}

export interface Checklist {
  period: string;
  periods: string[];
  items: ChecklistItem[];
}
