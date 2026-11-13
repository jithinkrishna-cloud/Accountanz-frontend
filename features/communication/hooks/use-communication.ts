"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { StaffPortal } from "@/types/auth";
import { communicationService, type NewMeeting } from "../services/communication-service";
import type { ThreadVisibility } from "../types/communication.types";

const key = (portal: StaffPortal) => [portal, "communication"] as const;

export const useThreads = (portal: StaffPortal, params: { q?: string; client_id?: string; visibility?: ThreadVisibility; page?: number }) =>
  useQuery({ queryKey: [...key(portal), "threads", params], queryFn: () => communicationService.threads(portal, params), placeholderData: keepPreviousData });

export const useThread = (portal: StaffPortal, id: number | null) =>
  useQuery({ queryKey: [...key(portal), "thread", id], queryFn: () => communicationService.thread(portal, id!), enabled: id !== null });

export const useMeetings = (portal: StaffPortal, params: { client_id?: string; when: "upcoming" | "past"; page?: number }) =>
  useQuery({ queryKey: [...key(portal), "meetings", params], queryFn: () => communicationService.meetings(portal, params), placeholderData: keepPreviousData });

function useRefresh(portal: StaffPortal) {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: key(portal) });
    void qc.invalidateQueries({ queryKey: ["team", "workspace"] });
  };
}

export function useStartThread(portal: StaffPortal) {
  const refresh = useRefresh(portal);
  return useMutation({
    mutationFn: (body: { client_id: number; visibility: ThreadVisibility; subject: string; body: string }) => communicationService.startThread(portal, body),
    onSuccess: refresh,
  });
}

export function useReply(portal: StaffPortal, threadId: number) {
  const refresh = useRefresh(portal);
  return useMutation({ mutationFn: (body: string) => communicationService.reply(portal, threadId, body), onSuccess: refresh });
}

export function useScheduleMeeting(portal: StaffPortal) {
  const refresh = useRefresh(portal);
  return useMutation({ mutationFn: (body: NewMeeting) => communicationService.schedule(portal, body), onSuccess: refresh });
}

export function useCancelMeeting(portal: StaffPortal) {
  const refresh = useRefresh(portal);
  return useMutation({ mutationFn: (id: number) => communicationService.cancelMeeting(portal, id), onSuccess: refresh });
}
