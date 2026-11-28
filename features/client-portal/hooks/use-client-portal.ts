"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { clientPortalService as s, type UploadMeta } from "../services/client-portal-service";

const K = (...parts: (string | number | undefined)[]) => ["app", ...parts] as const;

export const useCompany = () => useQuery({ queryKey: K("context"), queryFn: s.context, staleTime: 5 * 60_000 });
export const usePortalDashboard = () => useQuery({ queryKey: K("dashboard"), queryFn: s.dashboard });
export const usePortalBusiness = () => useQuery({ queryKey: K("business"), queryFn: s.business });
export const usePortalTeam = () => useQuery({ queryKey: K("team"), queryFn: s.team });
export const usePortalMember = (userId: number | null) => useQuery({ queryKey: K("team", userId ?? 0), queryFn: () => s.teamMember(userId!), enabled: userId !== null });
export const usePortalDocuments = () => useQuery({ queryKey: K("documents"), queryFn: s.documents });
export const usePortalRequests = () => useQuery({ queryKey: K("requests"), queryFn: s.requests });
export const usePortalTask = (id: number) => useQuery({ queryKey: K("task", id), queryFn: () => s.task(id) });
export const usePortalTasks = (period?: string) => useQuery({ queryKey: K("tasks", period), queryFn: () => s.tasks(period) });
export const usePortalReports = () => useQuery({ queryKey: K("reports"), queryFn: s.reports });
export const usePortalApprovals = () => useQuery({ queryKey: K("approvals"), queryFn: s.approvals });
export const usePortalThreads = () => useQuery({ queryKey: K("messages"), queryFn: s.threads });
export const usePortalThread = (id: number | null) => useQuery({ queryKey: K("messages", id ?? 0), queryFn: () => s.thread(id!), enabled: id !== null });
export const usePortalMeetings = () => useQuery({ queryKey: K("meetings"), queryFn: s.meetings });
export const usePortalMeetingRequests = () => useQuery({ queryKey: K("meeting-requests"), queryFn: s.meetingRequests });

/** Company owner creates a task; refreshes the task board and dashboard. */
export function useCreatePortalTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: s.createTask,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: K("tasks") });
      void qc.invalidateQueries({ queryKey: K("dashboard") });
    },
  });
}

/** Owner edits or deletes a task the company added (only while it's not started). */
export function useOwnTaskActions() {
  const qc = useQueryClient();
  const onSuccess = () => {
    void qc.invalidateQueries({ queryKey: K("tasks") });
    void qc.invalidateQueries({ queryKey: K("dashboard") });
    void qc.invalidateQueries({ queryKey: K("team") });
  };
  return {
    update: useMutation({ mutationFn: ({ id, body }: { id: number; body: Parameters<typeof s.updateTask>[1] }) => s.updateTask(id, body), onSuccess }),
    remove: useMutation({ mutationFn: s.deleteTask, onSuccess }),
  };
}

export function useRequestMeeting() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: s.requestMeeting, onSuccess: () => void qc.invalidateQueries({ queryKey: K("meeting-requests") }) });
}

export function useWithdrawMeetingRequest() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: s.withdrawMeetingRequest, onSettled: () => void qc.invalidateQueries({ queryKey: K("meeting-requests") }) });
}
export const usePortalBilling = () => useQuery({ queryKey: K("billing"), queryFn: s.billing });
export const usePortalSettings = () => useQuery({ queryKey: K("settings"), queryFn: s.settings });
/** Gets the checkout URL; the caller sends the browser there, so nothing is invalidated here. */
export const usePayInvoice = () => useMutation({ mutationFn: s.payInvoice });

export function useUpdateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: s.updateClient,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: K("business") });
      void qc.invalidateQueries({ queryKey: K("context") }); // company name in the header
    },
  });
}

/** Saves one My Business section (owners only); the response is the refreshed business, so it replaces the cache. */
export function useSaveBusiness<A>(fn: (arg: A) => Promise<import("../types/client-portal.types").PortalBusiness>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: (data) => qc.setQueryData(K("business"), data) });
}

