export const APPROVAL_STATUSES = ["pending", "approved", "rejected"] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

export interface ClientApproval {
  id: number;
  client_id: number;
  client_name: string;
  subject: string;
  description: string | null;
  related_task_id: number | null;
  related_task_title: string | null;
  status: ApprovalStatus;
  requested_by_name: string | null;
  decided_by_name: string | null;
  decided_at: string | null;
  comment: string | null;
  created_at: string;
}
