"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export type CorrectionStatus = "draft" | "pending_approval" | "approved" | "posting" | "posted" | "rejected" | "unknown";
export type Side = "dr" | "cr";

/** Signed paise: Dr negative, Cr positive (JournL convention). */
export interface BalanceRow {
  ledger_id: number;
  ledger_name: string;
  before_paise: number;
  after_paise: number;
}

export interface Correction {
  id: number;
  ref: string;
  client_id: number;
  kind: "opening_balance" | "journal_entry";
  purpose: "correction" | "unresolved_tb_difference";
  status: CorrectionStatus;
  stuck: boolean;
  journl_branch_id: number;
  payload: { voucher_date?: string; lines?: { ledger_id: number; ledger_name: string; side: Side; amount_paise: number }[]; ledger_name?: string; amount_paise?: number; side?: Side };
  before_values: BalanceRow[] | null;
  after_values: BalanceRow[] | null;
  reason: string;
  review_comment: string | null;
  journl_voucher_id: string | null;
  rejected_by_source: "reviewer" | "journl" | "stale" | null;
  journl_message: string | null;
  created_at: string;
  events?: { from_status: string | null; to_status: string; note: string | null; actor_name?: string | null; created_at: string }[];
  can_edit?: boolean;
  can_submit?: boolean;
  can_review?: boolean;
  message?: string;
}

export type CorrectionInput =
  | { kind: "journal_entry"; purpose: "correction"; reason: string; branch_id: number; voucher_date: string; lines: { ledger_id: number; ledger_name: string; side: Side; amount: string }[] }
  | { kind: "opening_balance"; purpose: "correction"; reason: string; ledger_id: number; ledger_name: string; amount: string; side: Side }
  | { kind: "opening_balance"; purpose: "unresolved_tb_difference"; reason: string; ledger_id: number };

export interface Preview {
  journl_branch_id: number;
  before_values: BalanceRow[];
  after_values: BalanceRow[];
  tb_difference_before: number;
  tb_difference_after: number;
}

export interface LedgerHit {
  id: number;
  name: string;
  group_name: string | null;
}

const base = (clientId: number) => `/team/workspace/clients/${clientId}/journl/corrections`;
const KEY = ["team", "journl", "corrections"] as const;

export const correctionService = {
  list: (c: number) => api<{ items: Correction[] }>(base(c)),
  get: (c: number, id: number) => api<Correction>(`${base(c)}/${id}`),
  preview: (c: number, body: CorrectionInput) => api<Preview>(`${base(c)}/preview`, { method: "POST", body }),
  create: (c: number, body: CorrectionInput) => api<Correction>(base(c), { method: "POST", body }),
  ledgers: (c: number, q: string) => api<{ items: LedgerHit[] }>(`${base(c)}/lookup/ledgers`, { query: { q } }),
  branches: (c: number) => api<{ items: { id: number; name: string }[] }>(`${base(c)}/lookup/branches`),
  action: (c: number, id: number, action: string, body?: unknown) => api<Correction>(`${base(c)}/${id}/${action}`, { method: "POST", body }),
  awaiting: () => api<{ count: number }>(`/team/workspace/journl/corrections/awaiting`),
};

export const useCorrections = (clientId: number | null) =>
  useQuery({ queryKey: [...KEY, clientId], queryFn: () => correctionService.list(clientId!), enabled: clientId != null });

export const useCorrection = (clientId: number | null, id: number | null) =>
  useQuery({ queryKey: [...KEY, clientId, id], queryFn: () => correctionService.get(clientId!, id!), enabled: clientId != null && id != null, retry: false });

export const useBranches = (clientId: number | null, enabled: boolean) =>
  useQuery({ queryKey: [...KEY, "branches", clientId], queryFn: () => correctionService.branches(clientId!), enabled: enabled && clientId != null, retry: false });

export const useAwaitingCount = () => useQuery({ queryKey: [...KEY, "awaiting"], queryFn: correctionService.awaiting, staleTime: 60_000, retry: false });

/** Any state change: refetch the list, the open correction and the reviewer count. */
export function useCorrectionAction(clientId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action, body }: { id: number; action: string; body?: unknown }) => correctionService.action(clientId, id, action, body),
    onSettled: () => void qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useCreateCorrection(clientId: number) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (body: CorrectionInput) => correctionService.create(clientId, body), onSuccess: () => void qc.invalidateQueries({ queryKey: KEY }) });
}

/** ₹ from signed paise; Dr/Cr shown explicitly, never as a minus sign. */
export function money(signedPaise: number) {
  const abs = Math.abs(signedPaise) / 100;
  const txt = abs.toLocaleString("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 });
  return signedPaise === 0 ? txt : `${txt} ${signedPaise < 0 ? "Dr" : "Cr"}`;
}

/** "12." → "12", ".5" → "0.5"; the API accepts at most 2 decimals. */
export const normaliseAmount = (v: string) => {
  const t = v.trim().replace(/,/g, "");
  return (t.startsWith(".") ? `0${t}` : t).replace(/\.$/, "");
};
