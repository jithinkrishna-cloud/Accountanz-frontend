import type { MentionPerson } from "@/components/shared/mention-textarea";
import { api, type Paged } from "@/lib/api-client";
import type { StaffPortal } from "@/types/auth";
import type { Meeting, MeetingRequest, MeetingRequestStatus, Thread, ThreadDetail, ThreadVisibility } from "../types/communication.types";

export interface NewMeeting {
  client_id: number;
  title: string;
  starts_at: string;
  ends_at: string;
  meeting_link: string | null;
  invite_client: boolean;
  staff_ids: number[];
}

const base = (portal: StaffPortal) => `/${portal}/communication`;

export const communicationService = {
  threads: (portal: StaffPortal, params: { q?: string; client_id?: string; visibility?: ThreadVisibility; mentioned?: "1"; page?: number }) =>
    api<Paged<Thread>>(`${base(portal)}/threads`, { query: { ...params } }),
  thread: (portal: StaffPortal, id: number) => api<ThreadDetail>(`${base(portal)}/threads/${id}`),
  startThread: (portal: StaffPortal, body: { client_id: number; visibility: ThreadVisibility; subject: string; body: string; mentions?: number[] }) =>
    api<ThreadDetail>(`${base(portal)}/threads`, { method: "POST", body }),
  reply: (portal: StaffPortal, id: number, body: string, mentions: number[] = []) => api<ThreadDetail>(`${base(portal)}/threads/${id}/messages`, { method: "POST", body: { body, mentions } }),
  mentionable: (portal: StaffPortal, clientId: number, visibility: ThreadVisibility) =>
    api<{ items: MentionPerson[] }>(`${base(portal)}/mentionable`, { query: { client_id: clientId, visibility } }).then((r) => r.items),
  meetings: (portal: StaffPortal, params: { client_id?: string; when: "upcoming" | "past"; page?: number }) =>
    api<Paged<Meeting>>(`${base(portal)}/meetings`, { query: { ...params } }),
  schedule: (portal: StaffPortal, body: NewMeeting) => api<Meeting>(`${base(portal)}/meetings`, { method: "POST", body }),
  cancelMeeting: (portal: StaffPortal, id: number) => api<void>(`${base(portal)}/meetings/${id}`, { method: "DELETE" }),
  meetingRequests: (portal: StaffPortal, params: { status?: MeetingRequestStatus; client_id?: string; page?: number }) =>
    api<Paged<MeetingRequest>>(`${base(portal)}/meeting-requests`, { query: { ...params } }),
  scheduleRequest: (portal: StaffPortal, id: number, body: NewMeeting) => api<Meeting>(`${base(portal)}/meeting-requests/${id}/schedule`, { method: "POST", body }),
  declineRequest: (portal: StaffPortal, id: number, reason: string) => api<void>(`${base(portal)}/meeting-requests/${id}/decline`, { method: "POST", body: { reason } }),
};
