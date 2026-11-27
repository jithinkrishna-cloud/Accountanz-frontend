import type { MentionPerson } from "@/components/shared/mention-textarea";
import { api } from "@/lib/api-client";
import type {
  NotificationPrefs,
  PortalApproval,
  PortalBilling,
  PortalBusiness,
  PortalCompany,
  PortalDashboard,
  PortalDocument,
  PortalFolder,
  PortalMeeting,
  PortalMeetingRequest,
  PortalMemberOverview,
  PortalPackages,
  PortalProposal,
  PortalReport,
  PortalRequest,
  PortalSettings,
  PortalTask,
  PortalTeamMember,
  PortalThread,
  PortalThreadDetail,
} from "../types/client-portal.types";

export interface UploadMeta {
  category: string;
  period?: string;
  request_id?: number;
  folder_id?: number | null;
}

const items = <T,>(path: string) => api<{ items: T[] }>(path).then((r) => r.items);

/** Same-origin download URLs (the auth cookie goes with them; the API checks the company). */
export const portalFileUrl = { document: (id: number) => `/api/app/documents/${id}/file`,
  /** Opens PDFs and images in the browser tab; other files download. */
  view: (id: number) => `/api/app/documents/${id}/file?view=1`, report: (id: number) => `/api/app/reports/${id}/file` };

export const clientPortalService = {
  context: () => api<{ company: PortalCompany | null }>("/app/context").then((r) => r.company),
  dashboard: () => api<PortalDashboard>("/app/dashboard"),
  business: () => api<PortalBusiness>("/app/business"),
  team: () => items<PortalTeamMember>("/app/team"),
  teamMember: (userId: number) => api<PortalMemberOverview>(`/app/team/${userId}`),
  packages: () => api<PortalPackages>("/app/packages"),
  proposal: () => api<{ proposal: PortalProposal | null }>("/app/proposal").then((r) => r.proposal),
  acceptProposal: () => api<{ proposal: PortalProposal | null }>("/app/proposal/accept", { method: "POST" }).then((r) => r.proposal),
  choosePackage: (id: number) => api<PortalPackages>(`/app/packages/${id}/choose`, { method: "POST" }),
  requestPackageChange: (body: { package_id: number; message: string | null }) => api<unknown>("/app/package-changes", { method: "POST", body }),
  withdrawPackageChange: (id: number) => api<unknown>(`/app/package-changes/${id}/withdraw`, { method: "POST" }),
  documents: () => items<PortalDocument>("/app/documents"),
  folders: () => items<PortalFolder>("/app/folders"),
  createFolder: (body: { name: string; parent_id: number | null }) => api<PortalFolder>("/app/folders", { method: "POST", body }),
  renameFolder: (id: number, name: string) => api<PortalFolder>(`/app/folders/${id}`, { method: "PATCH", body: { name } }),
  deleteFolder: (id: number) => api<void>(`/app/folders/${id}`, { method: "DELETE" }),
  moveDocument: (id: number, folderId: number | null) => api<void>(`/app/documents/${id}`, { method: "PATCH", body: { folder_id: folderId } }),
  shareFolder: (id: number, userIds: number[]) => api<PortalFolder>(`/app/folders/${id}/share`, { method: "PUT", body: { user_ids: userIds } }),
  shareDocument: (id: number, userIds: number[]) => api<{ id: number }>(`/app/documents/${id}/share`, { method: "PUT", body: { user_ids: userIds } }),
  attachToRequest: (requestId: number, documentId: number) => api<{ id: number; fulfilled_request: number }>(`/app/requests/${requestId}/attach`, { method: "POST", body: { document_id: documentId } }),
  upload: (file: File, meta: UploadMeta) => {
    const body = new FormData();
    body.append("file", file);
    body.append("category", meta.category);
    if (meta.period) body.append("period", meta.period);
    if (meta.request_id) body.append("request_id", String(meta.request_id));
    if (meta.folder_id) body.append("folder_id", String(meta.folder_id));
    return api<{ id: number; fulfilled_request: number | null }>("/app/documents", { method: "POST", body });
  },
  requests: () => items<PortalRequest>("/app/requests"),
  tasks: (period?: string) => api<{ period: string; periods: string[]; tasks: PortalTask[] }>("/app/tasks", { query: { period } }),
  createTask: (body: { title: string; description: string | null; due_date: string; checklist: string[] }) =>
    api<{ id: number; title: string; period: string; due_date: string }>("/app/tasks", { method: "POST", body }),
  updateTask: (id: number, body: { title: string; description: string | null; due_date: string; checklist: string[] }) =>
    api<{ id: number }>(`/app/tasks/${id}`, { method: "PATCH", body }),
  deleteTask: (id: number) => api<void>(`/app/tasks/${id}`, { method: "DELETE" }),
  reports: () => items<PortalReport>("/app/reports"),
  approvals: () => items<PortalApproval>("/app/approvals"),
  decide: (id: number, decision: "approved" | "rejected", comment: string) =>
    api<void>(`/app/approvals/${id}/decision`, { method: "POST", body: { decision, comment: comment || null } }),
  threads: () => items<PortalThread>("/app/messages"),
  thread: (id: number) => api<PortalThreadDetail>(`/app/messages/${id}`),
  startThread: (subject: string, body: string, mentions: number[] = []) => api<PortalThreadDetail>("/app/messages", { method: "POST", body: { subject, body, mentions } }),
  reply: (id: number, body: string, mentions: number[] = []) => api<PortalThreadDetail>(`/app/messages/${id}`, { method: "POST", body: { body, mentions } }),
  editMessage: (id: number, messageId: number, body: string, mentions: number[] = []) => api<PortalThreadDetail>(`/app/messages/${id}/${messageId}`, { method: "PATCH", body: { body, mentions } }),
  mentionable: () => items<MentionPerson>("/app/messages/mentionable"),
  meetings: () => items<PortalMeeting>("/app/meetings"),
  meetingRequests: () => items<PortalMeetingRequest>("/app/meeting-requests"),
  requestMeeting: (body: { topic: string; notes: string | null; preferred_times: string[]; duration_minutes: number }) =>
    api<PortalMeetingRequest>("/app/meeting-requests", { method: "POST", body }),
  withdrawMeetingRequest: (id: number) => api<void>(`/app/meeting-requests/${id}/withdraw`, { method: "POST" }),
  billing: () => api<PortalBilling>("/app/billing"),
  /** Starts an online payment of the invoice's remaining balance; returns the Easebuzz checkout URL. */
  payInvoice: (id: number) => api<{ url: string }>(`/app/invoices/${id}/pay`, { method: "POST" }),
  settings: () => api<PortalSettings>("/app/settings"),
  updateSettings: (body: { full_name?: string; phone?: string | null; notification_prefs?: NotificationPrefs }) =>
    api<PortalSettings>("/app/settings", { method: "PATCH", body }),
  /** Owners only: trade name, state and address. Legal name, GSTIN and PAN are changed by the team (Request correction). */
  updateClient: (body: { trade_name: string | null; state: string | null; address: string | null }) =>
    api<PortalBusiness>("/app/client", { method: "PATCH", body }),
};
