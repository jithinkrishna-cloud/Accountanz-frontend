"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { StaffPortal } from "@/types/auth";
import { communicationService, type NewMeeting } from "../services/communication-service";
import type { ThreadVisibility } from "../types/communication.types";

const key = (portal: StaffPortal) => [portal, "communication"] as const;

export const useThreads = (portal: StaffPortal, params: { q?: string; client_id?: string; visibility?: ThreadVisibility; mentioned?: "1"; page?: number }) =>
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

/** People who can be @mentioned on a client's conversation (client threads include the client's portal users). */
export const useMentionable = (portal: StaffPortal, clientId: number | null, visibility: ThreadVisibility) =>
  useQuery({
    queryKey: [...key(portal), "mentionable", clientId, visibility],
    queryFn: () => communicationService.mentionable(portal, clientId!, visibility),
    enabled: clientId !== null,
    staleTime: 5 * 60_000,
  });

export function useStartThread(portal: StaffPortal) {
  const refresh = useRefresh(portal);
  return useMutation({
    mutationFn: (body: { client_id: number; visibility: ThreadVisibility; subject: string; body: string; mentions?: number[] }) => communicationService.startThread(portal, body),
    onSuccess: refresh,
  });
}

export function useReply(portal: StaffPortal, threadId: number) {
  const refresh = useRefresh(portal);
  return useMutation({ mutationFn: ({ body, mentions }: { body: string; mentions?: number[] }) => communicationService.reply(portal, threadId, body, mentions), onSuccess: refresh });
}

export function useScheduleMeeting(portal: StaffPortal) {
  const refresh = useRefresh(portal);
  return useMutation({ mutationFn: (body: NewMeeting) => communicationService.schedule(portal, body), onSuccess: refresh });
}

export function useCancelMeeting(portal: StaffPortal) {
  const refresh = useRefresh(portal);
  return useMutation({ mutationFn: (id: number) => communicationService.cancelMeeting(portal, id), onSuccess: refresh });
}

export const usePendingMeetingRequests = (portal: StaffPortal, clientId?: string) =>
  useQuery({ queryKey: [...key(portal), "meeting-requests", "pending", clientId], queryFn: () => communicationService.meetingRequests(portal, { status: "pending", client_id: clientId, page: 1 }) });

export function useScheduleRequest(portal: StaffPortal) {
  const refresh = useRefresh(portal);
  return useMutation({ mutationFn: ({ id, body }: { id: number; body: NewMeeting }) => communicationService.scheduleRequest(portal, id, body), onSettled: refresh });
}

export function useDeclineRequest(portal: StaffPortal) {
  const refresh = useRefresh(portal);
  return useMutation({ mutationFn: ({ id, reason }: { id: number; reason: string }) => communicationService.declineRequest(portal, id, reason), onSettled: refresh });
}
