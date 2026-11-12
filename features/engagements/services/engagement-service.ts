import type { Client } from "@/features/clients/types/client.types";
import { api, type Paged } from "@/lib/api-client";
import type { EngagementFormOutput } from "../schemas/engagement.schema";
import type { Engagement, EngagementCounts, EngagementStatus, IssuedInvoice } from "../types/engagement.types";

export interface EngagementListParams {
  q?: string;
  status?: EngagementStatus;
  page?: number;
}

export const agreementUrl = (id: number) => `/api/admin/engagements/${id}/agreement`;

export const engagementService = {
  list: (params: EngagementListParams) => api<Paged<Engagement> & { counts: EngagementCounts }>("/admin/engagements", { query: { ...params } }),
  get: (id: number) => api<Engagement>(`/admin/engagements/${id}`),
  create: (values: EngagementFormOutput) => api<Engagement>("/admin/engagements", { method: "POST", body: values }),
  update: (id: number, values: Omit<EngagementFormOutput, "client_id">) => api<Engagement>(`/admin/engagements/${id}`, { method: "PATCH", body: values }),
  changeStatus: (id: number, to: EngagementStatus) =>
    api<{ engagement: Engagement; invoice: IssuedInvoice | null }>(`/admin/engagements/${id}/status`, { method: "POST", body: { to } }),
  uploadAgreement: (id: number, file: File) => {
    const body = new FormData();
    body.append("file", file);
    return api<Engagement>(`/admin/engagements/${id}/agreement`, { method: "POST", body });
  },
  /** Clients that can take an engagement, for the picker (the API caps a page at 100). */
  clientOptions: () => api<Paged<Client>>("/admin/clients", { query: { pageSize: 100 } }).then((r) => r.items.filter((c) => c.status !== "exited")),
};
