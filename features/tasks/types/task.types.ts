export const TASK_STATUSES = ["todo", "in_progress", "submitted", "returned", "approved"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_SOURCES = ["template", "manual"] as const;
export type TaskSource = (typeof TASK_SOURCES)[number];

export interface TaskListItem {
  id: number;
  title: string;
  period: string;
  status: TaskStatus;
  due_date: string | null;
  client_id: number;
  client_name: string;
  assignee_id: number | null;
  assignee_email: string | null;
  reviewer_email: string | null;
  client_visible: boolean;
  source: TaskSource;
}

export interface TaskDetail {
  id: number;
  client_id: number;
  client_name: string;
  engagement_id: number | null;
  template_item_id: number | null;
  creation_source: TaskSource;
  period: string;
  title: string;
  description: string | null;
  checklist: { text: string; done: boolean }[];
  status: TaskStatus;
  due_date: string | null;
  client_visible: boolean;
  submitted_at: string | null;
  assignee_id: number | null;
  assignee_name: string | null;
  reviewer_id: number | null;
  reviewer_name: string | null;
  created_by_email: string | null;
  work_logs: { id: number; user_email: string; minutes: number; note: string | null; logged_on: string }[];
  reviews: { decision: "approved" | "returned"; comments: string | null; reviewer_email: string | null; submission_number: number; created_at: string }[];
  permissions: { can_edit: boolean; can_work: boolean; can_submit: boolean; can_log_time: boolean; can_review: boolean };
}

export interface TaskOptions {
  clients: { id: number; name: string }[];
  engagements: { id: number; package_name: string }[];
  assignees: { user_id: number; full_name: string; team_role: string }[];
  reviewers: { user_id: number; full_name: string; role: string }[];
}

export interface GenerationResult {
  period: string;
  engagements: number;
  created: number;
  skipped: number;
  closed_clients_skipped: number;
}

export const RECURRENCES = ["monthly", "quarterly", "annual"] as const;
export type Recurrence = (typeof RECURRENCES)[number];

export interface TaskTemplateItem {
  id: number;
  template_id: number;
  title: string;
  checklist: string[];
  client_visible: boolean;
  sort_order: number;
}

export interface TaskTemplate {
  id: number;
  service_id: number;
  service_name: string;
  name: string;
  recurrence: Recurrence;
  due_day_of_period: number;
  items: TaskTemplateItem[];
}
