import { api } from "@/lib/api-client";
import type { StaffPortal } from "@/types/auth";
import type { Checklist, ClientOverview, MyClient, WorkspaceDashboard } from "../types/workspace.types";

export const workspaceService = {
  dashboard: () => api<WorkspaceDashboard>("/team/workspace/dashboard"),
  clients: () => api<{ items: MyClient[] }>("/team/workspace/clients").then((r) => r.items),
  client: (id: number, portal: StaffPortal = "team") => api<ClientOverview>(`/${portal}/workspace/clients/${id}`),
  /** Clients the signed-in user may work on: every client for admins, today's assignments for accountants. */
  clientOptions: (portal: StaffPortal) =>
    api<{ items: { value: number; label: string }[] }>(`/${portal}/workspace/client-options`).then((r) => r.items.map((o) => ({ value: String(o.value), label: o.label }))),
  checklist: (period?: string) => api<Checklist>("/team/workspace/closing", { query: { period } }),
  setReadiness: (clientId: number, period: string, status: "open" | "ready", reason?: string) =>
    api<Checklist>(`/team/workspace/closing/${clientId}/${period}`, { method: "PUT", body: { status, reason } }),
};
