import { api, type Paged } from "@/lib/api-client";
import type { StaffPortal } from "@/types/auth";
import type { ApprovalStatus, ClientApproval } from "../types/client-approval.types";

export interface ApprovalListParams {
  q?: string;
  client_id?: string;
  status?: ApprovalStatus;
  page?: number;
}

export const clientApprovalService = {
  list: (portal: StaffPortal, params: ApprovalListParams) => api<Paged<ClientApproval>>(`/${portal}/client-approvals`, { query: { ...params } }),
  request: (portal: StaffPortal, body: { client_id: number; subject: string; description: string | null }) =>
    api<ClientApproval>(`/${portal}/client-approvals`, { method: "POST", body }),
};
