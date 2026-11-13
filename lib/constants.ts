import type { Portal, PortalRole } from "@/types/auth";

export const ROLE_LABELS: Record<PortalRole, string> = {
  super_admin: "Super admin",
  ops_admin: "Ops admin",
  bookkeeper: "Bookkeeper",
  finance_manager: "Finance manager",
  cfo: "CFO",
  client_owner: "Client owner",
  client_member: "Client member",
};

export const PORTAL_HOME: Record<Portal, string> = {
  admin: "/admin/dashboard",
  team: "/team/dashboard",
  app: "/app/dashboard",
};

/** Tone used by StatusBadge for every status value the API returns. */
export type Tone = "neutral" | "success" | "warning" | "danger" | "info";

export const STATUS_TONES: Record<string, Tone> = {
  active: "success",
  verified: "success",
  connected: "success",
  approved: "success",
  paid: "success",
  closed: "success",
  fulfilled: "success",
  published: "success",
  reviewed: "success",
  ready: "info",
  new: "info",
  internal: "neutral",
  cancelled: "neutral",
  onboarding: "info",
  invited: "info",
  submitted: "info",
  issued: "info",
  sent: "info",
  lead: "neutral",
  draft: "neutral",
  current: "success",
  scheduled: "info",
  expired: "warning",
  registered: "neutral",
  assessment: "warning",
  proposal_sent: "info",
  accepted: "info",
  ended: "danger",
  todo: "neutral",
  pending: "warning",
  paused: "warning",
  returned: "warning",
  in_progress: "warning",
  open: "warning",
  exited: "danger",
  disabled: "danger",
  rejected: "danger",
  error: "danger",
};

export const ACCOUNTING_SOFTWARE_LABELS: Record<string, string> = {
  journl: "JournL",
  none: "Not connected",
};

export const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Delhi", "Goa", "Gujarat", "Haryana",
  "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Madhya Pradesh",
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan",
  "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
] as const;
