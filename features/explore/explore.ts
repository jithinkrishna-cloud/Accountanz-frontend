"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export type RequestKind = "join_team" | "one_off";
export type RequestStatus = "pending" | "approved" | "declined" | "withdrawn";

export const KIND_LABEL: Record<RequestKind, string> = { join_team: "Join our accounting team", one_off: "A one-off piece of work" };
export const STATUS_LABEL: Record<RequestStatus, string> = { pending: "Waiting for Accountanz", approved: "Approved", declined: "Declined", withdrawn: "Withdrawn" };

/** An accountant as a client sees them: role and expertise only (no rate, contact details or performance numbers). */
export interface ExploreAccountant {
  id: number;
  full_name: string;
  role: string;
  expertise: string[];
  member_since: string;
  team_roles: string[];
  pending_request_id: number | null;
}

export interface AccountantRequest {
  id: number;
  client_id: number;
  client_name: string;
  accountant_id: number;
  accountant_name: string;
  accountant_role: string;
  requested_by: number | null;
  requester_name: string | null;
  kind: RequestKind;
  message: string;
  preferred_start: string | null;
  status: RequestStatus;
  decided_by_name: string | null;
  decided_at: string | null;
  decision_note: string | null;
  created_at: string;
  /** Set when the admin approved and assigned in one step. */
  assignment_id?: number | null;
}

export interface RequestBody {
  kind: RequestKind;
  message: string;
  preferred_start: string | null;
}

/** Approve (optionally assigning in the same step) or decline. */
export interface DecideBody {
  decision: "approved" | "declined";
  note: string | null;
  assign?: { team_role: string; valid_from: string; valid_to: string | null } | null;
}

const items = <T,>(path: string) => api<{ items: T[] }>(path).then((r) => r.items);

export const exploreService = {
  accountants: () => items<ExploreAccountant>("/app/explore/accountants"),
  request: (accountantId: number, body: RequestBody) => api<AccountantRequest>(`/app/explore/accountants/${accountantId}/requests`, { method: "POST", body }),
  myRequests: () => items<AccountantRequest>("/app/accountant-requests"),
  withdraw: (id: number) => api<AccountantRequest>(`/app/accountant-requests/${id}/withdraw`, { method: "POST" }),
  // Admin
  adminRequests: (status?: RequestStatus) => api<{ items: AccountantRequest[] }>("/admin/accountant-requests", { query: { status } }).then((r) => r.items),
  decide: (id: number, body: DecideBody) =>
    api<AccountantRequest>(`/admin/accountant-requests/${id}/decision`, { method: "POST", body }),
};

const APP = ["app", "explore"] as const;
const ADMIN = ["admin", "accountant-requests"] as const;

export const useExploreAccountants = () => useQuery({ queryKey: [...APP, "accountants"], queryFn: exploreService.accountants });
export const useMyAccountantRequests = () => useQuery({ queryKey: [...APP, "requests"], queryFn: exploreService.myRequests });

function useRefreshExplore() {
  const qc = useQueryClient();
  return () => void qc.invalidateQueries({ queryKey: APP });
}

export function useRequestAccountant() {
  const refresh = useRefreshExplore();
  return useMutation({ mutationFn: (v: { accountantId: number; body: RequestBody }) => exploreService.request(v.accountantId, v.body), onSuccess: refresh });
}

export function useWithdrawAccountantRequest() {
  const refresh = useRefreshExplore();
  return useMutation({ mutationFn: (id: number) => exploreService.withdraw(id), onSuccess: refresh });
}

export const useAdminAccountantRequests = (status?: RequestStatus) =>
  useQuery({ queryKey: [...ADMIN, status ?? "all"], queryFn: () => exploreService.adminRequests(status) });

export function useDecideAccountantRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: number } & DecideBody) => exploreService.decide(v.id, { decision: v.decision, note: v.note, assign: v.assign }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ADMIN });
      // Approve-and-assign creates an assignment: refresh the lists that show it.
      void qc.invalidateQueries({ queryKey: ["admin", "assignments"] });
      void qc.invalidateQueries({ queryKey: ["admin", "clients"] });
    },
  });
}