function useInvalidate(...keys: string[]) {
  const qc = useQueryClient();
  return () => {
    for (const k of [...keys, "dashboard"]) void qc.invalidateQueries({ queryKey: K(k) });
  };
}

export function useUpload() {
  const onSuccess = useInvalidate("documents", "requests");
  return useMutation({ mutationFn: ({ file, meta }: { file: File; meta: UploadMeta }) => s.upload(file, meta), onSuccess });
}

export const usePortalFolders = () => useQuery({ queryKey: K("folders"), queryFn: s.folders });

/** Create / rename / delete folders and move files; every change refreshes folders and files. */
export function useFolderActions() {
  const qc = useQueryClient();
  const onSuccess = () => {
    void qc.invalidateQueries({ queryKey: K("folders") });
    void qc.invalidateQueries({ queryKey: K("documents") });
  };
  return {
    create: useMutation({ mutationFn: s.createFolder, onSuccess }),
    rename: useMutation({ mutationFn: ({ id, name }: { id: number; name: string }) => s.renameFolder(id, name), onSuccess }),
    remove: useMutation({ mutationFn: s.deleteFolder, onSuccess }),
    move: useMutation({ mutationFn: ({ id, folderId }: { id: number; folderId: number | null }) => s.moveDocument(id, folderId), onSuccess }),
    share: useMutation({ mutationFn: ({ id, userIds }: { id: number; userIds: number[] }) => s.shareFolder(id, userIds), onSuccess }),
    shareFile: useMutation({ mutationFn: ({ id, userIds }: { id: number; userIds: number[] }) => s.shareDocument(id, userIds), onSuccess }),
  };
}

/** Answer a document request with a file already in the Document Centre. */
export function useAttachToRequest() {
  const onSuccess = useInvalidate("documents", "requests");
  return useMutation({ mutationFn: ({ requestId, documentId }: { requestId: number; documentId: number }) => s.attachToRequest(requestId, documentId), onSuccess });
}

export function useDecideApproval() {
  const onSettled = useInvalidate("approvals");
  return useMutation({ mutationFn: ({ id, decision, comment }: { id: number; decision: "approved" | "rejected"; comment: string }) => s.decide(id, decision, comment), onSettled });
}

export const usePortalMentionable = () => useQuery({ queryKey: K("mentionable"), queryFn: s.mentionable, staleTime: 5 * 60_000 });

export function useStartThread() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ subject, body, mentions }: { subject: string; body: string; mentions?: number[] }) => s.startThread(subject, body, mentions),
    onSuccess: (t) => {
      qc.setQueryData(K("messages", t.id), t);
      void qc.invalidateQueries({ queryKey: K("messages") });
    },
  });
}

export function useReply(threadId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ body, mentions }: { body: string; mentions?: number[] }) => s.reply(threadId, body, mentions),
    onSuccess: (t) => {
      qc.setQueryData(K("messages", t.id), t);
      void qc.invalidateQueries({ queryKey: K("messages") });
    },
  });
}

/** Edit one of your own messages (allowed for a few minutes after sending). */
export function useEditMessage(threadId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ messageId, body, mentions }: { messageId: number; body: string; mentions?: number[] }) => s.editMessage(threadId, messageId, body, mentions),
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


export const usePortalPackages = () => useQuery({ queryKey: K("packages"), queryFn: s.packages });
export const usePortalProposal = () => useQuery({ queryKey: K("proposal"), queryFn: s.proposal });

/** Accepting moves the company to onboarding and opens an accepted engagement, so refresh what shows that. */
export function useAcceptProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: s.acceptProposal,
    onSuccess: (p) => {
      qc.setQueryData(K("proposal"), p);
      for (const k of ["context", "packages", "dashboard", "billing"]) void qc.invalidateQueries({ queryKey: K(k) });
    },
  });
}

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

export function useRequestPackageChange() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: s.requestPackageChange, onSuccess: () => void qc.invalidateQueries({ queryKey: K("packages") }) });
}

export function useWithdrawPackageChange() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: s.withdrawPackageChange, onSuccess: () => void qc.invalidateQueries({ queryKey: K("packages") }) });
}
