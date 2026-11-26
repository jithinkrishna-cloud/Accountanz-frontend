export type Template = "scrum" | "kanban";
export type SpaceRole = "admin" | "member";
export type SpaceKind = "client_primary" | "client_project" | "internal";
export type StatusCategory = "todo" | "in_progress" | "done";
export type ItemType = "task" | "bug" | "story" | "subtask";
export type Priority = "highest" | "high" | "medium" | "low" | "lowest";

export const ITEM_TYPES: ItemType[] = ["task", "bug", "story", "subtask"];
export const PRIORITIES: Priority[] = ["highest", "high", "medium", "low", "lowest"];
export const ITEM_TYPE_LABELS: Record<ItemType, string> = { task: "Task", bug: "Bug", story: "Story", subtask: "Subtask" };
export const PRIORITY_LABELS: Record<Priority, string> = { highest: "Highest", high: "High", medium: "Medium", low: "Low", lowest: "Lowest" };
export const SPACE_ROLE_LABELS: Record<SpaceRole, string> = { admin: "Administrator", member: "Member" };
export const CATEGORY_LABELS: Record<StatusCategory, string> = { todo: "To do", in_progress: "In progress", done: "Done" };

export interface Space {
  id: number;
  space_key: string;
  name: string;
  description: string | null;
  template: Template;
  client_id: number | null;
  client_name: string | null;
  kind: SpaceKind;
  /** Set when the space is archived (read-only). */
  archived_at: string | null;
  created_at: string;
  item_count: number;
  member_count: number;
  admins: string | null;
  my_role: SpaceRole | null;
}

export interface NewSpace {
  name: string;
  space_key: string;
  template: Template;
  kind: "internal" | "client_project";
  client_id: number | null;
  description: string | null;
}

/** GET /projects/client-space: a client's primary space, package usage and what the caller may do next. */
export interface ClientSpaceInfo {
  primary: { space_key: string; name: string; accessible: boolean; archived: boolean } | null;
  /** limit null = Unlimited; the whole object is null when the client has no active package. */
  usage: { used: number; limit: number | null; package_name: string } | null;
  can_create_project: boolean;
  can_provision_primary: boolean;
}

/** GET /projects/lookup/:key */
export interface SpaceLookup {
  space_key: string;
  name: string;
  kind: SpaceKind;
  accessible: boolean;
}

export type OverrideLimitType = "workspaces" | "staff_per_workspace";

export interface EntitlementOverride {
  id: number;
  limit_type: OverrideLimitType;
  extra: number;
  reason: string;
  /** YYYY-MM-DD, null = never. */
  expires_at: string | null;
  created_by: number;
  created_by_name: string | null;
  created_at: string;
}

/** GET /projects/:key/limits (the API returns null for internal spaces). null limit = Unlimited. */
export interface SpaceLimits {
  package_name: string | null;
  base: { workspaces: number | null; staff: number | null } | null;
  overrides: EntitlementOverride[];
  effective: { workspaces: number | null; staff: number | null } | null;
  usage: { workspaces: number; staff: number };
}

export interface NewOverride {
  limit_type: OverrideLimitType;
  extra: number;
  reason: string;
  expires_at?: string | null;
}

export type SyncIssueReason = "staff_limit" | "role_not_included" | "no_active_package";

export interface SyncIssue {
  user_id: number;
  full_name: string;
  email: string;
  reason: SyncIssueReason;
  created_at: string;
}

export interface SyncResult {
  added: number;
  removed: number;
  issues: number;
}

export interface Status {
  id: number;
  name: string;
  category: StatusCategory;
  position: number;
  item_count: number;
}

export interface SpaceDetail extends Space {
  my_role: SpaceRole;
  statuses: Status[];
}

export interface Member {
  user_id: number;
  full_name: string;
  email: string;
  portal_role: string;
  role: SpaceRole;
  added_at: string;
}

export interface StaffOption {
  id: number;
  full_name: string;
  email: string;
  portal_role: string;
  in_space: number;
}

