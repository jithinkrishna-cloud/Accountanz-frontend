import type { PortalRole } from "@/types/auth";

export type StaffType = "accountant" | "employee";
export type StaffRole = Extract<PortalRole, "bookkeeper" | "finance_manager" | "cfo" | "ops_admin">;

export const ROLES_BY_TYPE: Record<StaffType, StaffRole[]> = {
  accountant: ["bookkeeper", "finance_manager", "cfo"],
  employee: ["ops_admin"],
};

export const VERIFICATION_STATUSES = ["pending", "verified", "rejected"] as const;

export interface StaffMember {
  user_id: number;
  email: string;
  full_name: string;
  phone: string | null;
  portal_role: StaffRole;
  status: "invited" | "active" | "disabled";
  staff_type: StaffType;
  hourly_rate: number | null;
  expertise: string[] | null;
  verification_status: (typeof VERIFICATION_STATUSES)[number];
  bank_account_name: string | null;
  bank_account_last4: string | null;
  bank_ifsc: string | null;
  active_clients: number;
}
