export const CLIENT_STATUSES = ["lead", "onboarding", "active", "paused", "exited"] as const;
export type ClientStatus = (typeof CLIENT_STATUSES)[number];
export const ACCOUNTING_SOFTWARE = ["journl", "zoho_books", "none"] as const;
export type AccountingSoftware = (typeof ACCOUNTING_SOFTWARE)[number];

export interface Client {
  id: number;
  legal_name: string;
  trade_name: string | null;
  gstin: string | null;
  pan: string | null;
  state: string | null;
  address: string | null;
  status: ClientStatus;
  accounting_software: AccountingSoftware;
  created_at: string;
  updated_at: string;
}

export interface ClientDetail extends Client {
  branches: { id: number; name: string; gstin: string | null; external_branch_ref: string | null }[];
  portalUsers: { user_id: number; full_name: string; email: string; role: "owner" | "member"; can_approve: 0 | 1 }[];
  team: { user_id: number; full_name: string; team_role: string; valid_from: string; valid_to: string | null }[];
}
