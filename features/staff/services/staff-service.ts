import { api, type Paged } from "@/lib/api-client";
import type { StaffMember, StaffType } from "../types/staff.types";

export interface StaffUpdate {
  full_name?: string;
  phone?: string | null;
  portal_role?: string;
  status?: "active" | "disabled";
  hourly_rate?: number | null;
  expertise?: string[];
  verification_status?: string;
  bank_account_name?: string | null;
  bank_account_number?: string | null;
  bank_ifsc?: string | null;
}

export const staffService = {
  list: (params: { type: StaffType; q?: string; page?: number }) => api<Paged<StaffMember>>("/admin/staff", { query: params }),
  invite: (body: { staff_type: StaffType; full_name: string; email: string; phone: string; portal_role: string }) =>
    api<StaffMember & { invite_url: string; email_sent: boolean }>("/admin/staff/invite", { method: "POST", body }),
  /** New one-time link to set a password (also emailed); earlier links stop working. */
  inviteLink: (id: number) => api<{ invite_url: string; expires_in_days: number; email_sent: boolean }>(`/admin/staff/${id}/invite-link`, { method: "POST" }),
  /** Only people with no work history can be deleted; the API explains why otherwise. */
  remove: (id: number) => api<void>(`/admin/staff/${id}`, { method: "DELETE" }),
  /** `ended_assignments` > 0 when rejecting someone ended their client access. */
  update: (id: number, body: StaffUpdate) => api<StaffMember & { ended_assignments: number }>(`/admin/staff/${id}`, { method: "PATCH", body }),
};
