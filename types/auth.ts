export type PortalRole =
  | "super_admin"
  | "ops_admin"
  | "bookkeeper"
  | "finance_manager"
  | "cfo"
  | "client_owner"
  | "client_member";

export type Portal = "admin" | "team" | "app";

export interface SessionUser {
  id: number;
  email: string;
  fullName: string;
  role: PortalRole;
  portal: Portal;
}
