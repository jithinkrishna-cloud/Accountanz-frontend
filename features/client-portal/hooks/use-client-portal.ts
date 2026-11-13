"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { clientPortalService as s } from "../services/client-portal-service";

const K = (...parts: (string | number | undefined)[]) => ["app", ...parts] as const;

export const useCompany = () => useQuery({ queryKey: K("context"), queryFn: s.context, staleTime: 5 * 60_000 });
export const usePortalDashboard = () => useQuery({ queryKey: K("dashboard"), queryFn: s.dashboard });
export const usePortalBusiness = () => useQuery({ queryKey: K("business"), queryFn: s.business });
export const usePortalTeam = () => useQuery({ queryKey: K("team"), queryFn: s.team });
export const usePortalSoftware = () => useQuery({ queryKey: K("software"), queryFn: s.software });
export const usePortalDocuments = () => useQuery({ queryKey: K("documents"), queryFn: s.documents });
export const usePortalRequests = () => useQuery({ queryKey: K("requests"), queryFn: s.requests });
export const usePortalTasks = (period?: string) => useQuery({ queryKey: K("tasks", period), queryFn: () => s.tasks(period) });
export const usePortalReports = () => useQuery({ queryKey: K("reports"), queryFn: s.reports });
export const usePortalApprovals = () => useQuery({ queryKey: K("approvals"), queryFn: s.approvals });
export const usePortalThreads = () => useQuery({ queryKey: K("messages"), queryFn: s.threads });
export const usePortalThread = (id: number | null) => useQuery({ queryKey: K("messages", id ?? 0), queryFn: () => s.thread(id!), enabled: id !== null });
export const usePortalMeetings = () => useQuery({ queryKey: K("meetings"), queryFn: s.meetings });
export const usePortalBilling = () => useQuery({ queryKey: K("billing"), queryFn: s.billing });
export const usePortalSettings = () => useQuery({ queryKey: K("settings"), queryFn: s.settings });

function useInvalidate(...keys: string[]) {
  const qc = useQueryClient();
  return () => {
    for (const k of [...keys, "dashboard"]) void qc.invalidateQueries({ queryKey: K(k) });
  };
}

export function useUpload() {
  const onSuccess = useInvalidate("documents", "requests");
  return useMutation({ mutationFn: ({ file, meta }: { file: File; meta: { category: string; period?: string; request_id?: number } }) => s.upload(file, meta), onSuccess });
}

export function useDecideApproval() {
  const onSettled = useInvalidate("approvals");
  return useMutation({ mutationFn: ({ id, decision, comment }: { id: number; decision: "approved" | "rejected"; comment: string }) => s.decide(id, decision, comment), onSettled });
}

export function useStartThread() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ subject, body }: { subject: string; body: string }) => s.startThread(subject, body),
    onSuccess: (t) => {
      qc.setQueryData(K("messages", t.id), t);
      void qc.invalidateQueries({ queryKey: K("messages") });
    },
  });
}

export function useReply(threadId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => s.reply(threadId, body),
    onSuccess: (t) => {
      qc.setQueryData(K("messages", t.id), t);
      void qc.invalidateQueries({ queryKey: K("messages") });
    },
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: s.updateSettings, onSuccess: (d) => qc.setQueryData(K("settings"), d) });
}

export function useConnectJournl() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: s.connectJournl, onSuccess: (rows) => qc.setQueryData(K("software"), rows) });
}

export function useDisconnectJournl() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: s.disconnectJournl, onSuccess: (rows) => qc.setQueryData(K("software"), rows) });
}

export const usePortalPackages = () => useQuery({ queryKey: K("packages"), queryFn: s.packages });

export function useChoosePackage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: s.choosePackage,
    onSuccess: (d) => {
      qc.setQueryData(K("packages"), d);
      void qc.invalidateQueries({ queryKey: K("billing") });
    },
  });
}
