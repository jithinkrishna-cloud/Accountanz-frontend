import { api } from "@/lib/api-client";
import type {
  NotificationPrefs,
  PortalApproval,
  PortalBilling,
  PortalBusiness,
  PortalCompany,
  PortalDashboard,
  PortalDocument,
  PortalMeeting,
  PortalReport,
  PortalRequest,
  PortalSettings,
  PortalSoftware,
  PortalTask,
  PortalThread,
  PortalThreadDetail,
} from "../types/client-portal.types";

const items = <T,>(path: string) => api<{ items: T[] }>(path).then((r) => r.items);

/** Same-origin download URLs (the auth cookie goes with them; the API checks the company). */
export const portalFileUrl = { document: (id: number) => `/api/app/documents/${id}/file`, report: (id: number) => `/api/app/reports/${id}/file` };

export const clientPortalService = {
  context: () => api<{ company: PortalCompany | null }>("/app/context").then((r) => r.company),
  dashboard: () => api<PortalDashboard>("/app/dashboard"),
  business: () => api<PortalBusiness>("/app/business"),
  team: () => items<{ full_name: string; email: string; team_role: string }>("/app/team"),
  software: () => items<PortalSoftware>("/app/software"),
  connectJournl: (body: { journl_email: string; journl_password: string; company_id?: string; authorize: true }) =>
    api<{ items: PortalSoftware[] }>("/app/software/journl", { method: "POST", body }).then((r) => r.items),
  disconnectJournl: () => api<{ items: PortalSoftware[] }>("/app/software/journl/disconnect", { method: "POST" }).then((r) => r.items),
  documents: () => items<PortalDocument>("/app/documents"),
  upload: (file: File, meta: { category: string; period?: string; request_id?: number }) => {
    const body = new FormData();
    body.append("file", file);
    body.append("category", meta.category);
    if (meta.period) body.append("period", meta.period);
    if (meta.request_id) body.append("request_id", String(meta.request_id));
    return api<{ id: number; fulfilled_request: number | null }>("/app/documents", { method: "POST", body });
  },
  requests: () => items<PortalRequest>("/app/requests"),
  tasks: (period?: string) => api<{ period: string; periods: string[]; tasks: PortalTask[] }>("/app/tasks", { query: { period } }),
  reports: () => items<PortalReport>("/app/reports"),
  approvals: () => items<PortalApproval>("/app/approvals"),
  decide: (id: number, decision: "approved" | "rejected", comment: string) =>
    api<void>(`/app/approvals/${id}/decision`, { method: "POST", body: { decision, comment: comment || null } }),
  threads: () => items<PortalThread>("/app/messages"),
  thread: (id: number) => api<PortalThreadDetail>(`/app/messages/${id}`),
  startThread: (subject: string, body: string) => api<PortalThreadDetail>("/app/messages", { method: "POST", body: { subject, body } }),
  reply: (id: number, body: string) => api<PortalThreadDetail>(`/app/messages/${id}`, { method: "POST", body: { body } }),
  meetings: () => items<PortalMeeting>("/app/meetings"),
  billing: () => api<PortalBilling>("/app/billing"),
  settings: () => api<PortalSettings>("/app/settings"),
  updateSettings: (body: { full_name?: string; phone?: string | null; notification_prefs?: NotificationPrefs }) =>
    api<PortalSettings>("/app/settings", { method: "PATCH", body }),
};