export interface Sprint {
  id: number;
  name: string;
  goal: string | null;
  start_date: string | null;
  end_date: string | null;
  status: "planned" | "active" | "completed";
  completed_at: string | null;
  item_count: number;
  done_count: number;
  points: number | null;
}

export interface Item {
  id: number;
  number: number;
  key: string;
  type: ItemType;
  title: string;
  status_id: number;
  status_name: string;
  status_category: StatusCategory;
  priority: Priority;
  assignee_id: number | null;
  assignee_name: string | null;
  reporter_id: number | null;
  reporter_name: string | null;
  parent_id: number | null;
  parent_number: number | null;
  parent_title: string | null;
  sprint_id: number | null;
  sprint_name: string | null;
  client_id: number | null;
  client_name: string | null;
  story_points: number | null;
  /** Minutes (shown as 1d 4h; 1d = 8h). */
  original_estimate_minutes: number | null;
  time_spent_minutes: number;
  start_date: string | null;
  due_date: string | null;
  rank: number;
  labels: string[];
  subtask_count: number;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Attachment {
  id: number;
  file_name: string;
  content_type: string;
  size_bytes: number;
  uploaded_by: number | null;
  uploaded_by_name: string | null;
  created_at: string;
}

export interface ItemDetail extends Item {
  description: string | null;
  subtasks: Item[];
  attachments: Attachment[];
}

export interface Watcher {
  user_id: number;
  full_name: string;
  email: string;
}

export interface Comment {
  id: number;
  author_id: number | null;
  author_name: string | null;
  body: string;
  created_at: string;
  edited_at: string | null;
}

export interface Activity {
  id: number;
  actor_id: number | null;
  actor_name: string | null;
  action: string;
  field: string | null;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

export interface Summary {
  counts: { completed: number; updated: number; created: number; due_soon: number; total: number } | null;
  byStatus: { id: number; name: string; category: StatusCategory; count: number }[];
  byPriority: { priority: Priority; count: number }[];
  byType: { type: ItemType; count: number }[];
  activity: { id: number; item_number: number; item_title: string; actor: string | null; action: string; field: string | null; new_value: string | null; created_at: string }[];
  /** Items in an "in progress" status, soonest due first. */
  running: { number: number; title: string; type: ItemType; priority: Priority; status_name: string; assignee_id: number | null; assignee_name: string | null; start_date: string | null; due_date: string | null }[];
  /** Items with a due date from 3 months back to 6 ahead (YYYY-MM-DD), for the calendar. */
  due: { number: number; title: string; priority: Priority; status_category: StatusCategory; assignee_name: string | null; due_date: string }[];
  /** Open and finished items per person (whole space, not filtered). */
  byAssignee: { assignee_id: number; open: number; done: number }[];
  activeSprint: { id: number; name: string; start_date: string | null; end_date: string | null; item_count: number; done_count: number } | null;
}

export interface ItemFilters {
  q?: string;
  assignee_id?: string;
  type?: ItemType;
  status_id?: number;
  priority?: Priority;
  client_id?: number;
  sprint?: string;
  done_within_days?: number;
  sort?: string;
  dir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export type ItemPatch = Partial<{
  title: string;
  type: ItemType;
  description: string | null;
  status_id: number;
  priority: Priority;
  assignee_id: number | null;
  reporter_id: number | null;
  parent_number: number | null;
  sprint_id: number | null;
  client_id: number | null;
  story_points: number | null;
  original_estimate_minutes: number | null;
  start_date: string | null;
  due_date: string | null;
  labels: string[];
}>;

export interface NewItem {
  title: string;
  type?: ItemType;
  status_id?: number;
  sprint_id?: number | null;
  parent_number?: number | null;
  priority?: Priority;
  assignee_id?: number | null;
  client_id?: number | null;
  description?: string | null;
}

/** Time logged against a work item. */
export interface Worklog {
  id: number;
  user_id: number | null;
  user_name: string | null;
  minutes: number;
  work_date: string;
  note: string | null;
  created_at: string;
}
