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

/** The two staff portals; shared delivery features (documents, reports, communication) take one of these. */
export type StaffPortal = Exclude<Portal, "app">;
